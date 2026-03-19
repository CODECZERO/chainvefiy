#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Env, Address, String, Vec,
};

// ═══════════════════════════════════════════════════════════════════
//  NOTIFICATIONS — On-chain notifications (send / get / list)
// ═══════════════════════════════════════════════════════════════════

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Notification {
    pub id: u64,
    pub sender: Address,
    pub recipient: Address,
    pub message: String,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    NextId,
    Notification(u64),
    RecipientIds(Address), // Vec<u64> of notification ids for this recipient
}

#[contract]
pub struct Notifications;

#[allow(deprecated)]
#[contractimpl]
impl Notifications {

    pub fn initialize(env: Env) {
        if env.storage().instance().has(&DataKey::NextId) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::NextId, &0u64);
    }

    /// Send a notification from sender to recipient. Returns notification id.
    pub fn send(env: Env, sender: Address, recipient: Address, message: String) -> u64 {
        sender.require_auth();
        let next_id: u64 = env.storage().instance().get(&DataKey::NextId).unwrap_or(0);
        let new_id = next_id + 1;
        env.storage().instance().set(&DataKey::NextId, &new_id);

        let created_at = env.ledger().timestamp();
        let notification = Notification {
            id: new_id,
            sender: sender.clone(),
            recipient: recipient.clone(),
            message: message.clone(),
            created_at,
        };
        env.storage().persistent().set(&DataKey::Notification(new_id), &notification);

        let mut ids: Vec<u64> = env.storage().persistent().get(&DataKey::RecipientIds(recipient.clone())).unwrap_or(Vec::new(&env));
        ids.push_back(new_id);
        env.storage().persistent().set(&DataKey::RecipientIds(recipient), &ids);

        new_id
    }

    /// Get a notification by id. Returns None if not found.
    pub fn get(env: Env, id: u64) -> Option<Notification> {
        env.storage().persistent().get(&DataKey::Notification(id))
    }

    /// List notifications for a recipient (newest first), up to limit.
    pub fn list_by_recipient(env: Env, recipient: Address, limit: u32) -> Vec<Notification> {
        let ids: Vec<u64> = env.storage().persistent().get(&DataKey::RecipientIds(recipient)).unwrap_or(Vec::new(&env));
        let mut out = Vec::new(&env);
        let len = ids.len();
        let n = len.min(limit);
        let start = len.saturating_sub(n);
        for i in (start..len).rev() {
            let id = ids.get(i).unwrap();
            if let Some(notif) = env.storage().persistent().get(&DataKey::Notification(id)) {
                out.push_back(notif);
            }
        }
        out
    }

    /// Return total count of notifications (for stats).
    pub fn count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::NextId).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
