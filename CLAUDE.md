# CLAUDE.md — MAKELOOP

Guidance for Claude Code working in this repository. Read this fully before generating or changing code. When something here conflicts with a request, surface the conflict instead of silently overriding it.

---

## 0. Assumptions to confirm (change here if wrong)

The TRD leaves these open; I picked defaults. Edit this block and the rest follows.

- **Repo shape (decided):** **one Next.js app** in `makeloop/` with route handlers as the backend — a single deployable on Vercel. Module boundaries live in `makeloop/src/server/` (one file/folder per domain). The earlier monorepo + NestJS + Railway option was dropped so the whole product hosts on Vercel.
- **ORM / migrations:** **Prisma 6**.
- **AI/Vision provider:** provider-agnostic, any OpenAI-compatible `/chat/completions` endpoint configured via env. No provider name is hardcoded. With no key (or `DEMO_MODE=true`) a deterministic demo evaluator is used.
- **Deploy target:** **Vercel** (app) + **Neon Postgres** and **Vercel Blob** via the Vercel Marketplace. See §11.
- **Package manager:** pnpm. **Node:** 20+.

---

## 1. What this is

MAKELOOP is a children's build-and-learn app: a child gets a physical **mission** ("build a bridge that holds 1kg"), builds it with real materials, photographs it, and an **AI vision + LLM pipeline** returns child-friendly, advisory feedback and progressive hints. They iterate and improvement is recorded. Parents own accounts; children use profiles under a parent.

**Guiding principle (non-negotiable): Reliability > Complexity.** A small system that reliably demonstrates `Challenge → Build → AI Feedback → Improve` beats a large system with unfinished features. **Do not introduce microservices.** This is a **modular monolith**.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Web | Next.js (App Router) + React + TypeScript |
| API | Next.js route handlers + TypeScript (modular monolith in `src/server/`) |
| DB | PostgreSQL + Prisma |
| Auth | Email/password for parents; child profiles linked to parent (no independent child accounts) |
| AI | LLM API — personalization, hints, explanations, feedback, mission generation |
| Vision | Vision-capable model — image analysis, returns structured JSON |
| Storage | Vercel Blob for uploaded images (inline data URLs locally when no Blob token) |

TypeScript everywhere. No JavaScript source files.

---

## 3. Repository layout

```
CLAUDE.md
makeloop/                    # the app (Vercel project root)
├── prisma/                  # schema.prisma, migrations/, seed.ts
└── src/
    ├── proxy.ts             # auth gate for /api/* (except auth, health), /dashboard, /play
    ├── shared/              # shared TS types + zod schemas (AI I/O contract, upload limits)
    ├── server/              # modular monolith — domain services
    │   ├── auth.ts  children.ts  missions.ts  attempts.ts
    │   ├── progress.ts  achievements.ts  analytics.ts
    │   ├── storage.ts  rate-limit.ts  http.ts  db.ts
    │   └── ai/              # provider adapter, vision pipeline, feedback translator, safety layer, demo evaluator
    ├── app/api/...          # thin route handlers → server services (exactly the §6 routes + /api/health)
    ├── app/dashboard/...    # parent UI
    ├── app/play/...         # child UI
    └── components/
```

Keep each domain in its own `src/server` module. Route handlers stay thin; cross-domain calls go through exported service functions, never direct table access from another domain's module.

---

## 4. Commands

Run from repo root. Prefer these over ad-hoc invocations.

Run from `makeloop/`.

```bash
pnpm install
pnpm dev                     # app (UI + API) in watch mode
pnpm build                   # prisma generate + next build
pnpm lint                    # eslint
pnpm typecheck               # tsc --noEmit
pnpm test                    # vitest unit tests

# Local Postgres (one-time)
docker run -d --name makeloop-pg -e POSTGRES_USER=makeloop -e POSTGRES_PASSWORD=makeloop -e POSTGRES_DB=makeloop_app -p 55432:5432 postgres:16-alpine

# Database (makeloop/prisma)
pnpm db:migrate              # create/apply migrations (dev)
pnpm db:deploy               # apply migrations (prod)
pnpm db:generate             # regenerate Prisma client
pnpm db:studio               # inspect data
pnpm db:seed                 # seed missions/materials/skills for demo
```

**After any change to the Prisma schema, run `pnpm db:generate`.** Before opening a PR or declaring a task done, run `pnpm lint && pnpm typecheck && pnpm test` and fix what breaks — do not report success with a failing check.

---

## 5. Data model

Prisma models live in `makeloop/prisma/schema.prisma`. Tables (see TRD §6 for fields): `users`, `child_profiles`, `missions`, `materials`, `mission_materials`, `attempts`, `skills`, `child_skills`, `achievements`.

Rules:
- `users.role` distinguishes parent/admin. Children are **profiles**, not users.
- `attempts` carry `attempt_number` per (child, mission), `image_url`, `result`, `ai_feedback`, `created_at`.
- Passwords stored only as `password_hash` (bcrypt/argon2). Never store plaintext.
- Filter missions by child `age` against `missions.min_age`/`max_age`.

---

## 6. API surface (see TRD §7)

Namespaced under `/api`. Implement exactly these routes for the MVP; don't invent extras.

```
POST /api/auth/register | login | logout
POST/GET/PATCH /api/children , GET /api/children/:id
GET /api/missions , GET /api/missions/:id , POST /api/missions/:id/start
POST/GET /api/missions/:id/attempts , GET /api/attempts/:id
POST /api/ai/evaluate-build | hint | explain
GET /api/children/:id/progress , GET /api/children/:id/achievements
```

All non-auth routes sit behind auth middleware. A parent may only access their own children and those children's data — enforce ownership checks, not just authentication.

---

## 7. AI pipeline (see TRD §8)

`Image upload → validation → mission context retrieval → vision model → structured observation → validation layer → feedback generator → child-friendly response → DB → UI`.

- The **AI receives structured context**, never raw database access. Build a typed payload (mission requirements, expected object, child age/skill) in the `ai` module.
- Vision output is **advisory**, not measurement. Model the internal contract as JSON (`build_detected`, `mission_relevant`, `observations[]`, `confidence`, `suggested_hint`) in `packages/shared`, then translate to child-facing text.
- **Low confidence → hedge, don't assert.** Return guidance like asking for another photo from a different angle rather than a confident verdict.
- Hints are **progressive**: level 1 a question, level 2 a concept, level 3 direct. Track which level the child is on per attempt.

### AI safety — enforce in the `ai` module, not just prompts
- Age-appropriate language only.
- Never give unsafe construction instructions or encourage dangerous experiments.
- Never request or store unnecessary/sensitive personal info from a child.
- No medical or psychological assessments.
- Never claim certainty when analysis is uncertain.

---

## 8. Security (hard requirements — TRD §10)

- Hash passwords; HTTPS only.
- Validate every upload: **type** (JPG/JPEG/PNG/WEBP) and **size** (≤10 MB) server-side, not just client.
- Protect all endpoints with auth middleware; apply **rate limits to AI endpoints**.
- API keys and DB credentials stay **server-side**, loaded from env. Never expose them to the client bundle, never commit them. `.env` is gitignored; keep `.env.example` current.

## 9. Privacy — this is a children's product (TRD §11)

- Parent-controlled accounts. Minimize child data; collect nothing that isn't needed.
- No public child profiles. **No child-to-child social features, no public messaging in the MVP** — do not add them even if convenient.
- Implement an image retention/deletion policy before launch; wire the deletion path even if retention is generous during the pilot.

---

## 10. Build order (TRD §18 — follow these phases)

1. **Core:** auth, child profile, mission DB + seed, mission UI.
2. **Experimentation:** attempt submission, image upload, attempt history.
3. **AI:** vision analysis, hints, feedback.
4. **Progress:** skills, achievements, parent dashboard.
5. **Demo polish:** flow, error states, mobile responsiveness, demo mode.

Don't jump ahead to phase 3 AI work before phases 1–2 are solid — the demo depends on the loop working end to end. Ship each phase runnable.

### Error/loading states to implement (TRD §13)
Camera failure → offer upload. Blurry image → ask for retake. AI unavailable → save the attempt, retry later ("your invention is saved"). Offline → reassure nothing is lost. Always show a loading state during AI processing (target <15s).

### Analytics (TRD §15)
Emit these events where they occur: `USER_REGISTERED, CHILD_PROFILE_CREATED, MISSION_VIEWED, MISSION_STARTED, ATTEMPT_CREATED, IMAGE_SUBMITTED, AI_FEEDBACK_RECEIVED, HINT_REQUESTED, MISSION_COMPLETED, ACHIEVEMENT_UNLOCKED`.

---

## 11. Deploy

Target: **Vercel** (single Next.js project `makeloop`, root directory `makeloop/`) with **Neon Postgres** and **Vercel Blob** from the Vercel Marketplace. Same origin for UI and API, so no CORS config.

**Env vars** (never hardcode; set with `vercel env add` or the dashboard, mirror in `makeloop/.env.example`):
```
DATABASE_URL= DATABASE_URL_UNPOOLED=   # set by the Neon integration
BLOB_READ_WRITE_TOKEN=                 # set by the Blob store connection
JWT_SECRET=                            # 32+ random chars
LLM_API_BASE= LLM_API_KEY= LLM_MODEL= VISION_MODEL=   # optional; OpenAI-compatible endpoint
DEMO_MODE=                             # "true" → deterministic demo evaluator
```

**Steps:**
1. `vercel link`, add the Neon integration and a Blob store to the project, set `JWT_SECRET` (+ AI vars when ready).
2. Deploy: `vercel deploy --prod`. The `vercel-build` script runs `prisma generate && prisma migrate deploy && next build`.
3. Seed once: `vercel env pull .env.production.local --environment production`, then `DATABASE_URL=… pnpm db:seed` (add `SEED_DEMO_PASSWORD=…` to create the stage demo account `demo@makeloop.app`).
4. Check `/api/health`, then smoke-test the full loop on the deployed URL: register → child profile → start mission → upload photo → get feedback → second attempt shows improvement.

Uploads: Vercel functions cap request bodies at ~4.5 MB, so the client downscales photos to ≤1600px JPEG before upload; the server still enforces type + ≤10 MB. Image retention: `pnpm images:purge [days]` (default 90) deletes stored photos and keeps attempt records.

**Performance targets to hold** (TRD §12): page load <3s, non-AI API <1s, upload <5s, AI feedback <15s with a visible loading state.

---

## 12. Definition of done (MVP — TRD §16)

Parent registers and creates a child profile · child selects and starts a mission showing materials + objective · child uploads/takes a photo stored securely · AI receives mission context, analyzes the image, returns useful feedback · child submits another attempt, history is visible, improvement recorded · completed missions and basic skills/progress display.

The **live demo** (TRD §19) is ~2–3 minutes and must show a real interaction, not a simulation: select profile → start → materials → build → upload → AI analyzes → hint → modify → second attempt → show improvement. Keep a reliable **demo mode** path that won't fail on stage.
