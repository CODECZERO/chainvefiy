#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, Symbol, String as SorobanString};

fn setup() -> (Env, SupplierRegistryClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(SupplierRegistry, ());
    let client = SupplierRegistryClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

#[test]
fn test_register_supplier() {
    let (env, client, _admin) = setup();
    let owner = Address::generate(&env);
    client.register(&owner, &SorobanString::from_str(&env, "Ravi Farms"), &5, &Symbol::new(&env, "Gold"), &9000);
    
    let supplier = client.get_supplier(&owner).unwrap();
    assert_eq!(supplier.category, 5);
    assert_eq!(supplier.trust_score, 9000);
    assert_eq!(supplier.status, SupplierStatus::Active);
    assert_eq!(client.total_suppliers(), 1);
}

#[test]
fn test_category_filtering() {
    let (env, client, _admin) = setup();
    let o1 = Address::generate(&env);
    let o2 = Address::generate(&env);
    let o3 = Address::generate(&env);
    
    client.register(&o1, &SorobanString::from_str(&env, "A"), &3, &Symbol::new(&env, "Silver"), &100);
    client.register(&o2, &SorobanString::from_str(&env, "B"), &3, &Symbol::new(&env, "Silver"), &200);
    client.register(&o3, &SorobanString::from_str(&env, "C"), &7, &Symbol::new(&env, "Silver"), &300);
    
    let cat3 = client.get_by_category(&3);
    assert_eq!(cat3.len(), 2);
    let cat7 = client.get_by_category(&7);
    assert_eq!(cat7.len(), 1);
}

#[test]
fn test_update_trust_score_with_history() {
    let (env, client, _admin) = setup();
    let owner = Address::generate(&env);
    client.register(&owner, &SorobanString::from_str(&env, "Kavitha Textiles"), &11, &Symbol::new(&env, "Gold"), &5000);
    client.update_trust_score(&owner, &9000);
    
    let supplier = client.get_supplier(&owner).unwrap();
    assert_eq!(supplier.trust_score, 9000);
    
    let history = client.get_trust_history(&owner);
    assert_eq!(history.len(), 2);
    assert_eq!(history.get(1).unwrap().old_score, 5000);
    assert_eq!(history.get(1).unwrap().new_score, 9000);
}

#[test]
fn test_promote() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    client.register(&owner, &SorobanString::from_str(&env, "Nair Organics"), &6, &Symbol::new(&env, "Silver"), &3000);
    client.promote(&admin, &owner, &Symbol::new(&env, "Gold"));
    let supplier = client.get_supplier(&owner).unwrap();
    assert_eq!(supplier.rank, Symbol::new(&env, "Gold"));
}

#[test]
fn test_suspend_and_reinstate() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    client.register(&owner, &SorobanString::from_str(&env, "Test Supplier"), &3, &Symbol::new(&env, "Silver"), &7000);
    
    client.suspend(&admin, &owner);
    assert_eq!(client.get_supplier(&owner).unwrap().status, SupplierStatus::Suspended);
    
    client.reinstate(&admin, &owner);
    assert_eq!(client.get_supplier(&owner).unwrap().status, SupplierStatus::Active);
}

#[test]
#[should_panic(expected = "Category must be 1-13")]
fn test_invalid_category() {
    let (env, client, _admin) = setup();
    let owner = Address::generate(&env);
    client.register(&owner, &SorobanString::from_str(&env, "X"), &14, &Symbol::new(&env, "Silver"), &100);
}

#[test]
#[should_panic(expected = "Suspended")]
fn test_suspended_cannot_update_trust_score() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    client.register(&owner, &SorobanString::from_str(&env, "S"), &1, &Symbol::new(&env, "Silver"), &100);
    client.suspend(&admin, &owner);
    client.update_trust_score(&owner, &200);
}
