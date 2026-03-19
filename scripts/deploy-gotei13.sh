#!/bin/bash

# Gotei-13 Protocol Deployment Script
# Automates the build and deployment of all Stellar Smart Contracts
# and updates the server environment variables.

echo "⚔️  INITIATING GOTEI-13 DEPLOYMENT SEQUENCE  ⚔️"
echo "-----------------------------------------------"

# 0. Check Dependencies
if ! command -v stellar &> /dev/null; then
    echo "❌ Stellar CLI not found. Please install it."
    exit 1
fi

# 1. Build All Contracts
echo "[1/3] Building Smart Contracts (Manual Cargo Mode)..."
echo "   > Target: wasm32-unknown-unknown"

cd ../smartContract
for msg in contracts/*; do
    if [ -d "$msg" ]; then
        dirname=$(basename "$msg")
        echo "   🔨 Building $dirname..."
        (cd "$msg" && cargo build --target wasm32-unknown-unknown --release)
        if [ $? -ne 0 ]; then
            echo "❌ Build failed for $dirname. Continuing..."
        fi
    fi
done
echo "✅ Build Sequence Complete."

# 2. Deploy Contracts & Capture IDs
NETWORK="testnet"
SOURCE_ACC="reaper_test"

# Function to deploy and return ID
deploy_contract() {
    local wasm=$1
    echo "   > Deploying ${wasm}..."
    local id=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/${wasm}.wasm --source-account $SOURCE_ACC --network $NETWORK)
    echo $id
}

echo "[2/3] Deploying to Testnet..."

# Ensure Account Exists
stellar keys generate $SOURCE_ACC --network $NETWORK --overwrite > /dev/null 2>&1
stellar keys fund $SOURCE_ACC --network $NETWORK > /dev/null 2>&1

VAULT_ID=$(deploy_contract "seireitei_vault")
echo "   -> Vault ID: $VAULT_ID"

TOKEN_ID=$(deploy_contract "reiatsu_token")
echo "   -> Token ID: $TOKEN_ID"

BADGE_ID=$(deploy_contract "soul_badge")
echo "   -> Badge ID: $BADGE_ID"

REGISTRY_ID=$(deploy_contract "mission_registry")
echo "   -> Registry ID: $REGISTRY_ID"

# 3. Update .env
echo "[3/3] Syncing Environment Variables..."
ENV_FILE="../server/.env"

# Helper to update/add key
update_env() {
    local key=$1
    local val=$2
    if grep -q "^$key=" "$ENV_FILE"; then
        sed -i "s/^$key=.*/$key=$val/" "$ENV_FILE"
    else
        echo "$key=$val" >> "$ENV_FILE"
    fi
}

update_env "VAULT_CONTRACT_ID" "$VAULT_ID"
update_env "TOKEN_CONTRACT_ID" "$TOKEN_ID"
update_env "BADGE_CONTRACT_ID" "$BADGE_ID"
update_env "REGISTRY_CONTRACT_ID" "$REGISTRY_ID"

echo "✅ Environment Updated."
echo "-----------------------------------------------"
echo "🎉 DEPLOYMENT COMPLETE. The Soul Society is Online."
