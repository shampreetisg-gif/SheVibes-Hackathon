# CampusSync

CampusSync is a full-stack campus information and student engagement platform with verified announcements, academic planning, campus events, opportunities, clubs, issue reporting, and a staged AI assistant experience.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/campussync/src/App.tsx` — responsive application shell, routes, demo role session, and page UI.
- `artifacts/campussync/src/index.css` — CampusSync visual system and responsive styling.
- `lib/api-spec/openapi.yaml` — source of truth for the CampusSync API contract.
- `artifacts/api-server/src/routes/campus.ts` — API handlers backed by PostgreSQL.
- `lib/db/src/schema/campus.ts` — PostgreSQL tables and insert schema for campus data.

## Architecture decisions

- The first stage uses a demo role selector rather than real authentication or college credentials.
- The frontend consumes generated React Query hooks from the OpenAPI contract instead of hand-written fetch types.
- Campus content is seeded in the development database so the initial UI demonstrates real persisted data.
- Issue reports are persisted and immediately refreshed in the issues page after submission; the AI assistant is explicitly staged until its backend behavior is defined.

## Product

- Dashboard overview with announcement, deadline, opportunity, issue, event, and profile context.
- Searchable announcements, club directory, event calendar, deadlines, opportunities, and assignments views.
- Campus issue list with a working report form and persisted submissions.
- Responsive desktop/mobile navigation with a demo Student, Faculty, Club President, Club Vice President, and Administrator role selector.

## User preferences

- Build incrementally and keep unfinished major features honest rather than making non-functional buttons appear complete.

## Gotchas

- The API server is mounted at `/api`; the frontend uses the generated client and shared proxy rather than a Vite proxy.
- Artifact workflows provide `PORT` and `BASE_PATH`; run the managed workflow for preview instead of starting the frontend directly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
