#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracterror, contracttype,
    Env, Address, String, symbol_short // 👈 Option removed from this list
};

// ============================================================================
// ERROR HANDLING (Fixed)
// ============================================================================

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord, Default)] // 👈 Added Default
#[repr(u32)]
pub enum Error {
    #[default]
    ContractError = 0,
    InvalidInput = 1,
    Unauthorized = 2,
    NotFound = 3,
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// Individual usage record
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UsageRecord {
    pub used_amount: i128,
    pub cid: String,
    pub prev_txn: String,
    pub timestamp: u64,
    pub metadata: Option<String>, // Option is now implicitly available
}

// ... (Rest of DataKey and Contract struct remains the same) ...

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    LatestRecord(Address),
}

#[contract]
pub struct SimpleDataStore;

#[contractimpl]
impl SimpleDataStore {
    
    pub fn store_data(
        env: Env,
        user: Address,
        used_amount: i128,
        cid: String,
        prev_txn: String,
        metadata: Option<String>,
    ) -> Result<(), Error> {
        // ... (implementation is unchanged)
        user.require_auth(); 
        
        if cid.is_empty() || prev_txn.is_empty() || used_amount <= 0 {
            return Err(Error::InvalidInput);
        }
        
        let new_record = UsageRecord {
            used_amount,
            cid: cid.clone(),
            prev_txn: prev_txn.clone(),
            timestamp: env.ledger().timestamp(),
            metadata,
        };
        
        let storage_key = DataKey::LatestRecord(user.clone());
        env.storage().instance().set(&storage_key, &new_record);
        
        env.events().publish(
            (symbol_short!("stored"), user),
            (cid, used_amount),
        );
        
        Ok(())
    }
    
    pub fn get_latest(env: Env, user: Address) -> Result<UsageRecord, Error> {
        let storage_key = DataKey::LatestRecord(user);
        
        env.storage().instance().get(&storage_key)
            .ok_or(Error::NotFound)
    }
}
