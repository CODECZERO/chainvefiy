#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, Address, Vec, vec, String};

mod test;

// ═══════════════════════════════════════════════════════════════════
//  MARKETPLACE TREASURY v2 — MULTI-SIG, BUDGET, AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════════

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TxType { Deposit, Withdrawal, Allocation }

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TreasuryTx {
    pub tx_type: TxType,
    pub amount: i128,
    pub purpose: String,
    pub timestamp: u64,
    pub actor: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawalRequest {
    pub amount: i128,
    pub purpose: String,
    pub requester: Address,
    pub approvals: u32,
    pub executed: bool,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    Balance(Address),
    Budget(Address),
    TxHistory(Address),
    MultiSigThreshold,          // Amount above which multi-sig is needed
    RequiredApprovals,           // Number of approvals needed
    WithdrawalRequest(u32),     // Request ID -> WithdrawalRequest
    RequestApprovers(u32),      // Request ID -> Vec<Address>
    NextRequestId,
    Admin,
    Signers,                    // Vec<Address> authorized signers
}

#[contract]
pub struct MarketplaceTreasury;

#[allow(deprecated)]
#[contractimpl]
impl MarketplaceTreasury {
    pub fn initialize(env: Env, admin: Address, multi_sig_threshold: i128, required_approvals: u32) {
        if env.storage().instance().has(&DataKey::Admin) { panic!("Already initialized"); }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::MultiSigThreshold, &multi_sig_threshold);
        env.storage().persistent().set(&DataKey::RequiredApprovals, &required_approvals);
        env.storage().persistent().set(&DataKey::NextRequestId, &0u32);
        env.storage().persistent().set(&DataKey::Signers, &vec![&env, admin]);
    }

    pub fn add_signer(env: Env, admin: Address, signer: Address) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        let mut signers: Vec<Address> = env.storage().persistent().get(&DataKey::Signers).unwrap_or(vec![&env]);
        signers.push_back(signer);
        env.storage().persistent().set(&DataKey::Signers, &signers);
    }

    // ── DEPOSIT ──────────────────────────────────────────────────

    pub fn deposit(env: Env, account: Address, amount: i128, purpose: String) {
        account.require_auth();
        if amount <= 0 { panic!("Amount must be positive"); }

        let mut balance: i128 = env.storage().persistent().get(&DataKey::Balance(account.clone())).unwrap_or(0);
        balance = balance.checked_add(amount).expect("Overflow");
        env.storage().persistent().set(&DataKey::Balance(account.clone()), &balance);

        Self::log_tx(&env, &account, TxType::Deposit, amount, &purpose);
        env.events().publish((symbol_short!("treasury"), symbol_short!("deposit")), (account, amount));
    }

    // ── WITHDRAWAL (with multi-sig for large amounts) ────────────

    pub fn withdraw(env: Env, account: Address, amount: i128, purpose: String) {
        account.require_auth();
        if amount <= 0 { panic!("Amount must be positive"); }

        let threshold: i128 = env.storage().persistent().get(&DataKey::MultiSigThreshold).unwrap_or(0);

        if amount > threshold {
            // Create multi-sig request
            let mut req_id: u32 = env.storage().persistent().get(&DataKey::NextRequestId).unwrap_or(0);
            let request = WithdrawalRequest {
                amount, purpose, requester: account.clone(),
                approvals: 0, executed: false, created_at: env.ledger().timestamp(),
            };
            env.storage().persistent().set(&DataKey::WithdrawalRequest(req_id), &request);
            env.storage().persistent().set(&DataKey::RequestApprovers(req_id), &Vec::<Address>::new(&env));
            req_id += 1;
            env.storage().persistent().set(&DataKey::NextRequestId, &req_id);
            env.events().publish((symbol_short!("treasury"), symbol_short!("req")), (account, amount));
        } else {
            // Direct withdrawal
            let mut balance: i128 = env.storage().persistent().get(&DataKey::Balance(account.clone())).unwrap_or(0);
            if balance < amount { panic!("Insufficient balance"); }
            balance -= amount;
            env.storage().persistent().set(&DataKey::Balance(account.clone()), &balance);
            Self::log_tx(&env, &account, TxType::Withdrawal, amount, &String::from_str(&env, "direct"));
            env.events().publish((symbol_short!("treasury"), symbol_short!("withdraw")), (account, amount));
        }
    }

    pub fn approve_withdrawal(env: Env, signer: Address, request_id: u32) {
        signer.require_auth();
        Self::require_signer(&env, &signer);

        let mut request: WithdrawalRequest = env.storage().persistent()
            .get(&DataKey::WithdrawalRequest(request_id)).expect("Request not found");
        if request.executed { panic!("Already executed"); }

        let mut approvers: Vec<Address> = env.storage().persistent()
            .get(&DataKey::RequestApprovers(request_id)).unwrap_or(vec![&env]);
        for i in 0..approvers.len() {
            if approvers.get(i).unwrap() == signer { panic!("Already approved"); }
        }
        approvers.push_back(signer);
        env.storage().persistent().set(&DataKey::RequestApprovers(request_id), &approvers);

        request.approvals += 1;
        let required: u32 = env.storage().persistent().get(&DataKey::RequiredApprovals).unwrap_or(2);

        if request.approvals >= required {
            // Execute withdrawal
            let mut balance: i128 = env.storage().persistent()
                .get(&DataKey::Balance(request.requester.clone())).unwrap_or(0);
            if balance < request.amount { panic!("Insufficient balance"); }
            balance -= request.amount;
            env.storage().persistent().set(&DataKey::Balance(request.requester.clone()), &balance);
            request.executed = true;
            Self::log_tx(&env, &request.requester, TxType::Withdrawal, request.amount, &request.purpose);
        }

        env.storage().persistent().set(&DataKey::WithdrawalRequest(request_id), &request);
    }

    // ── BUDGET ───────────────────────────────────────────────────

    pub fn set_budget(env: Env, admin: Address, account: Address, max_amount: i128) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        env.storage().persistent().set(&DataKey::Budget(account), &max_amount);
    }

    pub fn get_budget(env: Env, account: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Budget(account)).unwrap_or(0)
    }

    // ── QUERIES ──────────────────────────────────────────────────

    pub fn get_balance(env: Env, account: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(account)).unwrap_or(0)
    }

    pub fn get_history(env: Env, account: Address) -> Vec<TreasuryTx> {
        env.storage().persistent().get(&DataKey::TxHistory(account)).unwrap_or(vec![&env])
    }

    pub fn get_request(env: Env, request_id: u32) -> Option<WithdrawalRequest> {
        env.storage().persistent().get(&DataKey::WithdrawalRequest(request_id))
    }

    // ── INTERNALS ────────────────────────────────────────────────

    fn log_tx(env: &Env, account: &Address, tx_type: TxType, amount: i128, purpose: &String) {
        let mut history: Vec<TreasuryTx> = env.storage().persistent()
            .get(&DataKey::TxHistory(account.clone())).unwrap_or(vec![env]);
        history.push_back(TreasuryTx {
            tx_type, amount, purpose: purpose.clone(),
            timestamp: env.ledger().timestamp(), actor: account.clone(),
        });
        env.storage().persistent().set(&DataKey::TxHistory(account.clone()), &history);
    }

    fn require_admin(env: &Env, caller: &Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Not initialized");
        if *caller != admin { panic!("Not admin"); }
    }

    fn require_signer(env: &Env, caller: &Address) {
        let signers: Vec<Address> = env.storage().persistent().get(&DataKey::Signers).unwrap_or(vec![env]);
        let mut found = false;
        for i in 0..signers.len() {
            if signers.get(i).unwrap() == *caller { found = true; break; }
        }
        if !found { panic!("Not an authorized signer"); }
    }
}
