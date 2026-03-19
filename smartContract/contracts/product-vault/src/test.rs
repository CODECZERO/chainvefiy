#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Bytes, Env, String as SorobanString, vec};

fn setup() -> (Env, ProductVaultClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ProductVault, ());
    let client = ProductVaultClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}

// ── Basic CRUD ───────────────────────────────────────────────────

#[test]
fn test_put_and_get() {
    let (env, client, _admin) = setup();

    let collection = SorobanString::from_str(&env, "Products");
    let id = SorobanString::from_str(&env, "P001");
    let data = Bytes::from_array(&env, &[10, 20, 30, 40, 50]);

    client.put(&collection, &id, &data);

    let fetched = client.get(&collection, &id);
    assert_eq!(fetched, data);
}

#[test]
fn test_has_existing_and_missing() {
    let (env, client, _admin) = setup();

    let collection = SorobanString::from_str(&env, "Orders");
    let id = SorobanString::from_str(&env, "O001");
    let data = Bytes::from_array(&env, &[1, 2, 3]);

    // Before put
    assert!(!client.has(&collection, &id));

    client.put(&collection, &id, &data);

    // After put
    assert!(client.has(&collection, &id));

    // Non-existent
    let missing = SorobanString::from_str(&env, "O999");
    assert!(!client.has(&collection, &missing));
}

#[test]
fn test_delete_entry() {
    let (env, client, _admin) = setup();

    let collection = SorobanString::from_str(&env, "Products");
    let id = SorobanString::from_str(&env, "P_DEL");
    let data = Bytes::from_array(&env, &[99, 88, 77]);

    client.put(&collection, &id, &data);
    assert!(client.has(&collection, &id));

    client.delete(&collection, &id);
    assert!(!client.has(&collection, &id));

    // Stats should reflect deletion
    let stats = client.get_stats();
    assert_eq!(stats.total_entries, 0);
}

// ── Bloom Filter ─────────────────────────────────────────────────

#[test]
fn test_bloom_filter_positive() {
    let (env, client, _admin) = setup();

    let collection = SorobanString::from_str(&env, "Products");
    let id = SorobanString::from_str(&env, "BLOOM_TEST");
    let data = Bytes::from_array(&env, &[1, 2, 3]);

    client.put(&collection, &id, &data);

    // Should return true (entry exists)
    assert!(client.bloom_check(&collection, &id));
}

#[test]
fn test_bloom_filter_negative() {
    let (env, client, _admin) = setup();

    let collection = SorobanString::from_str(&env, "Products");
    let missing_id = SorobanString::from_str(&env, "DEFINITELY_NOT_HERE");

    // Should return false (no entries added)
    assert!(!client.bloom_check(&collection, &missing_id));
}

// ── Hot/Cold Zones ───────────────────────────────────────────────

#[test]
fn test_put_zone_hot_and_cold() {
    let (env, client, _admin) = setup();

    let collection = SorobanString::from_str(&env, "Orders");
    let hot_id = SorobanString::from_str(&env, "HOT_01");
    let cold_id = SorobanString::from_str(&env, "COLD_01");
    let data = Bytes::from_array(&env, &[5, 10, 15]);

    client.put_zone(&collection, &hot_id, &data, &StorageZone::Hot);
    client.put_zone(&collection, &cold_id, &data, &StorageZone::Cold);

    let stats = client.get_stats();
    assert_eq!(stats.hot_entries, 1);
    assert_eq!(stats.cold_entries, 1);
    assert_eq!(stats.total_entries, 2);
}

#[test]
fn test_migrate_hot_to_cold() {
    let (env, client, _admin) = setup();

    let collection = SorobanString::from_str(&env, "Products");
    let id = SorobanString::from_str(&env, "P_MIGRATE");
    let data = Bytes::from_array(&env, &[7, 14, 21]);

    // Start in Hot
    client.put(&collection, &id, &data);
    let meta = client.get_meta(&collection, &id).unwrap();
    assert_eq!(meta.zone, StorageZone::Hot);

    // Migrate to Cold
    client.migrate_to_cold(&collection, &id);
    let meta_after = client.get_meta(&collection, &id).unwrap();
    assert_eq!(meta_after.zone, StorageZone::Cold);

    // Stats updated
    let stats = client.get_stats();
    assert_eq!(stats.hot_entries, 0);
    assert_eq!(stats.cold_entries, 1);
}

// ── Batch Operations ─────────────────────────────────────────────

#[test]
fn test_batch_put() {
    let (env, client, _admin) = setup();

    let collections = vec![
        &env,
        SorobanString::from_str(&env, "Products"),
        SorobanString::from_str(&env, "Products"),
        SorobanString::from_str(&env, "Orders"),
    ];
    let ids = vec![
        &env,
        SorobanString::from_str(&env, "B1"),
        SorobanString::from_str(&env, "B2"),
        SorobanString::from_str(&env, "B3"),
    ];
    let values = vec![
        &env,
        Bytes::from_array(&env, &[1, 1]),
        Bytes::from_array(&env, &[2, 2]),
        Bytes::from_array(&env, &[3, 3]),
    ];

    client.batch_put(&collections, &ids, &values);

    // All three should exist
    assert!(client.has(
        &SorobanString::from_str(&env, "Products"),
        &SorobanString::from_str(&env, "B1"),
    ));
    assert!(client.has(
        &SorobanString::from_str(&env, "Orders"),
        &SorobanString::from_str(&env, "B3"),
    ));

    let stats = client.get_stats();
    assert_eq!(stats.total_entries, 3);
}

// ── Delta Updates ────────────────────────────────────────────────

#[test]
fn test_delta_update() {
    let (env, client, _admin) = setup();

    let collection = SorobanString::from_str(&env, "Products");
    let id = SorobanString::from_str(&env, "DELTA_PRD");
    let data = Bytes::from_array(&env, &[1, 2, 3, 4, 5]);

    client.put(&collection, &id, &data);

    // Apply delta patch
    let patch = Bytes::from_array(&env, &[99]); // e.g., change field
    client.delta_update(&collection, &id, &patch);

    // Check version bumped
    let meta = client.get_meta(&collection, &id).unwrap();
    assert_eq!(meta.version, 2);

    // Check deltas retrievable
    let deltas = client.get_deltas(&collection, &id);
    assert_eq!(deltas.len(), 1);
}

// ── Metadata & Index ─────────────────────────────────────────────

#[test]
fn test_metadata_stored() {
    let (env, client, _admin) = setup();

    let collection = SorobanString::from_str(&env, "Orders");
    let id = SorobanString::from_str(&env, "D001");
    let data = Bytes::from_array(&env, &[10, 20, 30]);

    client.put(&collection, &id, &data);

    let meta = client.get_meta(&collection, &id);
    assert!(meta.is_some());

    let m = meta.unwrap();
    assert_eq!(m.compressed_size, 3);
    assert_eq!(m.version, 1);
    assert_eq!(m.zone, StorageZone::Hot);
}

#[test]
fn test_collection_index() {
    let (env, client, _admin) = setup();

    let collection = SorobanString::from_str(&env, "Products");

    client.put(
        &collection,
        &SorobanString::from_str(&env, "IX1"),
        &Bytes::from_array(&env, &[1]),
    );
    client.put(
        &collection,
        &SorobanString::from_str(&env, "IX2"),
        &Bytes::from_array(&env, &[2]),
    );

    let index = client.get_index(&collection);
    assert_eq!(index.len(), 2);
}

// ── Storage Stats ────────────────────────────────────────────────

#[test]
fn test_storage_stats_accuracy() {
    let (env, client, _admin) = setup();

    let collection = SorobanString::from_str(&env, "Stats_Test");
    let data = Bytes::from_array(&env, &[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    client.put(
        &collection,
        &SorobanString::from_str(&env, "S1"),
        &data,
    );
    client.put(
        &collection,
        &SorobanString::from_str(&env, "S2"),
        &data,
    );

    let stats = client.get_stats();
    assert_eq!(stats.total_entries, 2);
    assert_eq!(stats.total_bytes_stored, 20); // 10 bytes * 2
    assert_eq!(stats.hot_entries, 2);
    assert!(stats.compression_ratio > 0);
}
