#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String as SorobanString};

fn setup() -> (Env, ProductRegistryClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(ProductRegistry, ());
    let client = ProductRegistryClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

#[test]
fn test_register_product() {
    let (env, client, _admin) = setup();
    let supplier = Address::generate(&env);
    client.register_product(
        &supplier,
        &SorobanString::from_str(&env, "P001"),
        &SorobanString::from_str(&env, "Organic Turmeric"),
        &30, &0,
    );
    let product = client.get_product(&SorobanString::from_str(&env, "P001"));
    assert!(product.is_some());
    let p = product.unwrap();
    assert_eq!(p.status, ProductStatus::Active);
    assert_eq!(p.required_verifications, 1);
    
    let counter = client.get_counter();
    assert_eq!(counter.total, 1);
    assert_eq!(counter.active, 1);
}

#[test]
fn test_high_risk_requires_two_verifications() {
    let (env, client, _admin) = setup();
    let supplier = Address::generate(&env);
    client.register_product(
        &supplier,
        &SorobanString::from_str(&env, "HIGH01"),
        &SorobanString::from_str(&env, "High Risk Product"),
        &90, &0,
    );
    let p = client.get_product(&SorobanString::from_str(&env, "HIGH01")).unwrap();
    assert_eq!(p.required_verifications, 2);
}

#[test]
fn test_advance_status() {
    let (env, client, _admin) = setup();
    let supplier = Address::generate(&env);
    client.register_product(
        &supplier,
        &SorobanString::from_str(&env, "ADV01"),
        &SorobanString::from_str(&env, "Advance Test"),
        &20, &0,
    );
    client.advance_status(&supplier, &SorobanString::from_str(&env, "ADV01"));
    let p = client.get_product(&SorobanString::from_str(&env, "ADV01")).unwrap();
    assert_eq!(p.status, ProductStatus::InProgress);

    client.advance_status(&supplier, &SorobanString::from_str(&env, "ADV01"));
    let p2 = client.get_product(&SorobanString::from_str(&env, "ADV01")).unwrap();
    assert_eq!(p2.status, ProductStatus::Review);
}

#[test]
fn test_verify_proof_low_risk() {
    let (env, client, _admin) = setup();
    let supplier = Address::generate(&env);
    let validator = Address::generate(&env);
    let seller = Address::generate(&env);

    client.register_product(
        &supplier,
        &SorobanString::from_str(&env, "VER01"),
        &SorobanString::from_str(&env, "Verify Test"),
        &20, &0,
    );

    client.verify_proof(
        &validator, &seller,
        &SorobanString::from_str(&env, "VER01"),
        &SorobanString::from_str(&env, "QmProofCID"),
    );

    let p = client.get_product(&SorobanString::from_str(&env, "VER01")).unwrap();
    assert_eq!(p.status, ProductStatus::Verified);
    
    let counter = client.get_counter();
    assert_eq!(counter.verified, 1);
    assert_eq!(counter.active, 0);
}

#[test]
fn test_fail_product() {
    let (env, client, admin) = setup();
    let supplier = Address::generate(&env);
    client.register_product(
        &supplier,
        &SorobanString::from_str(&env, "FAIL01"),
        &SorobanString::from_str(&env, "Fail Test"),
        &30, &0,
    );

    client.fail_product(&admin, &SorobanString::from_str(&env, "FAIL01"));
    let p = client.get_product(&SorobanString::from_str(&env, "FAIL01")).unwrap();
    assert_eq!(p.status, ProductStatus::Failed);

    let counter = client.get_counter();
    assert_eq!(counter.failed, 1);
}

#[test]
fn test_supplier_products_tracking() {
    let (env, client, _admin) = setup();
    let supplier = Address::generate(&env);

    client.register_product(&supplier, &SorobanString::from_str(&env, "SP1"), &SorobanString::from_str(&env, "A"), &10, &0);
    client.register_product(&supplier, &SorobanString::from_str(&env, "SP2"), &SorobanString::from_str(&env, "B"), &20, &0);

    let products = client.get_products_by_supplier(&supplier);
    assert_eq!(products.len(), 2);
}
