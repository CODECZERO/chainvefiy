#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Env, String, Symbol, Vec, vec, Address,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SupplierStatus { Active, Suspended }

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Supplier {
    pub name: String,
    pub category: u32,
    pub rank: Symbol,
    pub trust_score: u32,
    pub owner: Address,
    pub status: SupplierStatus,
    pub joined_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TrustChange {
    pub old_score: u32,
    pub new_score: u32,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Supplier(Address),
    AllSuppliers,
    CategoryMembers(u32),
    CategoryCapacity(u32),
    TrustHistory(Address),
    Admin,
    TotalSuppliers,
}

const MAX_CATEGORIES: u32 = 13;
const DEFAULT_CATEGORY_CAPACITY: u32 = 50;

#[contract]
pub struct SupplierRegistry;

#[allow(deprecated)]
#[contractimpl]
impl SupplierRegistry {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) { panic!("Already initialized"); }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::TotalSuppliers, &0u32);
    }

    pub fn register(env: Env, owner: Address, name: String, category: u32, rank: Symbol, trust_score: u32) {
        owner.require_auth();
        if category == 0 || category > MAX_CATEGORIES { panic!("Category must be 1-13"); }

        let capacity: u32 = env.storage().persistent().get(&DataKey::CategoryCapacity(category)).unwrap_or(DEFAULT_CATEGORY_CAPACITY);
        let members: Vec<Address> = env.storage().persistent().get(&DataKey::CategoryMembers(category)).unwrap_or(vec![&env]);
        if members.len() >= capacity { panic!("Category at capacity"); }
        if env.storage().persistent().has(&DataKey::Supplier(owner.clone())) { panic!("Already registered"); }

        let supplier = Supplier { name, category, rank, trust_score, owner: owner.clone(), status: SupplierStatus::Active, joined_at: env.ledger().timestamp() };
        env.storage().persistent().set(&DataKey::Supplier(owner.clone()), &supplier);

        let mut cat_members = members;
        cat_members.push_back(owner.clone());
        env.storage().persistent().set(&DataKey::CategoryMembers(category), &cat_members);

        let mut all: Vec<Address> = env.storage().persistent().get(&DataKey::AllSuppliers).unwrap_or(vec![&env]);
        all.push_back(owner.clone());
        env.storage().persistent().set(&DataKey::AllSuppliers, &all);

        let mut total: u32 = env.storage().persistent().get(&DataKey::TotalSuppliers).unwrap_or(0);
        total += 1;
        env.storage().persistent().set(&DataKey::TotalSuppliers, &total);

        let history = vec![&env, TrustChange { old_score: 0, new_score: trust_score, timestamp: env.ledger().timestamp() }];
        env.storage().persistent().set(&DataKey::TrustHistory(owner), &history);
        env.events().publish((symbol_short!("registry"), symbol_short!("new_sup")), supplier);
    }

    pub fn update_trust_score(env: Env, owner: Address, new_score: u32) {
        owner.require_auth();
        let mut supplier: Supplier = env.storage().persistent().get(&DataKey::Supplier(owner.clone())).expect("Not found");
        if supplier.status == SupplierStatus::Suspended { panic!("Suspended"); }
        let old_score = supplier.trust_score;
        supplier.trust_score = new_score;
        env.storage().persistent().set(&DataKey::Supplier(owner.clone()), &supplier);
        let mut history: Vec<TrustChange> = env.storage().persistent().get(&DataKey::TrustHistory(owner.clone())).unwrap_or(vec![&env]);
        history.push_back(TrustChange { old_score, new_score, timestamp: env.ledger().timestamp() });
        env.storage().persistent().set(&DataKey::TrustHistory(owner.clone()), &history);
    }

    pub fn promote(env: Env, admin: Address, owner: Address, new_rank: Symbol) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        let mut supplier: Supplier = env.storage().persistent().get(&DataKey::Supplier(owner.clone())).expect("Not found");
        supplier.rank = new_rank;
        env.storage().persistent().set(&DataKey::Supplier(owner), &supplier);
    }

    pub fn suspend(env: Env, admin: Address, owner: Address) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        let mut supplier: Supplier = env.storage().persistent().get(&DataKey::Supplier(owner.clone())).expect("Not found");
        supplier.status = SupplierStatus::Suspended;
        env.storage().persistent().set(&DataKey::Supplier(owner), &supplier);
    }

    pub fn reinstate(env: Env, admin: Address, owner: Address) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        let mut supplier: Supplier = env.storage().persistent().get(&DataKey::Supplier(owner.clone())).expect("Not found");
        supplier.status = SupplierStatus::Active;
        env.storage().persistent().set(&DataKey::Supplier(owner), &supplier);
    }

    pub fn set_category_capacity(env: Env, admin: Address, category: u32, capacity: u32) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        env.storage().persistent().set(&DataKey::CategoryCapacity(category), &capacity);
    }

    pub fn get_supplier(env: Env, owner: Address) -> Option<Supplier> {
        env.storage().persistent().get(&DataKey::Supplier(owner))
    }

    pub fn get_by_category(env: Env, category: u32) -> Vec<Supplier> {
        let members: Vec<Address> = env.storage().persistent().get(&DataKey::CategoryMembers(category)).unwrap_or(vec![&env]);
        let mut result = Vec::new(&env);
        for i in 0..members.len() {
            if let Some(r) = env.storage().persistent().get::<_, Supplier>(&DataKey::Supplier(members.get(i).unwrap())) { result.push_back(r); }
        }
        result
    }

    pub fn get_all(env: Env) -> Vec<Supplier> {
        let owners: Vec<Address> = env.storage().persistent().get(&DataKey::AllSuppliers).unwrap_or(vec![&env]);
        let mut result = Vec::new(&env);
        for i in 0..owners.len() {
            if let Some(r) = env.storage().persistent().get::<_, Supplier>(&DataKey::Supplier(owners.get(i).unwrap())) { result.push_back(r); }
        }
        result
    }

    pub fn get_trust_history(env: Env, owner: Address) -> Vec<TrustChange> {
        env.storage().persistent().get(&DataKey::TrustHistory(owner)).unwrap_or(vec![&env])
    }

    pub fn total_suppliers(env: Env) -> u32 {
        env.storage().persistent().get(&DataKey::TotalSuppliers).unwrap_or(0)
    }

    fn require_admin(env: &Env, caller: &Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Not initialized");
        if *caller != admin { panic!("Not admin"); }
    }
}

mod test;
