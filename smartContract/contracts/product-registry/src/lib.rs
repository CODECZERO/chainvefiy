#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Env, Address, String, Vec, vec, IntoVal,
};

mod test;

// ═══════════════════════════════════════════════════════════════════
//  PRODUCT REGISTRY v2 — FULL LIFECYCLE, DEADLINES, MULTI-VALIDATOR
// ═══════════════════════════════════════════════════════════════════

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProductStatus {
    Active,
    InProgress,
    Review,
    Verified,
    Failed,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProductEntry {
    pub title: String,
    pub risk_level: u32,
    pub status: ProductStatus,
    pub supplier: Address,
    pub created_at: u64,
    pub deadline: u64,              // Timestamp; 0 = no deadline
    pub verify_count: u32,          // Number of validator verifications
    pub required_verifications: u32, // 1 for Low/Med risk, 2+ for High
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProductProof {
    pub product_id: String,
    pub proof_cid: String,
    pub validator: Address,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProductCounter {
    pub total: u32,
    pub active: u32,
    pub verified: u32,
    pub failed: u32,
}

#[contracttype]
pub enum DataKey {
    Product(String),
    Proof(String),
    ProductValidators(String),     // Vec<Address> of validators who verified
    Counter,
    SupplierProducts(Address),     // Vec<String> of product IDs per supplier
    BadgeContract,
    TokenContract,
    Admin,
}

#[contract]
pub struct ProductRegistry;

#[allow(deprecated)]
#[contractimpl]
impl ProductRegistry {

    // ── INITIALIZATION ───────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::Counter, &ProductCounter {
            total: 0, active: 0, verified: 0, failed: 0,
        });
    }

    // ── ADMIN CONFIG ─────────────────────────────────────────────

    pub fn set_badge_contract(env: Env, admin: Address, badge_contract: Address) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        env.storage().instance().set(&DataKey::BadgeContract, &badge_contract);
    }

    pub fn set_token_contract(env: Env, admin: Address, token_contract: Address) {
        admin.require_auth();
        Self::require_admin(&env, &admin);
        env.storage().instance().set(&DataKey::TokenContract, &token_contract);
    }

    // ── PRODUCT LIFECYCLE ────────────────────────────────────────

    /// Register a new product. Risk level determines verification requirements.
    pub fn register_product(
        env: Env, supplier: Address, product_id: String,
        title: String, risk_level: u32, deadline: u64,
    ) {
        supplier.require_auth();

        if env.storage().persistent().has(&DataKey::Product(product_id.clone())) {
            panic!("Product ID already exists");
        }

        // High risk = 2 verifications required, else 1
        let required_verifications = if risk_level > 70 { 2 } else { 1 };

        let product = ProductEntry {
            title,
            risk_level,
            status: ProductStatus::Active,
            supplier: supplier.clone(),
            created_at: env.ledger().timestamp(),
            deadline,
            verify_count: 0,
            required_verifications,
        };

        env.storage().persistent().set(&DataKey::Product(product_id.clone()), &product);
        env.storage().persistent().set(
            &DataKey::ProductValidators(product_id.clone()), &Vec::<Address>::new(&env)
        );

        // Track products per supplier
        let mut supplier_products: Vec<String> = env.storage().persistent()
            .get(&DataKey::SupplierProducts(supplier.clone()))
            .unwrap_or(vec![&env]);
        supplier_products.push_back(product_id.clone());
        env.storage().persistent().set(&DataKey::SupplierProducts(supplier), &supplier_products);

        // Update counter
        let mut counter: ProductCounter = Self::get_counter_internal(&env);
        counter.total += 1;
        counter.active += 1;
        env.storage().persistent().set(&DataKey::Counter, &counter);

        env.events().publish(
            (symbol_short!("product"), symbol_short!("reg")),
            (product_id, env.ledger().timestamp()),
        );
    }

    /// Advance product status: Active → InProgress → Review
    pub fn advance_status(env: Env, supplier: Address, product_id: String) {
        supplier.require_auth();

        let mut product: ProductEntry = env.storage().persistent()
            .get(&DataKey::Product(product_id.clone())).expect("Product not found");

        if product.supplier != supplier {
            panic!("Only the supplier can advance status");
        }

        product.status = match product.status {
            ProductStatus::Active => ProductStatus::InProgress,
            ProductStatus::InProgress => ProductStatus::Review,
            _ => panic!("Cannot advance from current status"),
        };

        env.storage().persistent().set(&DataKey::Product(product_id.clone()), &product);

        env.events().publish(
            (symbol_short!("product"), symbol_short!("advance")),
            (product_id, env.ledger().timestamp()),
        );
    }

    /// Verify a product with proof. Multi-validator for high-risk products.
    pub fn verify_proof(
        env: Env, validator: Address, seller: Address,
        product_id: String, proof_cid: String,
    ) {
        validator.require_auth();

        let mut product: ProductEntry = env.storage().persistent()
            .get(&DataKey::Product(product_id.clone())).expect("Product not found");

        if product.status == ProductStatus::Verified {
            panic!("Product already verified");
        }
        if product.status == ProductStatus::Failed || product.status == ProductStatus::Expired {
            panic!("Product is failed/expired");
        }

        // Check deadline
        if product.deadline > 0 && env.ledger().timestamp() > product.deadline {
            product.status = ProductStatus::Expired;
            env.storage().persistent().set(&DataKey::Product(product_id.clone()), &product);

            let mut counter = Self::get_counter_internal(&env);
            if counter.active > 0 { counter.active -= 1; }
            counter.failed += 1;
            env.storage().persistent().set(&DataKey::Counter, &counter);

            panic!("Product deadline has passed");
        }

        // Check validator hasn't already verified this product
        let mut validators: Vec<Address> = env.storage().persistent()
            .get(&DataKey::ProductValidators(product_id.clone()))
            .unwrap_or(vec![&env]);
        for i in 0..validators.len() {
            if validators.get(i).unwrap() == validator {
                panic!("Validator already verified this product");
            }
        }
        validators.push_back(validator.clone());
        env.storage().persistent().set(
            &DataKey::ProductValidators(product_id.clone()), &validators
        );

        product.verify_count += 1;

        // Store proof
        let proof = ProductProof {
            product_id: product_id.clone(),
            proof_cid,
            validator: validator.clone(),
            timestamp: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::Proof(product_id.clone()), &proof);

        // Check if enough verifications to finalize
        if product.verify_count >= product.required_verifications {
            product.status = ProductStatus::Verified;

            let mut counter = Self::get_counter_internal(&env);
            if counter.active > 0 { counter.active -= 1; }
            counter.verified += 1;
            env.storage().persistent().set(&DataKey::Counter, &counter);

            // Inter-contract: Mint Seller Badge
            if let Some(badge_id) = env.storage().instance().get::<_, Address>(&DataKey::BadgeContract) {
                let rank = if product.risk_level > 80 {
                    String::from_str(&env, "Gold Seller")
                } else if product.risk_level > 40 {
                    String::from_str(&env, "Silver Seller")
                } else {
                    String::from_str(&env, "Bronze Seller")
                };
                env.invoke_contract::<()>(
                    &badge_id, &symbol_short!("mint"),
                    (seller.clone(), product_id.clone(), rank).into_val(&env),
                );
            }

            // Inter-contract: Mint Trust Token reward
            if let Some(token_id) = env.storage().instance().get::<_, Address>(&DataKey::TokenContract) {
                let reward: i128 = 100 + (product.risk_level as i128 * 10);
                let minter = env.current_contract_address();
                env.invoke_contract::<()>(
                    &token_id, &symbol_short!("mint"),
                    (minter, seller.clone(), reward).into_val(&env),
                );
            }
        }

        env.storage().persistent().set(&DataKey::Product(product_id.clone()), &product);

        env.events().publish(
            (symbol_short!("product"), symbol_short!("verify")),
            (product_id, env.ledger().timestamp()),
        );
    }

    /// Mark a product as failed (admin or supplier only).
    pub fn fail_product(env: Env, caller: Address, product_id: String) {
        caller.require_auth();

        let mut product: ProductEntry = env.storage().persistent()
            .get(&DataKey::Product(product_id.clone())).expect("Product not found");

        let is_admin = Self::is_admin(&env, &caller);
        if !is_admin && product.supplier != caller {
            panic!("Only admin or supplier can fail a product");
        }

        product.status = ProductStatus::Failed;
        env.storage().persistent().set(&DataKey::Product(product_id.clone()), &product);

        let mut counter = Self::get_counter_internal(&env);
        if counter.active > 0 { counter.active -= 1; }
        counter.failed += 1;
        env.storage().persistent().set(&DataKey::Counter, &counter);

        env.events().publish(
            (symbol_short!("product"), symbol_short!("failed")),
            (product_id, env.ledger().timestamp()),
        );
    }

    // ── QUERIES ──────────────────────────────────────────────────

    pub fn get_product(env: Env, product_id: String) -> Option<ProductEntry> {
        env.storage().persistent().get(&DataKey::Product(product_id))
    }

    pub fn get_proof(env: Env, product_id: String) -> Option<ProductProof> {
        env.storage().persistent().get(&DataKey::Proof(product_id))
    }

    pub fn get_counter(env: Env) -> ProductCounter {
        Self::get_counter_internal(&env)
    }

    pub fn get_products_by_supplier(env: Env, supplier: Address) -> Vec<String> {
        env.storage().persistent()
            .get(&DataKey::SupplierProducts(supplier))
            .unwrap_or(vec![&env])
    }

    pub fn get_validators(env: Env, product_id: String) -> Vec<Address> {
        env.storage().persistent()
            .get(&DataKey::ProductValidators(product_id))
            .unwrap_or(vec![&env])
    }

    // ── INTERNALS ────────────────────────────────────────────────

    fn get_counter_internal(env: &Env) -> ProductCounter {
        env.storage().persistent().get(&DataKey::Counter)
            .unwrap_or(ProductCounter { total: 0, active: 0, verified: 0, failed: 0 })
    }

    fn require_admin(env: &Env, caller: &Address) {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin).expect("Not initialized");
        if *caller != admin { panic!("Not admin"); }
    }

    fn is_admin(env: &Env, caller: &Address) -> bool {
        if let Some(admin) = env.storage().instance().get::<_, Address>(&DataKey::Admin) {
            *caller == admin
        } else {
            false
        }
    }
}
