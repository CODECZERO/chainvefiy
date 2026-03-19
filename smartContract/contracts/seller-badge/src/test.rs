#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String as SorobanString};

fn setup() -> (Env, SellerBadgeClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(SellerBadge, ());
    let client = SellerBadgeClient::new(&env, &id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

#[test]
fn test_mint_badge() {
    let (env, client, _admin) = setup();
    let seller = Address::generate(&env);
    client.mint(&seller, &SorobanString::from_str(&env, "P001"), &SorobanString::from_str(&env, "Gold Seller"));
    assert_eq!(client.badge_count(&seller), 1);
    assert_eq!(client.total_badges(), 1);
    let badges = client.get_badges(&seller);
    assert_eq!(badges.len(), 1);
    assert_eq!(badges.get(0).unwrap().tier, BadgeTier::Bronze);
}

#[test]
fn test_tier_progression() {
    let (env, client, _admin) = setup();
    let seller = Address::generate(&env);
    // Mint 5 badges to reach Silver
    client.mint(&seller, &SorobanString::from_str(&env, "P0"), &SorobanString::from_str(&env, "Silver Seller"));
    client.mint(&seller, &SorobanString::from_str(&env, "P1"), &SorobanString::from_str(&env, "Silver Seller"));
    client.mint(&seller, &SorobanString::from_str(&env, "P2"), &SorobanString::from_str(&env, "Silver Seller"));
    client.mint(&seller, &SorobanString::from_str(&env, "P3"), &SorobanString::from_str(&env, "Silver Seller"));
    client.mint(&seller, &SorobanString::from_str(&env, "P4"), &SorobanString::from_str(&env, "Silver Seller"));
    // After 5 mints, active_count before 6th mint = 5 → Silver
    client.mint(&seller, &SorobanString::from_str(&env, "P5"), &SorobanString::from_str(&env, "Silver Seller"));
    let badges = client.get_badges(&seller);
    // First 5 badges are Bronze (active_count 0..=4), 6th is Silver
    assert_eq!(badges.get(4).unwrap().tier, BadgeTier::Bronze);
    assert_eq!(badges.get(5).unwrap().tier, BadgeTier::Silver);
}

#[test]
fn test_verify_badge() {
    let (env, client, _admin) = setup();
    let seller = Address::generate(&env);
    client.mint(&seller, &SorobanString::from_str(&env, "V001"), &SorobanString::from_str(&env, "Gold Seller"));
    assert!(client.verify_badge(&seller, &SorobanString::from_str(&env, "V001")));
    assert!(!client.verify_badge(&seller, &SorobanString::from_str(&env, "V999")));
}

#[test]
fn test_revoke_badge() {
    let (env, client, admin) = setup();
    let seller = Address::generate(&env);
    client.mint(&seller, &SorobanString::from_str(&env, "R001"), &SorobanString::from_str(&env, "Bronze Seller"));
    assert_eq!(client.badge_count(&seller), 1);
    
    client.revoke(&admin, &seller, &SorobanString::from_str(&env, "R001"));
    assert_eq!(client.badge_count(&seller), 0);
    assert!(!client.verify_badge(&seller, &SorobanString::from_str(&env, "R001")));
}

#[test]
fn test_leaderboard() {
    let (env, client, _admin) = setup();
    let s1 = Address::generate(&env);
    let s2 = Address::generate(&env);
    
    // s1 gets 3 badges, s2 gets 1
    client.mint(&s1, &SorobanString::from_str(&env, "A0"), &SorobanString::from_str(&env, "Bronze Seller"));
    client.mint(&s1, &SorobanString::from_str(&env, "A1"), &SorobanString::from_str(&env, "Bronze Seller"));
    client.mint(&s1, &SorobanString::from_str(&env, "A2"), &SorobanString::from_str(&env, "Bronze Seller"));
    client.mint(&s2, &SorobanString::from_str(&env, "B0"), &SorobanString::from_str(&env, "Bronze Seller"));
    
    let top = client.get_top_sellers(&10);
    assert_eq!(top.len(), 2);
    assert_eq!(top.get(0).unwrap().badge_count, 3);
    assert_eq!(top.get(1).unwrap().badge_count, 1);
}
