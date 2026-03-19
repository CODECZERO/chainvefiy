#!/bin/bash
# Create 50 logical commits with proper messages and push each.
# Run from repo root. Requires: git_write, network.
set -e
cd "$(dirname "$0")/.."

commit_one() {
  local files="$1"
  local msg="$2"
  git add $files
  git diff --cached --quiet && return 0
  git commit -m "$msg"
  git push origin main
}

# 1-10
commit_one ".github/workflows/ci.yml" "ci: update workflow with contract IDs and frontend Playwright"
commit_one "README.md" "docs: add Level 2/3/4 checklists and deployed contract addresses"
commit_one "deploy_contract.sh" "chore: fix deploy script (rustup default, treasury wasm, stderr, quoted IDs)"
commit_one "frontend/app/layout.tsx" "feat(frontend): add viewport meta for mobile responsiveness"
commit_one "frontend/app/page.tsx" "feat(frontend): responsive hero and stats on home page"
commit_one "frontend/app/test-donation/page.tsx" "fix(frontend): test-donation page updates"
commit_one "frontend/components/chart-wrapper.tsx" "fix(frontend): chart-wrapper component"
commit_one "frontend/components/donation-modal.tsx" "fix(frontend): donation-modal component"
commit_one "frontend/components/header.tsx" "feat(frontend): responsive header with mobile menu (Sheet)"
commit_one "frontend/components/simple-donate-modal.tsx" "fix(frontend): simple-donate-modal component"

# 11-20
commit_one "frontend/components/ui/chart.tsx" "fix(frontend): ui chart component"
commit_one "frontend/components/user-wallet-connector.tsx" "fix(frontend): user-wallet-connector"
commit_one "frontend/components/wallet-transfer-modal.tsx" "fix(frontend): wallet-transfer-modal"
commit_one "frontend/hooks/use-account.ts" "fix(frontend): use-account hook"
commit_one "frontend/hooks/use-wallet.ts" "fix(frontend): use-wallet hook"
commit_one "frontend/lib/api-service.ts" "fix(frontend): api-service"
commit_one "frontend/lib/logger.ts" "fix(frontend): logger util"
commit_one "frontend/lib/wallet-context.tsx" "fix(frontend): wallet-context"
commit_one "frontend/lib/wallet-utils.ts" "fix(frontend): wallet-utils"
commit_one "frontend/package.json" "chore(frontend): add test and test:install scripts"

# 21-30
commit_one "frontend/playwright.config.ts" "chore(frontend): playwright config"
commit_one "frontend/tests/e2e.spec.ts" "test(frontend): e2e visitor flow"
commit_one "frontend/tests/navigation.spec.ts" "test(frontend): navigation tests, resilient Connect button"
commit_one "frontend/tsconfig.json" "chore(frontend): tsconfig"
commit_one "server/.env.example" "docs(server): env example with contract vars"
commit_one "server/jest.config.ts" "chore(server): jest config ignore dist"
commit_one "server/src/__tests__/integration.test.ts" "test(server): integration tests with mocks and routes"
commit_one "server/src/app.ts" "fix(server): app test delay route"
commit_one "server/src/controler/stellar.controler.ts" "fix(server): stellar controller validate account ID"
commit_one "server/src/index.ts" "fix(server): graceful shutdown and PORT"

# 31-40
commit_one "server/src/midelware/fileUpload.midelware.ts" "fix(server): fileUpload middleware"
commit_one "server/src/routes/community.routes.ts" "fix(server): community routes"
commit_one "server/src/routes/index.routes.ts" "fix(server): index routes"
commit_one "server/src/services/stellar/escrow.service.ts" "fix(server): escrow service"
commit_one "server/src/services/stellar/seireiteiVault.service.ts" "fix(server): seireitei vault service"
commit_one "server/src/services/stellar/transaction.history.stellar.ts" "fix(server): transaction history return [] on Horizon 400"
commit_one "server/src/util/apiResponse.util.ts" "fix(server): apiResponse BigInt serialization"
commit_one "server/src/util/asyncHandler.util.ts" "fix(server): asyncHandler log levels"
commit_one "server/src/util/compressionLogger.ts" "fix(server): compressionLogger"
commit_one "smartContract/Cargo.lock" "chore(smartContract): Cargo.lock"

# 41-50
commit_one "smartContract/contracts/soul-badge/test_snapshots/test/test_leaderboard.1.json smartContract/contracts/soul-badge/test_snapshots/test/test_mint_badge.1.json smartContract/contracts/soul-badge/test_snapshots/test/test_revoke_badge.1.json smartContract/contracts/soul-badge/test_snapshots/test/test_tier_progression.1.json" "chore(smartContract): soul-badge test snapshots"
commit_one "frontend/tests/features.spec.ts" "test(frontend): remove Create Post test (requires server+Pinata)"
commit_one "frontend/tests/contracts.spec.ts" "test(frontend): contract-related UI tests"
commit_one "server/__mocks__/multiformats.js" "test(server): add multiformats mock for Jest"
commit_one "server/src/__tests__/contracts.routes.test.ts" "test(server): contract routes API tests"
commit_one "server/src/__tests__/extended_integration.test.ts" "test(server): extended integration tests"
commit_one "server/src/__tests__/server.realtime.test.ts" "test(server): server realtime and close tests"
commit_one "server/src/controler/contracts/" "feat(server): contract controllers (escrow,vault,notifications,etc)"
commit_one "server/src/routes/contracts/" "feat(server): contract routes"
commit_one "server/src/services/stellar/mission-registry.service.ts server/src/services/stellar/notifications.service.ts server/src/services/stellar/reiatsu-token.service.ts server/src/services/stellar/soul-badge.service.ts server/src/services/stellar/soul-reaper-registry.service.ts server/src/services/stellar/treasury.service.ts" "feat(server): stellar contract services (mission-registry, notifications, token, badge, treasury)"
commit_one "smartContract/contracts/notifications/ frontend/lib/services/contracts/" "feat: notifications contract (Rust) and frontend contract service clients"

echo "Done: 50 commits pushed."
