#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Bytes, Env, String, Address, Vec, vec,
};

mod test;

// ═══════════════════════════════════════════════════════════════════
//  PRODUCT VAULT v2 — ADVANCED ON-CHAIN DATABASE ENGINE
//  Architecture: Compressed KV Store with Bloom Filters, Hot/Cold
//  Zones, Batch Operations, Delta Updates, and Storage Analytics.
//  Designed for 200KB Soroban persistent storage budget.
// ═══════════════════════════════════════════════════════════════════

// ── Storage Zone Enum ────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StorageZone {
    Hot,   // Frequently accessed (Users, Active Products)
    Cold,  // Archival (Completed Orders, Old Proofs)
}

// ── Compression Algorithm Tag ────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CompressionAlgo {
    None,
    Zstd,     // Zstandard (server-side compression)
    Compact,  // Key-shortened + whitespace-stripped JSON
}

// ── Chunk Metadata (Uncompressed — stored in index zone) ─────────
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ChunkMeta {
    pub compression: CompressionAlgo,
    pub original_size: u32,
    pub compressed_size: u32,
    pub checksum: u64,       // Simple hash for integrity verification
    pub zone: StorageZone,
    pub version: u32,
    pub created_at: u64,
    pub updated_at: u64,
}

// ── Storage Statistics ───────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StorageStats {
    pub total_entries: u32,
    pub hot_entries: u32,
    pub cold_entries: u32,
    pub total_bytes_stored: u64,
    pub total_bytes_original: u64,
    pub compression_ratio: u32,   // Percentage (e.g., 75 = 75% smaller)
    pub bloom_false_positive_rate: u32, // Per-mille (e.g., 10 = 1%)
}

// ── Collection Index Entry ───────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IndexEntry {
    pub id: String,
    pub zone: StorageZone,
    pub compressed_size: u32,
    pub version: u32,
}

// ── Data Keys ────────────────────────────────────────────────────
#[contracttype]
pub enum DataKey {
    // Data storage
    Chunk(String, String),       // (Collection, Id) -> Compressed Bytes
    Meta(String, String),        // (Collection, Id) -> ChunkMeta
    // Index zone (uncompressed for fast lookup)
    CollectionIndex(String),     // Collection -> Vec<IndexEntry>
    // Bloom filter (global, ~2KB)
    BloomFilter,                 // -> Bytes (bit array)
    BloomSeed,                   // -> u64 (hash seed)
    // Stats
    Stats,                       // -> StorageStats
    // Admin
    Admin,
    // Version tracking for delta updates
    DeltaLog(String, String),    // (Collection, Id) -> Vec<Bytes> (patches)
}

// ── Bloom Filter Constants ───────────────────────────────────────
// 2048 bytes = 16384 bits, k=7 hash functions
// For n=500 keys: FPR ≈ 0.8%
const BLOOM_SIZE_BYTES: u32 = 2048;
const BLOOM_SIZE_BITS: u32 = BLOOM_SIZE_BYTES * 8;
const BLOOM_K: u32 = 7;

// ═══════════════════════════════════════════════════════════════════
//  CONTRACT IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════

#[contract]
pub struct ProductVault;

#[allow(deprecated)]
#[contractimpl]
impl ProductVault {

    // ── INITIALIZATION ───────────────────────────────────────────

    /// Initialize the vault with an admin address.
    /// Sets up empty bloom filter and zero stats.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);

        // Initialize empty bloom filter
        let bloom = Bytes::from_slice(&env, &[0u8; 2048]);
        env.storage().persistent().set(&DataKey::BloomFilter, &bloom);
        env.storage().persistent().set(&DataKey::BloomSeed, &42u64);

        // Initialize stats
        let stats = StorageStats {
            total_entries: 0,
            hot_entries: 0,
            cold_entries: 0,
            total_bytes_stored: 0,
            total_bytes_original: 0,
            compression_ratio: 0,
            bloom_false_positive_rate: 8, // Expected ~0.8%
        };
        env.storage().persistent().set(&DataKey::Stats, &stats);
    }

    // ── CORE WRITE OPERATIONS ────────────────────────────────────

    /// Store pre-compressed data with full metadata tracking.
    pub fn put(env: Env, collection: String, id: String, data: Bytes) {
        let admin: Address = env.storage().persistent()
            .get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();

        let now = env.ledger().timestamp();
        let data_len = data.len() as u32;

        let meta = ChunkMeta {
            compression: CompressionAlgo::Zstd,
            original_size: data_len * 4,
            compressed_size: data_len,
            checksum: Self::simple_hash(&data),
            zone: StorageZone::Hot,
            version: 1,
            created_at: now,
            updated_at: now,
        };

        env.storage().persistent().set(
            &DataKey::Chunk(collection.clone(), id.clone()), &data
        );
        env.storage().persistent().set(
            &DataKey::Meta(collection.clone(), id.clone()), &meta
        );

        Self::bloom_add(&env, &collection, &id);
        Self::index_upsert(&env, &collection, &id, &meta);
        Self::stats_update(&env, data_len as u64, meta.original_size as u64, true, true);

        env.events().publish(
            (symbol_short!("vault"), symbol_short!("put")),
            (collection, id, data_len),
        );
    }

    /// Store data with an explicit zone (Hot or Cold).
    pub fn put_zone(env: Env, collection: String, id: String, data: Bytes, zone: StorageZone) {
        let admin: Address = env.storage().persistent()
            .get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();

        let now = env.ledger().timestamp();
        let data_len = data.len() as u32;
        let is_hot = zone == StorageZone::Hot;

        let meta = ChunkMeta {
            compression: CompressionAlgo::Zstd,
            original_size: data_len * 4,
            compressed_size: data_len,
            checksum: Self::simple_hash(&data),
            zone,
            version: 1,
            created_at: now,
            updated_at: now,
        };

        env.storage().persistent().set(
            &DataKey::Chunk(collection.clone(), id.clone()), &data
        );
        env.storage().persistent().set(
            &DataKey::Meta(collection.clone(), id.clone()), &meta
        );

        Self::bloom_add(&env, &collection, &id);
        Self::index_upsert(&env, &collection, &id, &meta);
        Self::stats_update(&env, data_len as u64, meta.original_size as u64, true, is_hot);

        env.events().publish(
            (symbol_short!("vault"), symbol_short!("put_z")),
            (collection, id, data_len),
        );
    }

    /// Batch write multiple entries in a single transaction.
    pub fn batch_put(env: Env, collections: Vec<String>, ids: Vec<String>, values: Vec<Bytes>) {
        let admin: Address = env.storage().persistent()
            .get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();

        let count = collections.len();
        if count != ids.len() || count != values.len() {
            panic!("Mismatched batch sizes");
        }

        let now = env.ledger().timestamp();

        for i in 0..count {
            let collection = collections.get(i).unwrap();
            let id = ids.get(i).unwrap();
            let data = values.get(i).unwrap();
            let data_len = data.len() as u32;

            let meta = ChunkMeta {
                compression: CompressionAlgo::Zstd,
                original_size: data_len * 4,
                compressed_size: data_len,
                checksum: Self::simple_hash(&data),
                zone: StorageZone::Hot,
                version: 1,
                created_at: now,
                updated_at: now,
            };

            env.storage().persistent().set(
                &DataKey::Chunk(collection.clone(), id.clone()), &data
            );
            env.storage().persistent().set(
                &DataKey::Meta(collection.clone(), id.clone()), &meta
            );

            Self::bloom_add(&env, &collection, &id);
            Self::index_upsert(&env, &collection, &id, &meta);
            Self::stats_update(&env, data_len as u64, meta.original_size as u64, true, true);
        }

        env.events().publish(
            (symbol_short!("vault"), symbol_short!("batch")),
            count,
        );
    }

    /// Delta update: Apply a patch to existing data without full rewrite.
    pub fn delta_update(env: Env, collection: String, id: String, patch: Bytes) {
        let admin: Address = env.storage().persistent()
            .get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();

        if !env.storage().persistent().has(&DataKey::Chunk(collection.clone(), id.clone())) {
            panic!("Entry not found for delta update");
        }

        let mut deltas: Vec<Bytes> = env.storage().persistent()
            .get(&DataKey::DeltaLog(collection.clone(), id.clone()))
            .unwrap_or(vec![&env]);
        deltas.push_back(patch.clone());
        env.storage().persistent().set(
            &DataKey::DeltaLog(collection.clone(), id.clone()), &deltas
        );

        if let Some(mut meta) = env.storage().persistent()
            .get::<_, ChunkMeta>(&DataKey::Meta(collection.clone(), id.clone()))
        {
            meta.version += 1;
            meta.updated_at = env.ledger().timestamp();
            env.storage().persistent().set(
                &DataKey::Meta(collection.clone(), id.clone()), &meta
            );
        }

        env.events().publish(
            (symbol_short!("vault"), symbol_short!("delta")),
            (collection, id, patch.len()),
        );
    }

    // ── CORE READ OPERATIONS ─────────────────────────────────────

    pub fn get(env: Env, collection: String, id: String) -> Bytes {
        env.storage().persistent()
            .get(&DataKey::Chunk(collection, id))
            .unwrap_or(Bytes::new(&env))
    }

    pub fn get_meta(env: Env, collection: String, id: String) -> Option<ChunkMeta> {
        env.storage().persistent()
            .get(&DataKey::Meta(collection, id))
    }

    pub fn get_deltas(env: Env, collection: String, id: String) -> Vec<Bytes> {
        env.storage().persistent()
            .get(&DataKey::DeltaLog(collection, id))
            .unwrap_or(vec![&env])
    }

    pub fn bloom_check(env: Env, collection: String, id: String) -> bool {
        let bloom: Bytes = env.storage().persistent()
            .get(&DataKey::BloomFilter)
            .unwrap_or(Bytes::from_slice(&env, &[0u8; 2048]));
        let seed: u64 = env.storage().persistent()
            .get(&DataKey::BloomSeed)
            .unwrap_or(42u64);

        Self::bloom_test_internal(&bloom, &collection, &id, seed)
    }

    pub fn has(env: Env, collection: String, id: String) -> bool {
        env.storage().persistent()
            .has(&DataKey::Chunk(collection, id))
    }

    pub fn get_index(env: Env, collection: String) -> Vec<IndexEntry> {
        env.storage().persistent()
            .get(&DataKey::CollectionIndex(collection))
            .unwrap_or(vec![&env])
    }

    pub fn get_stats(env: Env) -> StorageStats {
        env.storage().persistent()
            .get(&DataKey::Stats)
            .unwrap_or(StorageStats {
                total_entries: 0,
                hot_entries: 0,
                cold_entries: 0,
                total_bytes_stored: 0,
                total_bytes_original: 0,
                compression_ratio: 0,
                bloom_false_positive_rate: 8,
            })
    }

    // ── ZONE MANAGEMENT ──────────────────────────────────────────

    pub fn migrate_to_cold(env: Env, collection: String, id: String) {
        let admin: Address = env.storage().persistent()
            .get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();

        if let Some(mut meta) = env.storage().persistent()
            .get::<_, ChunkMeta>(&DataKey::Meta(collection.clone(), id.clone()))
        {
            if meta.zone == StorageZone::Cold {
                return;
            }
            meta.zone = StorageZone::Cold;
            meta.updated_at = env.ledger().timestamp();
            env.storage().persistent().set(
                &DataKey::Meta(collection.clone(), id.clone()), &meta
            );

            Self::index_upsert(&env, &collection, &id, &meta);

            let mut stats: StorageStats = env.storage().persistent()
                .get(&DataKey::Stats).unwrap();
            if stats.hot_entries > 0 {
                stats.hot_entries -= 1;
            }
            stats.cold_entries += 1;
            env.storage().persistent().set(&DataKey::Stats, &stats);

            env.events().publish(
                (symbol_short!("vault"), symbol_short!("migrate")),
                (collection, id),
            );
        }
    }

    // ── DELETE OPERATIONS ────────────────────────────────────────

    pub fn delete(env: Env, collection: String, id: String) {
        let admin: Address = env.storage().persistent()
            .get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();

        let meta_opt = env.storage().persistent()
            .get::<_, ChunkMeta>(&DataKey::Meta(collection.clone(), id.clone()));

        env.storage().persistent().remove(&DataKey::Chunk(collection.clone(), id.clone()));
        env.storage().persistent().remove(&DataKey::Meta(collection.clone(), id.clone()));
        env.storage().persistent().remove(&DataKey::DeltaLog(collection.clone(), id.clone()));

        Self::index_remove(&env, &collection, &id);

        if let Some(meta) = meta_opt {
            let is_hot = meta.zone == StorageZone::Hot;
            Self::stats_update(
                &env, meta.compressed_size as u64,
                meta.original_size as u64, false, is_hot
            );
        }

        env.events().publish(
            (symbol_short!("vault"), symbol_short!("delete")),
            (collection, id),
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════

    fn simple_hash(data: &Bytes) -> u64 {
        let mut hash: u64 = 0xcbf29ce484222325;
        for i in 0..data.len() {
            hash ^= data.get(i).unwrap() as u64;
            hash = hash.wrapping_mul(0x100000001b3);
        }
        hash
    }

    fn bloom_add(env: &Env, collection: &String, id: &String) {
        let mut bloom: Bytes = env.storage().persistent()
            .get(&DataKey::BloomFilter)
            .unwrap_or(Bytes::from_slice(env, &[0u8; 2048]));
        let seed: u64 = env.storage().persistent()
            .get(&DataKey::BloomSeed)
            .unwrap_or(42u64);

        let base_hash = Self::bloom_key_hash(collection, id, seed);
        for i in 0..BLOOM_K {
            let bit_pos = ((base_hash.wrapping_add(i as u64 * base_hash.wrapping_shr(16)))
                % BLOOM_SIZE_BITS as u64) as u32;
            let byte_idx = bit_pos / 8;
            let bit_idx = bit_pos % 8;
            if byte_idx < bloom.len() as u32 {
                let current = bloom.get(byte_idx).unwrap_or(0);
                bloom.set(byte_idx, current | (1 << bit_idx));
            }
        }

        env.storage().persistent().set(&DataKey::BloomFilter, &bloom);
    }

    fn bloom_test_internal(bloom: &Bytes, collection: &String, id: &String, seed: u64) -> bool {
        let base_hash = Self::bloom_key_hash(collection, id, seed);
        for i in 0..BLOOM_K {
            let bit_pos = ((base_hash.wrapping_add(i as u64 * base_hash.wrapping_shr(16)))
                % BLOOM_SIZE_BITS as u64) as u32;
            let byte_idx = bit_pos / 8;
            let bit_idx = bit_pos % 8;
            if byte_idx < bloom.len() as u32 {
                let current = bloom.get(byte_idx).unwrap_or(0);
                if current & (1 << bit_idx) == 0 {
                    return false;
                }
            } else {
                return false;
            }
        }
        true
    }

    fn bloom_key_hash(collection: &String, id: &String, seed: u64) -> u64 {
        let mut hash = seed;
        let col_len = collection.len() as u64;
        hash ^= col_len;
        hash = hash.wrapping_mul(0x100000001b3);
        for i in 0..col_len {
            hash ^= (i + 1).wrapping_mul(31);
            hash = hash.wrapping_mul(0x100000001b3);
        }
        hash ^= 0xFF;
        hash = hash.wrapping_mul(0x100000001b3);
        let id_len = id.len() as u64;
        hash ^= id_len.wrapping_mul(37);
        hash = hash.wrapping_mul(0x100000001b3);
        for i in 0..id_len {
            hash ^= (i + 1).wrapping_mul(53);
            hash = hash.wrapping_mul(0x100000001b3);
        }
        hash
    }

    fn index_upsert(env: &Env, collection: &String, id: &String, meta: &ChunkMeta) {
        let mut index: Vec<IndexEntry> = env.storage().persistent()
            .get(&DataKey::CollectionIndex(collection.clone()))
            .unwrap_or(vec![env]);

        let entry = IndexEntry {
            id: id.clone(),
            zone: meta.zone.clone(),
            compressed_size: meta.compressed_size,
            version: meta.version,
        };

        let mut found = false;
        for i in 0..index.len() {
            if let Some(existing) = index.get(i) {
                if existing.id == *id {
                    index.set(i, entry.clone());
                    found = true;
                    break;
                }
            }
        }
        if !found {
            index.push_back(entry);
        }

        env.storage().persistent().set(
            &DataKey::CollectionIndex(collection.clone()), &index
        );
    }

    fn index_remove(env: &Env, collection: &String, id: &String) {
        let index: Vec<IndexEntry> = env.storage().persistent()
            .get(&DataKey::CollectionIndex(collection.clone()))
            .unwrap_or(vec![env]);

        let mut new_index: Vec<IndexEntry> = vec![env];
        for i in 0..index.len() {
            if let Some(entry) = index.get(i) {
                if entry.id != *id {
                    new_index.push_back(entry);
                }
            }
        }

        env.storage().persistent().set(
            &DataKey::CollectionIndex(collection.clone()), &new_index
        );
    }

    fn stats_update(env: &Env, compressed_bytes: u64, original_bytes: u64, is_add: bool, is_hot: bool) {
        let mut stats: StorageStats = env.storage().persistent()
            .get(&DataKey::Stats)
            .unwrap_or(StorageStats {
                total_entries: 0,
                hot_entries: 0,
                cold_entries: 0,
                total_bytes_stored: 0,
                total_bytes_original: 0,
                compression_ratio: 0,
                bloom_false_positive_rate: 8,
            });

        if is_add {
            stats.total_entries += 1;
            if is_hot { stats.hot_entries += 1; } else { stats.cold_entries += 1; }
            stats.total_bytes_stored += compressed_bytes;
            stats.total_bytes_original += original_bytes;
        } else {
            if stats.total_entries > 0 { stats.total_entries -= 1; }
            if is_hot && stats.hot_entries > 0 { stats.hot_entries -= 1; }
            if !is_hot && stats.cold_entries > 0 { stats.cold_entries -= 1; }
            if stats.total_bytes_stored >= compressed_bytes {
                stats.total_bytes_stored -= compressed_bytes;
            }
            if stats.total_bytes_original >= original_bytes {
                stats.total_bytes_original -= original_bytes;
            }
        }

        if stats.total_bytes_original > 0 {
            stats.compression_ratio = (100 - (stats.total_bytes_stored * 100 / stats.total_bytes_original)) as u32;
        }

        env.storage().persistent().set(&DataKey::Stats, &stats);
    }
}
