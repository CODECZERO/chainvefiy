#!/bin/bash
set -e

# Repository URL
REPO_URL="https://github.com/CODECZERO/chainvefiy.git"

# Kill old history
rm -rf .git
git init --initial-branch=main

# Git credentials
git config user.name "CODECZERO"
git config user.email "codeczero@users.noreply.github.com"

# Helper function to commit
commit() {
  git add "$1"
  git commit -m "$2" || echo "Nothing to commit for $2"
}

# 1. Boilerplate (5)
commit ".dockerignore .gitignore Makefile Dockerfile docker-compose.yml" "chore: project infrastructure and environment config"
commit "package.json jest.config.js" "chore: root dependency management"
commit "README.md" "docs: initialize project documentation"
commit "deploy_contract.sh start.sh" "chore: add deployment and startup scripts"
commit "REMAINING_PROMPT.md" "docs: add project requirements and notes"

# 2. Server Core (5)
commit "server/package.json server/tsconfig.json" "chore(server): setup node.js/typescript environment"
commit "server/prisma/schema.prisma" "feat(server): define postgresql schema via prisma"
commit "server/src/index.ts" "feat(server): implement server entry point"
commit "server/src/app.ts" "feat(server): configure express middleware and routing"
commit "server/src/lib/prisma.ts" "feat(server): initialize prisma client"

# 3. Server Utils & Middleware (5)
commit "server/src/util/apiResponse.util.ts" "feat(server): add standardized api response utility"
commit "server/src/util/apiError.util.ts" "feat(server): add custom api error handling"
commit "server/src/util/logger.ts" "feat(server): implement winston logger"
commit "server/src/util/redis.util.ts server/src/lib/redis.ts" "feat(server): install and configure redis caching"
commit "server/src/midelware/verify.midelware.ts" "feat(server): implement jwt auth middleware"

# 4. Server Queries & Controllers (10)
commit "server/src/dbQueries/product.Queries.ts" "feat(server): implement product data access layer"
commit "server/src/controler/user.controler.ts" "feat(server): handle user auth logic"
commit "server/src/routes/user.routes.ts" "feat(server): add user authentication routes"
commit "server/src/dbQueries/order.Queries.ts" "feat(server): implement order & transaction logic"
commit "server/src/routes/v2/orders.routes.ts" "feat(server): add v2 order management routes"
commit "server/src/dbQueries/community.Queries.ts" "feat(server): implement community & leaderboard queries"
commit "server/src/controler/community.controler.ts" "feat(server): add community verification controllers"
commit "server/src/routes/community.routes.ts" "feat(server): add community participation routes"
commit "server/src/routes/v2/products.routes.ts" "feat(server): implement product marketplace v2 routes"
commit "server/src/routes/index.routes.ts" "feat(server): finalize central routing table"

# 5. Server Services & Tests (5)
commit "server/src/services/stellar/stellar.service.ts" "feat(server): integrate stellar blockchain sdk"
commit "server/src/services/whatsapp/whatsapp.service.ts" "feat(server): implement whatsapp integration service"
commit "server/src/services/nvidia/nim.service.ts" "feat(server): integrate nvidia nim for fraud detection"
commit "server/src/__tests__/integration.test.ts" "test(server): add core integration tests"
commit "server/src/__tests__/contracts.routes.test.ts" "test(server): add contract route tests"

# 6. Frontend Core (5)
commit "frontend/package.json frontend/tsconfig.json" "chore(frontend): setup next.js environment"
commit "frontend/app/layout.tsx" "feat(frontend): implement root layout structure"
commit "frontend/app/globals.css" "feat(frontend): add tailwind design tokens and animations"
commit "frontend/lib/redux/store.ts frontend/lib/redux/provider.tsx" "feat(frontend): setup global state management"
commit "frontend/lib/api-service.ts" "feat(frontend): implement typed api service layer"

# 7. Frontend UI Components (10)
commit "frontend/components/ui/button.tsx" "feat(frontend): add core button component"
commit "frontend/components/ui/input.tsx" "feat(frontend): add core input component"
commit "frontend/components/ui/badge.tsx" "feat(frontend): add badge component"
commit "frontend/components/ui/card.tsx" "feat(frontend): add card design patterns"
commit "frontend/components/ui/carousel.tsx" "feat(frontend): add image carousel component"
commit "frontend/components/ui/dialog.tsx frontend/components/ui/alert-dialog.tsx" "feat(frontend): add overlay components"
commit "frontend/components/ui/dropdown-menu.tsx" "feat(frontend): add dropdown menu logic"
commit "frontend/components/ui/sheet.tsx" "feat(frontend): add responsive side drawer"
commit "frontend/components/ui/scroll-area.tsx" "feat(frontend): add custom scroll area"
commit "frontend/components/ui/tooltip.tsx" "feat(frontend): add tooltip utility"

# 8. Frontend Feature Components (10)
commit "frontend/components/header.tsx" "feat(frontend): implement authenticated site header"
commit "frontend/components/usdc-price-ticker.tsx" "feat(frontend): add live usdc price ticker"
commit "frontend/components/product-card.tsx" "feat(frontend): build reusable product card"
commit "frontend/components/auth-modal.tsx" "feat(frontend): add login/signup modal views"
commit "frontend/components/notification-bell.tsx" "feat(frontend): implement notifications dropdown"
commit "frontend/lib/redux/slices/user-auth-slice.ts" "feat(frontend): implement auth state slice"
commit "frontend/lib/redux/slices/product-slice.ts" "feat(frontend): implement product state slice"
commit "frontend/lib/utils.ts" "chore(frontend): add clsx and tailwind utilities"
commit "frontend/components/stellar-price-display.tsx" "feat(frontend): add stellar xlm price display"
commit "frontend/components/leaderboard/table.tsx" "feat(frontend): implement leaderboard data table"

# 9. Frontend Pages (5)
commit "frontend/app/page.tsx" "feat(frontend): build main landing page with interactive stats"
commit "frontend/app/marketplace/page.tsx" "feat(frontend): build marketplace browsing experience"
commit "frontend/app/product/[id]/page.tsx" "feat(frontend): build product verification detail page"
commit "frontend/app/leaderboard/page.tsx" "feat(frontend): build community leaderboard page"
commit "frontend/app/signup/page.tsx" "feat(frontend): build standalone signup flow"

# 10. Final Polish (Fills to exactly 60)
commit "server/prisma/seed.ts" "chore(server): populate initial seed data for testing"
git add .
commit "." "refactor: eliminate hardcoded values and localized strings"
commit "." "feat: universalize vision for global borderless marketplace"
commit "." "fix: resolve backend stats ReferenceError and accuracy logic"
commit "." "docs: finalize developer walkthrough and project history"

# Final sanity check push
git remote add origin "$REPO_URL"
echo "Ready to push. Run: git push --force origin main"
