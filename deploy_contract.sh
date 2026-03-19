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

# ─── 7. Deploy each contract ─────────────────────────────────────
# deploy_or_reuse NAME WASM_FILE ENV_KEY
# - If env has an existing ID and --force is not set, reuse it
# - Otherwise deploy fresh and update .env
deploy_or_reuse() {
    local name=$1
    local wasm=$2
    local env_key=$3

    # Check for existing ID
    local existing
    existing=$(read_env "$env_key")

    if [ -n "$existing" ] && [ "$FORCE" != "true" ]; then
        echo -e "${GREEN}✓ Reusing $name: ${CYAN}$existing${NC}" >&2
        echo "$existing"
        return
    fi

    if [ "$INIT_ONLY" = "true" ]; then
        if [ -n "$existing" ]; then
            echo -e "${GREEN}✓ Using existing $name: ${CYAN}$existing${NC}" >&2
            echo "$existing"
            return
        else
            echo -e "${RED}✗ No existing ID for $name and --init-only mode. Skipping.${NC}" >&2
            echo ""
            return
        fi
    fi

    if [ ! -f "$wasm" ]; then
        echo -e "${RED}✗ WASM not found: $wasm${NC}" >&2
        echo ""
        return
    fi

    echo -e "${YELLOW}Deploying $name...${NC}" >&2
    local id
    id=$(stellar contract deploy --wasm "$wasm" --source admin --network testnet 2>&1 | tail -n 1)

    if [ -z "$id" ] || [[ "$id" == *"error"* ]] || [[ "$id" == *"Error"* ]]; then
        echo -e "${RED}✗ Deploy failed for $name: $id${NC}" >&2
        echo ""
        return
    fi

    echo -e "${GREEN}✓ Deployed $name: ${CYAN}$id${NC}" >&2
    # Update .env immediately
    update_env "$env_key" "$id"
    echo "$id"
}

if [ "$INIT_ONLY" != "true" ] || [ "$FORCE" = "true" ]; then
    echo -e "${YELLOW}━━━ Contract Deployment ━━━${NC}"
else
    echo -e "${YELLOW}━━━ Reading Contract IDs ━━━${NC}"
fi

VAULT_ID=$(deploy_or_reuse "Seireitei Vault" "$RELEASE_DIR/seireitei_vault.wasm" "VAULT_CONTRACT_ID")
# CONTRACT_ID is an alias for VAULT_CONTRACT_ID
[ -n "$VAULT_ID" ] && update_env "CONTRACT_ID" "$VAULT_ID"

REGISTRY_ID=$(deploy_or_reuse "Mission Registry" "$RELEASE_DIR/mission_registry.wasm" "MISSION_REGISTRY_CONTRACT_ID")
ESCROW_ID=$(deploy_or_reuse "Escrow" "$RELEASE_DIR/escrow.wasm" "ESCROW_CONTRACT_ID")
REIATSU_ID=$(deploy_or_reuse "Reiatsu Token" "$RELEASE_DIR/reiatsu_token.wasm" "REIATSU_TOKEN_CONTRACT_ID")
SOUL_BADGE_ID=$(deploy_or_reuse "Soul Badge" "$RELEASE_DIR/soul_badge.wasm" "SOUL_BADGE_CONTRACT_ID")
TREASURY_ID=$(deploy_or_reuse "Treasury" "$RELEASE_DIR/division_treasury.wasm" "TREASURY_CONTRACT_ID")
SOUL_REAPER_ID=$(deploy_or_reuse "Soul Reaper Registry" "$RELEASE_DIR/soul_reaper_registry.wasm" "SOUL_REAPER_REGISTRY_CONTRACT_ID")
NOTIFICATIONS_ID=$(deploy_or_reuse "Notifications" "$RELEASE_DIR/notifications.wasm" "NOTIFICATIONS_CONTRACT_ID")

# ─── 8. Initialize contracts ──────────────────────────────────────
# Uses || true so "already initialized" doesn't abort the script.
echo ""
echo -e "${YELLOW}━━━ Contract Initialization ━━━${NC}"

init_contract() {
    local name=$1
    local id=$2
    shift 2
    local extra_args=("$@")

    if [ -z "$id" ]; then
        echo -e "${RED}✗ Skipping $name (no contract ID)${NC}"
        return
    fi

    local output
    output=$(stellar contract invoke --id "$id" --network testnet --source admin -- initialize --admin "$ADMIN_ADDR" "${extra_args[@]}" 2>&1) && {
        echo -e "${GREEN}✓ $name initialized${NC}"
    } || {
        if echo "$output" | grep -qi "already initialized\|Already initialized"; then
            echo -e "${GREEN}✓ $name (already initialized)${NC}"
        else
            echo -e "${YELLOW}⚠ $name init warning: $output${NC}"
        fi
    }
}

init_contract "Vault" "$VAULT_ID"
init_contract "Mission Registry" "$REGISTRY_ID"
init_contract "Escrow" "$ESCROW_ID"
init_contract "Reiatsu Token" "$REIATSU_ID"
init_contract "Soul Badge" "$SOUL_BADGE_ID"

# Treasury has extra args
if [ -n "$TREASURY_ID" ]; then
    output=$(stellar contract invoke --id "$TREASURY_ID" --network testnet --source admin -- initialize --admin "$ADMIN_ADDR" --multi_sig_threshold 2 --required_approvals 2 2>&1) && {
        echo -e "${GREEN}✓ Treasury initialized${NC}"
    } || {
        if echo "$output" | grep -qi "already initialized\|Already initialized"; then
            echo -e "${GREEN}✓ Treasury (already initialized)${NC}"
        else
            echo -e "${YELLOW}⚠ Treasury init warning: $output${NC}"
        fi
    }
fi

init_contract "Soul Reaper Registry" "$SOUL_REAPER_ID"

# Notifications: initialize() has no --admin arg
if [ -n "$NOTIFICATIONS_ID" ]; then
    output=$(stellar contract invoke --id "$NOTIFICATIONS_ID" --network testnet --source admin -- initialize 2>&1) && {
        echo -e "${GREEN}✓ Notifications initialized${NC}"
    } || {
        if echo "$output" | grep -qi "already initialized\|Already initialized"; then
            echo -e "${GREEN}✓ Notifications (already initialized)${NC}"
        else
            echo -e "${YELLOW}⚠ Notifications init warning: $output${NC}"
        fi
    }
fi

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
