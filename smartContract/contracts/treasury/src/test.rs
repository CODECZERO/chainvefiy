#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String as SorobanString};

fn setup() -> (Env, MarketplaceTreasuryClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(MarketplaceTreasury, ());
    let client = MarketplaceTreasuryClient::new(&env, &id);
    let admin = Address::generate(&env);
    // threshold = 1000, required_approvals = 2
    client.initialize(&admin, &1000, &2);
    (env, client, admin)
}

#[test]
fn test_deposit() {
    let (env, client, _admin) = setup();
    let account = Address::generate(&env);
    client.deposit(&account, &500, &SorobanString::from_str(&env, "Funding"));
    assert_eq!(client.get_balance(&account), 500);

    let history = client.get_history(&account);
    assert_eq!(history.len(), 1);
    assert_eq!(history.get(0).unwrap().tx_type, TxType::Deposit);
}

#[test]
fn test_direct_withdrawal_under_threshold() {
    let (env, client, _admin) = setup();
    let account = Address::generate(&env);
    client.deposit(&account, &2000, &SorobanString::from_str(&env, "Seed"));
    client.withdraw(&account, &500, &SorobanString::from_str(&env, "Supplies"));
    assert_eq!(client.get_balance(&account), 1500);
}

#[test]
fn test_multisig_withdrawal() {
    let (env, client, admin) = setup();
    let account = Address::generate(&env);
    let signer2 = Address::generate(&env);
    
    client.add_signer(&admin, &signer2);
    client.deposit(&account, &5000, &SorobanString::from_str(&env, "Fund"));
    
    // Request > threshold → creates multi-sig request
    client.withdraw(&account, &2000, &SorobanString::from_str(&env, "Big purchase"));
    assert_eq!(client.get_balance(&account), 5000); // Not yet deducted

    let req = client.get_request(&0).unwrap();
    assert!(!req.executed);
    assert_eq!(req.approvals, 0);
    
    // First approval
    client.approve_withdrawal(&admin, &0);
    let req1 = client.get_request(&0).unwrap();
    assert_eq!(req1.approvals, 1);
    assert!(!req1.executed);

    // Second approval → executes
    client.approve_withdrawal(&signer2, &0);
    let req2 = client.get_request(&0).unwrap();
    assert!(req2.executed);
    assert_eq!(client.get_balance(&account), 3000);
}

#[test]
fn test_budget_setting() {
    let (env, client, admin) = setup();
    let account = Address::generate(&env);
    client.set_budget(&admin, &account, &10000);
    assert_eq!(client.get_budget(&account), 10000);
}

#[test]
fn test_audit_trail() {
    let (env, client, _admin) = setup();
    let account = Address::generate(&env);
    client.deposit(&account, &1000, &SorobanString::from_str(&env, "A"));
    client.deposit(&account, &500, &SorobanString::from_str(&env, "B"));
    client.withdraw(&account, &300, &SorobanString::from_str(&env, "C"));
    
    let history = client.get_history(&account);
    assert_eq!(history.len(), 3);
    assert_eq!(history.get(0).unwrap().tx_type, TxType::Deposit);
    assert_eq!(history.get(2).unwrap().tx_type, TxType::Withdrawal);
}
