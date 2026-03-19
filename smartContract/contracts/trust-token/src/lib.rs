#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Env, Address,
};

// ═══════════════════════════════════════════════════════════════════
//  TRUST TOKEN v2 — BURN, ALLOWANCE, VESTING, STAKING REWARDS
// ═══════════════════════════════════════════════════════════════════

#[contracttype]
pub enum DataKey {
    Balance(Address),
    Admin,
    Minter(Address),
    Stake(Address),
    StakeTimestamp(Address),     // When staking started (for yield calc)
    TotalSupply,
    Allowance(Address, Address), // (owner, spender) -> amount
    VestingLock(Address),        // Locked amount
    VestingUnlockAt(Address),    // Unlock timestamp
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenInfo {
    pub total_supply: i128,
    pub holders: u32,
    pub total_staked: i128,
}

#[contract]
pub struct TrustToken;

#[allow(deprecated)]
#[contractimpl]
impl TrustToken {

    // ── INITIALIZATION ───────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::TotalSupply, &0i128);
    }

    // ── ADMIN ────────────────────────────────────────────────────

    pub fn add_minter(env: Env, admin: Address, minter: Address) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        env.storage().instance().set(&DataKey::Minter(minter), &true);
    }

    pub fn remove_minter(env: Env, admin: Address, minter: Address) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        env.storage().instance().remove(&DataKey::Minter(minter));
    }

    // ── MINT & BURN ──────────────────────────────────────────────

    pub fn mint(env: Env, minter: Address, to: Address, amount: i128) {
        minter.require_auth();
        if amount <= 0 { panic!("Amount must be positive"); }

        let is_admin = Self::check_admin(&env, &minter);
        let is_minter = env.storage().instance().has(&DataKey::Minter(minter.clone()));
        if !is_admin && !is_minter { panic!("Not authorized to mint"); }

        let mut balance = Self::raw_balance(&env, &to);
        balance = balance.checked_add(amount).expect("Overflow");
        env.storage().persistent().set(&DataKey::Balance(to.clone()), &balance);

        let mut supply = Self::raw_supply(&env);
        supply = supply.checked_add(amount).expect("Supply overflow");
        env.storage().persistent().set(&DataKey::TotalSupply, &supply);

        env.events().publish((symbol_short!("mint"), to), amount);
    }

    pub fn burn(env: Env, owner: Address, amount: i128) {
        owner.require_auth();
        if amount <= 0 { panic!("Amount must be positive"); }

        let mut balance = Self::raw_balance(&env, &owner);
        let locked = Self::raw_locked(&env, &owner);
        let available = balance - locked;

        if available < amount { panic!("Insufficient unlocked balance"); }

        balance -= amount;
        env.storage().persistent().set(&DataKey::Balance(owner.clone()), &balance);

        let mut supply = Self::raw_supply(&env);
        supply = supply.checked_sub(amount).expect("Supply underflow");
        env.storage().persistent().set(&DataKey::TotalSupply, &supply);

        env.events().publish((symbol_short!("burn"), owner), amount);
    }

    // ── TRANSFER ─────────────────────────────────────────────────

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if from == to { return; }
        if amount <= 0 { panic!("Amount must be positive"); }

        let locked = Self::raw_locked(&env, &from);
        let mut from_bal = Self::raw_balance(&env, &from);
        if from_bal - locked < amount { panic!("Insufficient unlocked balance"); }

        let mut to_bal = Self::raw_balance(&env, &to);

        from_bal = from_bal.checked_sub(amount).expect("Underflow");
        to_bal = to_bal.checked_add(amount).expect("Overflow");

        env.storage().persistent().set(&DataKey::Balance(from.clone()), &from_bal);
        env.storage().persistent().set(&DataKey::Balance(to.clone()), &to_bal);

        env.events().publish((symbol_short!("xfer"), from), (to, amount));
    }

    // ── APPROVAL / ALLOWANCE ─────────────────────────────────────

    pub fn approve(env: Env, owner: Address, spender: Address, amount: i128) {
        owner.require_auth();
        if amount < 0 { panic!("Negative allowance"); }
        env.storage().persistent().set(
            &DataKey::Allowance(owner.clone(), spender.clone()), &amount
        );
        env.events().publish((symbol_short!("approve"), owner), (spender, amount));
    }

    pub fn allowance(env: Env, owner: Address, spender: Address) -> i128 {
        env.storage().persistent()
            .get(&DataKey::Allowance(owner, spender))
            .unwrap_or(0)
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        if amount <= 0 { panic!("Amount must be positive"); }

        let mut allowed: i128 = env.storage().persistent()
            .get(&DataKey::Allowance(from.clone(), spender.clone()))
            .unwrap_or(0);
        if allowed < amount { panic!("Insufficient allowance"); }

        // Deduct allowance
        allowed -= amount;
        env.storage().persistent().set(
            &DataKey::Allowance(from.clone(), spender), &allowed
        );

        // Execute transfer
        let locked = Self::raw_locked(&env, &from);
        let mut from_bal = Self::raw_balance(&env, &from);
        if from_bal - locked < amount { panic!("Insufficient unlocked balance"); }
        let mut to_bal = Self::raw_balance(&env, &to);

        from_bal -= amount;
        to_bal += amount;

        env.storage().persistent().set(&DataKey::Balance(from), &from_bal);
        env.storage().persistent().set(&DataKey::Balance(to), &to_bal);
    }

    // ── STAKING ─────────────────────────────────────────────────

    pub fn stake(env: Env, user: Address, amount: i128) {
        user.require_auth();
        if amount <= 0 { panic!("Invalid amount"); }

        let mut balance = Self::raw_balance(&env, &user);
        let locked = Self::raw_locked(&env, &user);
        if balance - locked < amount { panic!("Insufficient unlocked balance"); }

        balance -= amount;
        env.storage().persistent().set(&DataKey::Balance(user.clone()), &balance);

        let mut staked: i128 = env.storage().persistent()
            .get(&DataKey::Stake(user.clone())).unwrap_or(0);

        // Claim pending rewards before changing stake
        if staked > 0 {
            let rewards = Self::calc_pending_rewards(&env, &user, staked);
            if rewards > 0 {
                balance += rewards;
                env.storage().persistent().set(&DataKey::Balance(user.clone()), &balance);
                let mut supply = Self::raw_supply(&env);
                supply += rewards;
                env.storage().persistent().set(&DataKey::TotalSupply, &supply);
            }
        }

        staked += amount;
        env.storage().persistent().set(&DataKey::Stake(user.clone()), &staked);
        env.storage().persistent().set(
            &DataKey::StakeTimestamp(user.clone()), &env.ledger().timestamp()
        );

        env.events().publish((symbol_short!("stake"), user), amount);
    }

    pub fn unstake(env: Env, user: Address, amount: i128) {
        user.require_auth();
        if amount <= 0 { panic!("Invalid amount"); }

        let mut staked: i128 = env.storage().persistent()
            .get(&DataKey::Stake(user.clone())).unwrap_or(0);
        if staked < amount { panic!("Insufficient stake"); }

        // Claim rewards
        let rewards = Self::calc_pending_rewards(&env, &user, staked);

        staked -= amount;
        env.storage().persistent().set(&DataKey::Stake(user.clone()), &staked);

        let mut balance = Self::raw_balance(&env, &user);
        balance += amount + rewards;
        env.storage().persistent().set(&DataKey::Balance(user.clone()), &balance);

        if rewards > 0 {
            let mut supply = Self::raw_supply(&env);
            supply += rewards;
            env.storage().persistent().set(&DataKey::TotalSupply, &supply);
        }

        env.storage().persistent().set(
            &DataKey::StakeTimestamp(user.clone()), &env.ledger().timestamp()
        );

        env.events().publish((symbol_short!("unstake"), user), amount);
    }

    /// Claim staking rewards without unstaking.
    pub fn claim_rewards(env: Env, user: Address) -> i128 {
        user.require_auth();

        let staked: i128 = env.storage().persistent()
            .get(&DataKey::Stake(user.clone())).unwrap_or(0);
        if staked == 0 { return 0; }

        let rewards = Self::calc_pending_rewards(&env, &user, staked);
        if rewards > 0 {
            let mut balance = Self::raw_balance(&env, &user);
            balance += rewards;
            env.storage().persistent().set(&DataKey::Balance(user.clone()), &balance);

            let mut supply = Self::raw_supply(&env);
            supply += rewards;
            env.storage().persistent().set(&DataKey::TotalSupply, &supply);

            env.storage().persistent().set(
                &DataKey::StakeTimestamp(user.clone()), &env.ledger().timestamp()
            );
        }

        rewards
    }

    // ── VESTING / LOCK ───────────────────────────────────────────

    /// Lock tokens until a specific timestamp (vesting).
    pub fn lock(env: Env, admin: Address, target: Address, amount: i128, unlock_at: u64) {
        admin.require_auth();
        Self::require_admin(&env, &admin);

        let balance = Self::raw_balance(&env, &target);
        if balance < amount { panic!("Insufficient balance to lock"); }

        let current_locked = Self::raw_locked(&env, &target);
        env.storage().persistent().set(
            &DataKey::VestingLock(target.clone()), &(current_locked + amount)
        );
        env.storage().persistent().set(
            &DataKey::VestingUnlockAt(target.clone()), &unlock_at
        );

        env.events().publish((symbol_short!("lock"), target), (amount, unlock_at));
    }

    /// Unlock vested tokens (callable after unlock_at).
    pub fn unlock(env: Env, user: Address) -> i128 {
        let unlock_at: u64 = env.storage().persistent()
            .get(&DataKey::VestingUnlockAt(user.clone()))
            .unwrap_or(0);

        if unlock_at == 0 || env.ledger().timestamp() < unlock_at {
            return 0; // Not yet unlockable
        }

        let locked = Self::raw_locked(&env, &user);
        env.storage().persistent().set(&DataKey::VestingLock(user.clone()), &0i128);
        env.storage().persistent().set(&DataKey::VestingUnlockAt(user.clone()), &0u64);

        env.events().publish((symbol_short!("unlock"), user), locked);
        locked
    }

    // ── QUERIES ──────────────────────────────────────────────────

    pub fn balance(env: Env, user: Address) -> i128 {
        Self::raw_balance(&env, &user)
    }

    pub fn staked(env: Env, user: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Stake(user)).unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        Self::raw_supply(&env)
    }

    pub fn locked(env: Env, user: Address) -> i128 {
        Self::raw_locked(&env, &user)
    }

    pub fn pending_rewards(env: Env, user: Address) -> i128 {
        let staked: i128 = env.storage().persistent()
            .get(&DataKey::Stake(user.clone())).unwrap_or(0);
        Self::calc_pending_rewards(&env, &user, staked)
    }

    // ── INTERNALS ────────────────────────────────────────────────

    fn raw_balance(env: &Env, addr: &Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(addr.clone())).unwrap_or(0)
    }

    fn raw_supply(env: &Env) -> i128 {
        env.storage().persistent().get(&DataKey::TotalSupply).unwrap_or(0)
    }

    fn raw_locked(env: &Env, addr: &Address) -> i128 {
        let unlock_at: u64 = env.storage().persistent()
            .get(&DataKey::VestingUnlockAt(addr.clone())).unwrap_or(0);
        if unlock_at > 0 && env.ledger().timestamp() < unlock_at {
            env.storage().persistent().get(&DataKey::VestingLock(addr.clone())).unwrap_or(0)
        } else {
            0
        }
    }

    /// Calculate pending staking rewards.
    /// Formula: staked_amount * (seconds_elapsed / 86400) * 0.01  (1% daily)
    fn calc_pending_rewards(env: &Env, user: &Address, staked: i128) -> i128 {
        if staked == 0 { return 0; }
        let start: u64 = env.storage().persistent()
            .get(&DataKey::StakeTimestamp(user.clone())).unwrap_or(0);
        let now = env.ledger().timestamp();
        if now <= start { return 0; }

        let elapsed = (now - start) as i128;
        // 1% daily yield: staked * elapsed / 86400 / 100
        staked * elapsed / 8_640_000
    }

    fn require_admin(env: &Env, caller: &Address) {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin).expect("Not initialized");
        if *caller != admin { panic!("Not admin"); }
    }

    fn check_admin(env: &Env, caller: &Address) -> bool {
        if let Some(admin) = env.storage().instance().get::<_, Address>(&DataKey::Admin) {
            *caller == admin
        } else { false }
    }
}

mod test;
