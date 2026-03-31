#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  AidBridge Smart Contract Deployment
#  Deploys OR re-uses all contracts used by the server.
#
#  Usage:
#    ./deploy_contract.sh              # Reuse existing IDs, deploy only missing
#    ./deploy_contract.sh --force      # Force fresh deploy of all contracts
#    ./deploy_contract.sh --init-only  # Skip deploy, only (re)initialize
# ═══════════════════════════════════════════════════════════════════
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Parse flags ──────────────────────────────────────────────────
FORCE=false
INIT_ONLY=false
for arg in "$@"; do
    case "$arg" in
        --force)     FORCE=true ;;
        --init-only) INIT_ONLY=true ;;
        *)           echo -e "${RED}Unknown flag: $arg${NC}"; exit 1 ;;
    esac
done

echo -e "${YELLOW}🚀 AidBridge Smart Contract Deployment${NC}"
if [ "$FORCE" = true ]; then
    echo -e "${YELLOW}   Mode: FORCE (fresh deploy all)${NC}"
elif [ "$INIT_ONLY" = true ]; then
    echo -e "${YELLOW}   Mode: INIT-ONLY (re-initialize existing contracts)${NC}"
else
    echo -e "${YELLOW}   Mode: SMART (reuse existing, deploy missing)${NC}"
fi

ENV_FILE="server/.env"

# ─── Helper: update or add a key in .env ──────────────────────────
update_env() {
    local key=$1
    local val=$2
    if [ ! -f "$ENV_FILE" ]; then
        echo "$key=$val" > "$ENV_FILE"
        return
    fi
    if grep -q "^${key}=" "$ENV_FILE"; then
        # In-place replacement (no duplicates)
        sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    else
        echo "$key=$val" >> "$ENV_FILE"
    fi
}

# ─── Helper: read existing value from .env ────────────────────────
read_env() {
    local key=$1
    if [ -f "$ENV_FILE" ]; then
        grep "^${key}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]'
    fi
}

# ─── 1. Setup PATH ───────────────────────────────────────────────
export PATH="$HOME/.cargo/bin:$PATH"
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

# ─── 2. Rust toolchain ───────────────────────────────────────────
echo -e "${YELLOW}Checking Rust...${NC}"
if ! command -v rustup &> /dev/null; then
    echo -e "${YELLOW}Installing rustup...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi
echo -e "${GREEN}✓ rustup installed${NC}"
if ! cargo --version &>/dev/null; then
    echo -e "${YELLOW}Setting default Rust toolchain...${NC}"
    rustup default stable
fi
rustup target add wasm32-unknown-unknown 2>/dev/null || true
rustup target add wasm32v1-none 2>/dev/null || true

# ─── 3. Stellar CLI ──────────────────────────────────────────────
if ! command -v stellar &> /dev/null; then
    echo -e "${RED}✗ Stellar CLI not found. Install: https://developers.stellar.org/docs/tools/developer-tools${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Stellar CLI: $(stellar --version | head -1)${NC}"

# ─── 4. Testnet config ───────────────────────────────────────────
echo -e "${YELLOW}Configuring testnet...${NC}"
stellar network add --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015" 2>/dev/null || true
echo -e "${GREEN}✓ Testnet configured${NC}"

# ─── 5. Admin identity ───────────────────────────────────────────
if ! stellar keys address admin &> /dev/null; then
    echo -e "${YELLOW}Creating admin identity...${NC}"
    stellar keys generate --global admin --network testnet
    ADMIN_ADDR=$(stellar keys address admin)
    echo -e "${YELLOW}Funding admin: ${ADMIN_ADDR}${NC}"
    curl -s "https://friendbot.stellar.org/?addr=${ADMIN_ADDR}" > /dev/null 2>&1 || true
    sleep 3
    echo -e "${GREEN}✓ Admin funded${NC}"
else
    echo -e "${GREEN}✓ Admin exists: $(stellar keys address admin)${NC}"
fi
ADMIN_ADDR=$(stellar keys address admin)

# ─── 5b. Sync STACK_ADMIN_SECRET to .env ──────────────────────────
# The server needs the admin secret to sign transactions server-side.
ADMIN_SECRET=$(stellar keys show admin 2>/dev/null || echo "")
if [ -n "$ADMIN_SECRET" ]; then
    update_env "STACK_ADMIN_SECRET" "$ADMIN_SECRET"
    echo -e "${GREEN}✓ STACK_ADMIN_SECRET synced to .env${NC}"
else
    echo -e "${YELLOW}⚠ Could not extract admin secret (stellar keys show admin failed)${NC}"
fi

# ─── 6. Build all contracts (skip if --init-only) ─────────────────
if [ "$INIT_ONLY" != "true" ]; then
    echo -e "${YELLOW}Building contracts...${NC}"
    cd smartContract
    stellar contract build
    cd ..
    echo -e "${GREEN}✓ Build done${NC}"
fi

RELEASE_DIR="smartContract/target/wasm32v1-none/release"
if [ ! -d "$RELEASE_DIR" ] || [ -z "$(ls -A "$RELEASE_DIR"/*.wasm 2>/dev/null)" ]; then
    RELEASE_DIR="smartContract/target/wasm32-unknown-unknown/release"
fi

# ─── Helper: deploy a contract or reuse existing ID from .env ─────
deploy_or_reuse() {
    local name=$1
    local wasm=$2
    local env_key=$3
    local existing_id

    existing_id=$(read_env "$env_key")

    # If not forcing and we already have an ID, try to reuse it
    if [ "$FORCE" != "true" ] && [ -n "$existing_id" ]; then
        # Quick validation: try to read the contract ledger entry
        if stellar contract info interface --id "$existing_id" --network testnet &>/dev/null 2>&1; then
            echo -e "${GREEN}✓ $name: reusing $existing_id${NC}" >&2
            echo "$existing_id"
            return 0
        else
            echo -e "${YELLOW}⚠ $name: existing ID invalid, redeploying...${NC}" >&2
        fi
    fi

    # Deploy fresh
    if [ ! -f "$wasm" ]; then
        echo -e "${RED}✗ $name: WASM not found: $wasm${NC}" >&2
        echo "$existing_id"  # fallback to whatever we had
        return 1
    fi

    local deploy_out
    deploy_out=$(stellar contract deploy --wasm "$wasm" --network testnet --source admin 2>&1)
    local deploy_exit=$?

    if [ $deploy_exit -ne 0 ]; then
        echo -e "${RED}✗ $name deploy failed: $deploy_out${NC}" >&2
        echo "$existing_id"  # fallback
        return 1
    fi

    # The contract ID is the last line of output
    local new_id
    new_id=$(echo "$deploy_out" | tail -1 | tr -d '[:space:]')

    if [ -n "$new_id" ]; then
        update_env "$env_key" "$new_id"
        echo -e "${GREEN}✓ $name deployed: $new_id${NC}" >&2
        echo "$new_id"
    else
        echo -e "${RED}✗ $name: no contract ID in output${NC}" >&2
        echo "$existing_id"
        return 1
    fi
}

# ─── Helper: initialize a contract with admin address ─────────────
init_contract() {
    local name=$1
    local contract_id=$2

    if [ -z "$contract_id" ]; then
        echo -e "${YELLOW}⚠ $name: no contract ID, skipping init${NC}"
        return 0
    fi

    local output
    output=$(stellar contract invoke \
        --id "$contract_id" \
        --network testnet \
        --source admin \
        -- initialize \
        --admin "$ADMIN_ADDR" 2>&1) && {
        echo -e "${GREEN}✓ $name initialized${NC}"
    } || {
        if echo "$output" | grep -qi "already initialized\|Already initialized\|UnreachableCodeReached"; then
            echo -e "${GREEN}✓ $name (already initialized)${NC}"
        else
            echo -e "${YELLOW}⚠ $name init warning: $output${NC}"
        fi
    }
}

# ─── 7. Deploy each contract ─────────────────────────────────────
# We use background processes to speed this up significantly.
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

deploy_task() {
    local name=$1
    local wasm=$2
    local env_key=$3
    local id
    id=$(deploy_or_reuse "$name" "$wasm" "$env_key")
    echo "$id" > "$TMP_DIR/$env_key"
}

if [ "$INIT_ONLY" != "true" ] || [ "$FORCE" = "true" ]; then
    echo -e "${YELLOW}━━━ Contract Deployment (Parallel) ━━━${NC}"
else
    echo -e "${YELLOW}━━━ Reading Contract IDs ━━━${NC}"
fi

deploy_task "Seiretei Vault" "$RELEASE_DIR/product_vault.wasm" "VAULT_CONTRACT_ID" &
deploy_task "Mission Registry" "$RELEASE_DIR/product_registry.wasm" "MISSION_REGISTRY_CONTRACT_ID" &
deploy_task "Escrow" "$RELEASE_DIR/escrow.wasm" "ESCROW_CONTRACT_ID" &
deploy_task "Reiatsu Token" "$RELEASE_DIR/trust_token.wasm" "REIATSU_TOKEN_CONTRACT_ID" &
deploy_task "Soul Badge" "$RELEASE_DIR/seller_badge.wasm" "SOUL_BADGE_CONTRACT_ID" &
deploy_task "Treasury" "$RELEASE_DIR/division_treasury.wasm" "TREASURY_CONTRACT_ID" &
deploy_task "Soul Reaper Registry" "$RELEASE_DIR/supplier_registry.wasm" "SOUL_REAPER_REGISTRY_CONTRACT_ID" &
deploy_task "Notifications" "$RELEASE_DIR/notifications.wasm" "NOTIFICATIONS_CONTRACT_ID" &

wait

VAULT_ID=$(cat "$TMP_DIR/VAULT_CONTRACT_ID" 2>/dev/null || read_env "VAULT_CONTRACT_ID")
REGISTRY_ID=$(cat "$TMP_DIR/MISSION_REGISTRY_CONTRACT_ID" 2>/dev/null || read_env "MISSION_REGISTRY_CONTRACT_ID")
ESCROW_ID=$(cat "$TMP_DIR/ESCROW_CONTRACT_ID" 2>/dev/null || read_env "ESCROW_CONTRACT_ID")
REIATSU_ID=$(cat "$TMP_DIR/REIATSU_TOKEN_CONTRACT_ID" 2>/dev/null || read_env "REIATSU_TOKEN_CONTRACT_ID")
SOUL_BADGE_ID=$(cat "$TMP_DIR/SOUL_BADGE_CONTRACT_ID" 2>/dev/null || read_env "SOUL_BADGE_CONTRACT_ID")
TREASURY_ID=$(cat "$TMP_DIR/TREASURY_CONTRACT_ID" 2>/dev/null || read_env "TREASURY_CONTRACT_ID")
SOUL_REAPER_ID=$(cat "$TMP_DIR/SOUL_REAPER_REGISTRY_CONTRACT_ID" 2>/dev/null || read_env "SOUL_REAPER_REGISTRY_CONTRACT_ID")
NOTIFICATIONS_ID=$(cat "$TMP_DIR/NOTIFICATIONS_CONTRACT_ID" 2>/dev/null || read_env "NOTIFICATIONS_CONTRACT_ID")

[ -n "$VAULT_ID" ] && update_env "CONTRACT_ID" "$VAULT_ID"

# ─── 8. Initialize contracts ──────────────────────────────────────
echo ""
echo -e "${YELLOW}━━━ Contract Initialization (Parallel) ━━━${NC}"

init_contract "Vault" "$VAULT_ID" &
init_contract "Mission Registry" "$REGISTRY_ID" &
init_contract "Escrow" "$ESCROW_ID" &
init_contract "Reiatsu Token" "$REIATSU_ID" &
init_contract "Soul Badge" "$SOUL_BADGE_ID" &
init_contract "Soul Reaper Registry" "$SOUL_REAPER_ID" &

# Treasury and Notifications have special args/logic
if [ -n "$TREASURY_ID" ]; then
    (
    output=$(stellar contract invoke --id "$TREASURY_ID" --network testnet --source admin -- initialize --admin "$ADMIN_ADDR" --multi_sig_threshold 2 --required_approvals 2 2>&1) && {
        echo -e "${GREEN}✓ Treasury initialized${NC}"
    } || {
        if echo "$output" | grep -qi "already initialized\|Already initialized\|UnreachableCodeReached"; then
            echo -e "${GREEN}✓ Treasury (already initialized)${NC}"
        else
            echo -e "${YELLOW}⚠ Treasury init warning: $output${NC}"
        fi
    }
    ) &
fi

if [ -n "$NOTIFICATIONS_ID" ]; then
    (
    output=$(stellar contract invoke --id "$NOTIFICATIONS_ID" --network testnet --source admin -- initialize 2>&1) && {
        echo -e "${GREEN}✓ Notifications initialized${NC}"
    } || {
        if echo "$output" | grep -qi "already initialized\|Already initialized\|UnreachableCodeReached"; then
            echo -e "${GREEN}✓ Notifications (already initialized)${NC}"
        else
            echo -e "${YELLOW}⚠ Notifications init warning: $output${NC}"
        fi
    }
    ) &
fi

wait

# ─── 9. Summary ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}🎉 Deployment complete${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Vault:              ${CYAN}${VAULT_ID:-N/A}${NC}"
echo -e "  Mission Registry:   ${CYAN}${REGISTRY_ID:-N/A}${NC}"
echo -e "  Escrow:             ${CYAN}${ESCROW_ID:-N/A}${NC}"
echo -e "  Reiatsu Token:      ${CYAN}${REIATSU_ID:-N/A}${NC}"
echo -e "  Soul Badge:         ${CYAN}${SOUL_BADGE_ID:-N/A}${NC}"
echo -e "  Treasury:           ${CYAN}${TREASURY_ID:-N/A}${NC}"
echo -e "  Soul Reaper Reg.:   ${CYAN}${SOUL_REAPER_ID:-N/A}${NC}"
echo -e "  Notifications:      ${CYAN}${NOTIFICATIONS_ID:-N/A}${NC}"
echo -e "  Admin:              ${CYAN}${ADMIN_ADDR}${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}  .env updated: ${ENV_FILE}${NC}"
echo -e ""
echo -e "  ${YELLOW}Tips:${NC}"
echo -e "    Re-initialize only:  ${CYAN}./deploy_contract.sh --init-only${NC}"
echo -e "    Force fresh deploy:  ${CYAN}./deploy_contract.sh --force${NC}"
