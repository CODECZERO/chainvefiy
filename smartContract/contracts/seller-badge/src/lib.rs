#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Env, Address, String, Vec, vec,
};

mod test;

// ═══════════════════════════════════════════════════════════════════
//  SELLER BADGE v2 — TIERS, VERIFICATION, REVOCATION, LEADERBOARD
// ═══════════════════════════════════════════════════════════════════

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BadgeTier {
    Bronze,
    Silver,
    Gold,
    Platinum,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Badge {
    pub product_id: String,
    pub rank: String,
    pub tier: BadgeTier,
    pub timestamp: u64,
    pub revoked: bool,
}

#[contracttype]
pub enum DataKey {
    Badges(Address),          // Vec<Badge> per seller
    BadgeCount(Address),      // Total (non-revoked) badge count
    TotalBadges,              // Global badge count
    Admin,
    AllSellers,               // Vec<Address> for leaderboard
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LeaderboardEntry {
    pub seller: Address,
    pub badge_count: u32,
}

#[contract]
pub struct SellerBadge;

#[allow(deprecated)]
#[contractimpl]
impl SellerBadge {

    // ── INITIALIZATION ───────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::TotalBadges, &0u32);
    }

    // ── MINTING ──────────────────────────────────────────────────

    /// Mint a badge. Tier is auto-calculated based on cumulative count.
    pub fn mint(env: Env, seller: Address, product_id: String, rank: String) {
        let mut badges: Vec<Badge> = env.storage().persistent()
            .get(&DataKey::Badges(seller.clone()))
            .unwrap_or(vec![&env]);

        // Count non-revoked badges for tier calculation
        let mut active_count: u32 = 0;
        for i in 0..badges.len() {
            if let Some(b) = badges.get(i) {
                if !b.revoked { active_count += 1; }
            }
        }

        // Tier based on cumulative badges
        let tier = match active_count {
            0..=4 => BadgeTier::Bronze,
            5..=14 => BadgeTier::Silver,
            15..=29 => BadgeTier::Gold,
            _ => BadgeTier::Platinum,
        };

        let badge = Badge {
            product_id,
            rank,
            tier,
            timestamp: env.ledger().timestamp(),
            revoked: false,
        };

        badges.push_back(badge);
        env.storage().persistent().set(&DataKey::Badges(seller.clone()), &badges);

        // Update counts
        let new_count = active_count + 1;
        env.storage().persistent().set(&DataKey::BadgeCount(seller.clone()), &new_count);

        let mut total: u32 = env.storage().persistent()
            .get(&DataKey::TotalBadges).unwrap_or(0);
        total += 1;
        env.storage().persistent().set(&DataKey::TotalBadges, &total);

        // Track for leaderboard
        let mut all: Vec<Address> = env.storage().persistent()
            .get(&DataKey::AllSellers).unwrap_or(vec![&env]);
        let mut found = false;
        for i in 0..all.len() {
            if all.get(i).unwrap() == seller {
                found = true;
                break;
            }
        }
        if !found {
            all.push_back(seller.clone());
            env.storage().persistent().set(&DataKey::AllSellers, &all);
        }

        env.events().publish(
            (symbol_short!("badge"), symbol_short!("minted")),
            (seller, env.ledger().timestamp()),
        );
    }

    // ── REVOCATION ───────────────────────────────────────────────

    /// Admin-only: Revoke a badge by product_id.
    pub fn revoke(env: Env, admin: Address, seller: Address, product_id: String) {
        admin.require_auth();
        Self::require_admin(&env, &admin);

        let mut badges: Vec<Badge> = env.storage().persistent()
            .get(&DataKey::Badges(seller.clone()))
            .unwrap_or(vec![&env]);

        let mut revoked_any = false;
        for i in 0..badges.len() {
            if let Some(mut b) = badges.get(i) {
                if b.product_id == product_id && !b.revoked {
                    b.revoked = true;
                    badges.set(i, b);
                    revoked_any = true;
                    break;
                }
            }
        }

        if !revoked_any { panic!("Badge not found or already revoked"); }

        env.storage().persistent().set(&DataKey::Badges(seller.clone()), &badges);

        // Decrement count
        let mut count: u32 = env.storage().persistent()
            .get(&DataKey::BadgeCount(seller.clone())).unwrap_or(0);
        if count > 0 { count -= 1; }
        env.storage().persistent().set(&DataKey::BadgeCount(seller.clone()), &count);

        env.events().publish(
            (symbol_short!("badge"), symbol_short!("revoked")),
            (seller, product_id),
        );
    }

    // ── QUERIES ──────────────────────────────────────────────────

    pub fn get_badges(env: Env, seller: Address) -> Vec<Badge> {
        env.storage().persistent()
            .get(&DataKey::Badges(seller))
            .unwrap_or(vec![&env])
    }

    /// Verify that a specific badge exists (non-revoked) for a seller.
    pub fn verify_badge(env: Env, seller: Address, product_id: String) -> bool {
        let badges: Vec<Badge> = env.storage().persistent()
            .get(&DataKey::Badges(seller))
            .unwrap_or(vec![&env]);

        for i in 0..badges.len() {
            if let Some(b) = badges.get(i) {
                if b.product_id == product_id && !b.revoked {
                    return true;
                }
            }
        }
        false
    }

    pub fn badge_count(env: Env, seller: Address) -> u32 {
        env.storage().persistent()
            .get(&DataKey::BadgeCount(seller))
            .unwrap_or(0)
    }

    pub fn total_badges(env: Env) -> u32 {
        env.storage().persistent()
            .get(&DataKey::TotalBadges)
            .unwrap_or(0)
    }

    /// Get top sellers sorted by badge count (capped at limit).
    pub fn get_top_sellers(env: Env, limit: u32) -> Vec<LeaderboardEntry> {
        let all: Vec<Address> = env.storage().persistent()
            .get(&DataKey::AllSellers).unwrap_or(vec![&env]);

        let mut entries: Vec<LeaderboardEntry> = vec![&env];
        for i in 0..all.len() {
            let seller = all.get(i).unwrap();
            let count: u32 = env.storage().persistent()
                .get(&DataKey::BadgeCount(seller.clone())).unwrap_or(0);
            entries.push_back(LeaderboardEntry { seller, badge_count: count });
        }

        // Simple insertion sort by badge_count descending (limited data)
        let len = entries.len();
        for i in 1..len {
            let current = entries.get(i).unwrap();
            let mut j = i;
            while j > 0 {
                let prev = entries.get(j - 1).unwrap();
                if prev.badge_count < current.badge_count {
                    entries.set(j, prev);
                    j -= 1;
                } else {
                    break;
                }
            }
            entries.set(j, current);
        }

        // Trim to limit
        let mut result: Vec<LeaderboardEntry> = vec![&env];
        let cap = if limit < len as u32 { limit } else { len as u32 };
        for i in 0..cap {
            result.push_back(entries.get(i).unwrap());
        }

        result
    }

    // ── INTERNALS ────────────────────────────────────────────────

    fn require_admin(env: &Env, caller: &Address) {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin).expect("Not initialized");
        if *caller != admin { panic!("Not admin"); }
    }
}
