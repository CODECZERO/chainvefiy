#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, TrustTokenClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(TrustToken, ());
    let client = TrustTokenClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

#[test]
fn test_mint_and_balance() {
    let (env, client, admin) = setup();
    let user = Address::generate(&env);
    client.mint(&admin, &user, &1000);
    assert_eq!(client.balance(&user), 1000);
    assert_eq!(client.total_supply(), 1000);
}

#[test]
fn test_burn() {
    let (env, client, admin) = setup();
    let user = Address::generate(&env);
    client.mint(&admin, &user, &500);
    client.burn(&user, &200);
    assert_eq!(client.balance(&user), 300);
    assert_eq!(client.total_supply(), 300);
}

#[test]
fn test_transfer() {
    let (env, client, admin) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    client.mint(&admin, &alice, &1000);
    client.transfer(&alice, &bob, &400);
    assert_eq!(client.balance(&alice), 600);
    assert_eq!(client.balance(&bob), 400);
}

#[test]
fn test_approve_and_transfer_from() {
    let (env, client, admin) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let receiver = Address::generate(&env);
    
    client.mint(&admin, &owner, &1000);
    client.approve(&owner, &spender, &500);
    assert_eq!(client.allowance(&owner, &spender), 500);
    
    client.transfer_from(&spender, &owner, &receiver, &300);
    assert_eq!(client.balance(&owner), 700);
    assert_eq!(client.balance(&receiver), 300);
    assert_eq!(client.allowance(&owner, &spender), 200);
}

#[test]
fn test_stake_and_unstake() {
    let (env, client, admin) = setup();
    let user = Address::generate(&env);
    client.mint(&admin, &user, &1000);
    client.stake(&user, &400);
    assert_eq!(client.balance(&user), 600);
    assert_eq!(client.staked(&user), 400);

    client.unstake(&user, &200);
    assert!(client.balance(&user) >= 800); // 600 + 200 + possible rewards
    assert_eq!(client.staked(&user), 200);
}

#[test]
fn test_authorized_minter() {
    let (env, client, admin) = setup();
    let minter = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.add_minter(&admin, &minter);
    client.mint(&minter, &user, &500);
    assert_eq!(client.balance(&user), 500);
}

#[test]
#[should_panic(expected = "Insufficient unlocked balance")]
fn test_cannot_burn_locked_tokens() {
    let (env, client, admin) = setup();
    let user = Address::generate(&env);
    client.mint(&admin, &user, &1000);
    // Lock 800 tokens until far future
    client.lock(&admin, &user, &800, &99999999999);
    // Try to burn 500 (only 200 unlocked)
    client.burn(&user, &500);
}
