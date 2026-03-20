#![cfg(test)]
use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Env, Address, String};

fn setup_contract() -> (Env, Address, Address, Address, Address, EscrowContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();

    // Set a non-zero initial ledger timestamp so timestamp-based logic works
    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000;
    });

    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let buyer = Address::generate(&env);
    let supplier = Address::generate(&env);

    client.initialize(&admin);

    (env, admin, buyer, supplier, contract_id, client)
}

#[test]
fn test_create_escrow() {
    let (env, _admin, buyer, supplier, _cid, client) = setup_contract();

    let product_id = String::from_str(&env, "product_001");
    client.create_escrow(&buyer, &supplier, &1000, &500, &product_id, &9999999);

    let escrow = client.get_escrow(&product_id);
    assert_eq!(escrow.total_amount, 1000);
    assert_eq!(escrow.locked_amount, 500);
    assert_eq!(escrow.status, EscrowStatus::Locked);
    assert_eq!(escrow.buyer, buyer);
    assert_eq!(escrow.supplier, supplier);

    // Verify indices
    let all_ids = client.get_all_escrow_ids();
    assert_eq!(all_ids.len(), 1);

    let supplier_escrows = client.get_supplier_escrows(&supplier);
    assert_eq!(supplier_escrows.len(), 1);

    let buyer_escrows = client.get_buyer_escrows(&buyer);
    assert_eq!(buyer_escrows.len(), 1);

    // Platform stats
    let (locked, released, refunded) = client.get_platform_stats();
    assert_eq!(locked, 500);
    assert_eq!(released, 0);
    assert_eq!(refunded, 0);
}

#[test]
fn test_submit_proof() {
    let (env, _admin, buyer, supplier, _cid, client) = setup_contract();

    let product_id = String::from_str(&env, "product_002");
    client.create_escrow(&buyer, &supplier, &2000, &1000, &product_id, &9999999);

    let proof = String::from_str(&env, "QmProofHash123");
    client.submit_proof(&product_id, &proof);

    let escrow = client.get_escrow(&product_id);
    assert_eq!(escrow.proof_cid, proof);
    assert_eq!(escrow.status, EscrowStatus::Locked); // still locked, waiting for votes
}

#[test]
fn test_vote_and_release() {
    let (env, _admin, buyer, supplier, _cid, client) = setup_contract();

    let product_id = String::from_str(&env, "product_003");
    client.create_escrow(&buyer, &supplier, &1000, &500, &product_id, &9999999);

    // 3 community members vote "real"
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);
    let voter3 = Address::generate(&env);

    client.vote(&product_id, &voter1, &false); // real
    client.vote(&product_id, &voter2, &false); // real
    client.vote(&product_id, &voter3, &false); // real

    let escrow = client.get_escrow(&product_id);
    assert_eq!(escrow.real_votes, 3);
    assert_eq!(escrow.scam_votes, 0);

    // Release
    client.release(&product_id);

    let escrow = client.get_escrow(&product_id);
    assert_eq!(escrow.status, EscrowStatus::Released);
    assert!(escrow.released_at > 0);

    // Platform stats updated
    let (locked, released, _refunded) = client.get_platform_stats();
    assert_eq!(locked, 0);
    assert_eq!(released, 500);

    // Voters should get accuracy rewards
    let stats1 = client.get_voter_stats(&voter1);
    assert_eq!(stats1.correct_votes, 1);
    assert_eq!(stats1.total_votes, 1);
    assert_eq!(stats1.rewards_earned, 10);
}

#[test]
fn test_vote_dispute_and_refund() {
    let (env, _admin, buyer, supplier, _cid, client) = setup_contract();

    let product_id = String::from_str(&env, "product_004");
    client.create_escrow(&buyer, &supplier, &1000, &500, &product_id, &9999999);

    // 3 community members vote "scam"
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);
    let voter3 = Address::generate(&env);

    client.vote(&product_id, &voter1, &true);  // scam
    client.vote(&product_id, &voter2, &true);  // scam
    client.vote(&product_id, &voter3, &true);  // scam

    let escrow = client.get_escrow(&product_id);
    assert_eq!(escrow.scam_votes, 3);

    // Dispute
    client.dispute(&product_id);

    let escrow = client.get_escrow(&product_id);
    assert_eq!(escrow.status, EscrowStatus::Disputed);
    assert!(escrow.dispute_start > 0);

    // Simulate 30 days passing by using mock ledger
    env.ledger().with_mut(|li| {
        li.timestamp = escrow.dispute_start + DEFAULT_LOCK_DURATION + 1;
    });

    // Now refund
    client.refund(&product_id);

    let escrow = client.get_escrow(&product_id);
    assert_eq!(escrow.status, EscrowStatus::Refunded);

    // Platform stats
    let (locked, _released, refunded) = client.get_platform_stats();
    assert_eq!(locked, 0);
    assert_eq!(refunded, 500);

    // Scam voters get accuracy rewards
    let stats1 = client.get_voter_stats(&voter1);
    assert_eq!(stats1.correct_votes, 1);
    assert_eq!(stats1.rewards_earned, 10);
}

#[test]
#[should_panic(expected = "Cannot vote on own escrow")]
fn test_cannot_vote_own_escrow() {
    let (env, _admin, buyer, supplier, _cid, client) = setup_contract();

    let product_id = String::from_str(&env, "product_005");
    client.create_escrow(&buyer, &supplier, &1000, &500, &product_id, &9999999);

    // Buyer tries to vote on own escrow
    client.vote(&product_id, &buyer, &false);
}

#[test]
#[should_panic(expected = "Already voted")]
fn test_cannot_double_vote() {
    let (env, _admin, buyer, supplier, _cid, client) = setup_contract();

    let product_id = String::from_str(&env, "product_006");
    client.create_escrow(&buyer, &supplier, &1000, &500, &product_id, &9999999);

    let voter = Address::generate(&env);
    client.vote(&product_id, &voter, &false);
    client.vote(&product_id, &voter, &true); // should panic
}

#[test]
#[should_panic(expected = "Escrow already exists for this product")]
fn test_cannot_create_duplicate_escrow() {
    let (env, _admin, buyer, supplier, _cid, client) = setup_contract();

    let product_id = String::from_str(&env, "product_007");
    client.create_escrow(&buyer, &supplier, &1000, &500, &product_id, &9999999);
    client.create_escrow(&buyer, &supplier, &2000, &1000, &product_id, &9999999); // should panic
}

#[test]
#[should_panic(expected = "Not enough votes")]
fn test_cannot_release_without_min_votes() {
    let (env, _admin, buyer, supplier, _cid, client) = setup_contract();

    let product_id = String::from_str(&env, "product_008");
    client.create_escrow(&buyer, &supplier, &1000, &500, &product_id, &9999999);

    // Only 1 vote (min is 3)
    let voter = Address::generate(&env);
    client.vote(&product_id, &voter, &false);

    client.release(&product_id); // should panic
}

#[test]
fn test_mixed_votes_release() {
    let (env, _admin, buyer, supplier, _cid, client) = setup_contract();

    let product_id = String::from_str(&env, "product_009");
    client.create_escrow(&buyer, &supplier, &1000, &500, &product_id, &9999999);

    // 4 real, 1 scam = 80% real → should release
    let v1 = Address::generate(&env);
    let v2 = Address::generate(&env);
    let v3 = Address::generate(&env);
    let v4 = Address::generate(&env);
    let v5 = Address::generate(&env);

    client.vote(&product_id, &v1, &false);
    client.vote(&product_id, &v2, &false);
    client.vote(&product_id, &v3, &false);
    client.vote(&product_id, &v4, &false);
    client.vote(&product_id, &v5, &true);

    client.release(&product_id);

    let escrow = client.get_escrow(&product_id);
    assert_eq!(escrow.status, EscrowStatus::Released);

    // v1-v4 voted correctly (real), v5 voted incorrectly (scam)
    let s1 = client.get_voter_stats(&v1);
    assert_eq!(s1.correct_votes, 1);

    let s5 = client.get_voter_stats(&v5);
    assert_eq!(s5.correct_votes, 0);
    assert_eq!(s5.total_votes, 1);
}

#[test]
fn test_multiple_escrows_for_same_supplier() {
    let (env, _admin, buyer, supplier, _cid, client) = setup_contract();

    let t1 = String::from_str(&env, "product_010");
    let t2 = String::from_str(&env, "product_011");
    let t3 = String::from_str(&env, "product_012");

    client.create_escrow(&buyer, &supplier, &1000, &500, &t1, &9999999);
    client.create_escrow(&buyer, &supplier, &2000, &1000, &t2, &9999999);
    client.create_escrow(&buyer, &supplier, &3000, &1500, &t3, &9999999);

    let supplier_escrows = client.get_supplier_escrows(&supplier);
    assert_eq!(supplier_escrows.len(), 3);

    let all = client.get_all_escrow_ids();
    assert_eq!(all.len(), 3);

    // Total locked = 500 + 1000 + 1500 = 3000
    let (locked, _, _) = client.get_platform_stats();
    assert_eq!(locked, 3000);
}
