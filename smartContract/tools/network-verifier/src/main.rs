use std::process::Command;
use std::io::{self, Write};

fn main() {
    println!("⚔️  SEIREITEI ON-CHAIN LIVE SIMULATOR  ⚔️");
    println!("---------------------------------------");

    // 1. Generate & Fund Account (Expansion 8.0 logic refreshed)
    println!("[1/5] Preparing real-time test account (reaper_test)...");
    let gen_output = Command::new("stellar")
        .args(["keys", "generate", "reaper_test", "--network", "testnet", "--overwrite"])
        .output()
        .expect("Failed to execute stellar keys generate");

    if !gen_output.status.success() {
        eprintln!("❌ Failed to generate keys: {}", String::from_utf8_lossy(&gen_output.stderr));
        return;
    }

    println!("[2/5] Funding reaper_test via Friendbot...");
    let fund_output = Command::new("stellar")
        .args(["keys", "fund", "reaper_test", "--network", "testnet"])
        .output()
        .expect("Failed to execute stellar keys fund");

    if !fund_output.status.success() {
        eprintln!("❌ Failed to fund account: {}", String::from_utf8_lossy(&fund_output.stderr));
        return;
    }
    println!("✅ Account ready on Testnet.");

    // 2. Build Contracts
    println!("[3/5] Attempting to build Seireitei WASM binaries...");
    let build_output = Command::new("stellar")
        .args(["contract", "build"])
        .current_dir(".") 
        .output()
        .expect("Failed to execute stellar contract build");

    let mut wasm_path = "target/wasm32-unknown-unknown/release/trust_token.wasm".to_string();
    
    if !build_output.status.success() {
        println!("⚠️  Automatic build failed (Environment missing WASM targets).");
        println!("💡 Searching for pre-compiled binaries...");
        
        // Check if file exists anyway or if we should skip
        if !std::path::Path::new(&wasm_path).exists() {
            println!("❌ No WASM found at {}. Deployment skipped.", wasm_path);
            println!("👉 Tip: Ensure wasm32-unknown-unknown is installed or provide a pre-compiled .wasm file.");
            return;
        }
        println!("✅ Found existing WASM artifact. Proceeding...");
    } else {
        println!("✅ WASM artifacts prepared.");
    }

    // 3. Deploy ReiatsuToken
    println!("[4/5] Deploying ReiatsuToken to Testnet...");
    // The wasm is at target/wasm32-unknown-unknown/release/trust_token.wasm relative to smartContract
    let deploy_output = Command::new("stellar")
        .args([
            "contract", "deploy",
            "--wasm", "target/wasm32-unknown-unknown/release/trust_token.wasm",
            "--source-account", "reaper_test",
            "--network", "testnet"
        ])
        .output()
        .expect("Failed to execute stellar contract deploy");

    if !deploy_output.status.success() {
        eprintln!("❌ Deployment failed: {}", String::from_utf8_lossy(&deploy_output.stderr));
        return;
    }
    let contract_id = String::from_utf8_lossy(&deploy_output.stdout).trim().to_string();
    println!("✅ ReiatsuToken DEPLOYED. ID: {}", contract_id);

    // 4. Live Interaction (Initialize & Mint)
    println!("[5/5] Performing live mission interaction (Minting Reiatsu)...");
    
    // a. Get Address
    let addr_output = Command::new("stellar")
        .args(["keys", "address", "reaper_test"])
        .output()
        .unwrap();
    let reaper_address = String::from_utf8_lossy(&addr_output.stdout).trim().to_string();

    // b. Initialize
    println!("   > Initializing contract with admin...");
    let init_output = Command::new("stellar")
        .args([
            "contract", "invoke", "--id", &contract_id,
            "--source-account", "reaper_test",
            "--network", "testnet",
            "--", "initialize", "--admin", &reaper_address
        ])
        .output()
        .unwrap();
    
    if !init_output.status.success() {
        eprintln!("❌ Initialization failed: {}", String::from_utf8_lossy(&init_output.stderr));
        return;
    }

    // c. Mint
    println!("   > Minting 5000 RA to self on Testnet...");
    let mint_output = Command::new("stellar")
        .args([
            "contract", "invoke", "--id", &contract_id,
            "--source-account", "reaper_test",
            "--network", "testnet",
            "--", "mint", "--admin", &reaper_address, "--to", &reaper_address, "--amount", "5000"
        ])
        .output()
        .unwrap();

    if !mint_output.status.success() {
        eprintln!("❌ Minting failed: {}", String::from_utf8_lossy(&mint_output.stderr));
        return;
    }

    // d. Verify Balance
    println!("   > Verifying live balance...");
    let balance_output = Command::new("stellar")
        .args([
            "contract", "invoke", "--id", &contract_id,
            "--source-account", "reaper_test",
            "--network", "testnet",
            "--", "balance", "--reaper", &reaper_address
        ])
        .output()
        .unwrap();

    let balance = String::from_utf8_lossy(&balance_output.stdout).trim().to_string();
    println!("\n✅ REAL-TIME SIMULATION COMPLETE.");
    println!("📊 LIVE REIATSU BALANCE: {} RA", balance);
    println!("🌐 Explorer: https://stellar.expert/explorer/testnet/contract/{}", contract_id);
    println!("\n[SEIREITEI PROTOCOL IS VIBRANT AND STABLE] 🌌");
}
