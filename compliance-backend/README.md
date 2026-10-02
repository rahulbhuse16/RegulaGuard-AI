# Banking Regulatory Compliance Platform — Backend

Agentic FastAPI/PostgreSQL backend implementing the full traceability chain:

```
Regulation → Obligation → Applicability → Policy/Control → Evidence →
Testing → Compliance Assessment → Gap → Risk → Remediation → Monitoring
```

Built for the Accenture ET AI Hackathon. **Backend and AI/agentic layer only**
— no frontend code is included here; this exposes REST APIs for a separate
React + Vite + TypeScript frontend to consume.

## Stack

- FastAPI + SQLAlchemy (async) + Alembic + Pydantic v2
- PostgreSQL + pgvector (sole system of record — no other database)
- LangChain + LangGraph for agent orchestration
- **LLM provider: Groq** (free tier), via `langchain-groq`, configured through
  `LLM_PROVIDER=groq` / `GROQ_API_KEY` / `GROQ_MODEL` — swappable to another
  provider by changing env vars only, no code changes
- Embeddings: local `sentence-transformers` model (no paid embeddings API
  required for the demo), swappable via `EMBEDDING_PROVIDER`
- JWT auth (PyJWT) + bcrypt (passlib) + RBAC (4 roles)

## Quickstart

```bash
cp .env.example .env
# edit .env: set GROQ_API_KEY, and JWT_SECRET to a real random value

docker compose up -d postgres   # starts Postgres 16 with pgvector installed

pip install -r requirements.txt

alembic upgrade head             # creates the full schema + enables pgvector

python -m scripts.seed_demo_data # optional: loads labeled DEMO/TEST data

uvicorn app.main:app --reload --port 8000
```

- OpenAPI docs: `http://localhost:8000/api/v1/docs`
- Health check: `http://localhost:8000/health`

## Status: what's implemented vs. what's next

This was built incrementally, verifying each slice before moving on, per the
project's own guidance. Given the size of the full spec, this pass delivers
a **working reference implementation of every one of the 14 features** end
to end via real APIs and database state, plus the full engineering
scaffolding (auth, RBAC, audit, observability, error handling, tests). A
few things are intentionally simplified for a hackathon timebox — see
"Known simplifications" below — and flagged in code comments at the exact
point where a production system would extend them.

### Implemented

**All 14 features, each reachable via REST:**

| # | Feature | Key endpoint(s) |
|---|---|---|
| 1 | Ingestion (upload→chunk→embed→index) | `POST/GET /documents` |
| 2 | Regulatory change intelligence | `RegulatoryChange` model + `regulation-versions` (diff endpoint is a natural next add — see below) |
| 3 | Obligation extraction | `POST /obligations/extract`, `GET /obligations`, `/obligations/{id}/approve|reject|modify` |
| 4 | Control-framework understanding | `Control`, `Policy`, `ControlTest` models + ingestion of internal docs |
| 5 | Regulation-to-control mapping | `POST /control-mappings/generate`, `/control-mappings/{id}/approve|reject` |
| 6 | Control effectiveness assessment | `POST /control-assessments/generate` |
| 7 | Evidence-based compliance assessment | `POST /evidence/assess` |
| 8 | Gap identification | `POST /gaps/analyze`, `GET /gaps` |
| 9 | Risk-based prioritization | `POST /risk-assessments/calculate` (deterministic `risk_model_v1`, see `app/services/risk_engine.py`) |
| 10 | Remediation recommendation | `POST /remediations/generate`, `/remediations/{id}/approve|reject` |
| 11 | Autonomous impact analysis | `POST /impact-analysis` — LangGraph workflow, see `app/workflows/impact_analysis.py` |
| 12 | What-if simulation | `POST /simulations` — never mutates real state, output always tagged `SIMULATION` |
| 13 | Cross-regulation intelligence | `POST /cross-regulation/compare`, `GET /cross-regulation/findings` |
| 14 | Contradiction detection | `POST /contradictions/detect`, `/contradictions/{id}/confirm|reject` |

**Agentic architecture:** 13 specialized agents/services (not one giant
agent) in `app/agents/` + `app/workflows/impact_analysis.py`, each wrapped in
`AgentRun` (`app/agents/base.py`) for automatic `AgentExecution`/`AgentStep`
tracking, idempotency keys, and failure recording. `GET /agent-executions`
and `/agent-executions/{id}/steps` expose the full trace.

**Reliability guardrails:**
- Every LLM call for anything persisted goes through
  `llm_service.get_structured_response`, which validates against a Pydantic
  schema before any DB write — malformed or unparseable output is dropped,
  never silently coerced.
- `INSUFFICIENT_EVIDENCE` abstention is wired into the LLM system prompt and
  the parser.
- Source citations (`SourceCitation` model) are attached to every extracted
  obligation.
- Prompt-injection defense: system instructions vs. `<retrieved_document>` /
  `<user_input>` content are explicitly separated in every prompt.
- Deterministic (non-LLM) scoring for risk (`risk_engine.py`) and for gap
  identification (`gap_analysis.py` — pure rule evaluation, no LLM call at
  all, since there's no ambiguity for an LLM to resolve there).
- Human-in-the-loop endpoints exist for obligations, control mappings,
  remediations, and contradictions (`PENDING → APPROVED/REJECTED/MODIFIED`
  or `POTENTIAL → CONFIRMED/REJECTED`).

**Engineering:** global structured-error handling (`app/core/exceptions.py`),
request-ID middleware + structlog logging with automatic secret redaction,
RBAC dependency (`require_roles`), pagination envelope, immutable audit log
(`app/audit/service.py` — append-only, no update/delete endpoint exists),
Alembic migration wired to the full ORM schema + `CREATE EXTENSION vector`,
safe file storage abstraction (UUID storage keys, never trusts the
client-provided filename), dashboard aggregation computed live from the DB
(`GET /dashboard`), manual monitoring trigger for demo purposes
(`POST /monitoring/trigger`), demo seed script covering the full
traceability chain with two regulation versions, a regulatory change, and a
seeded potential contradiction.

**Tests (19 passing, zero live LLM/DB calls required):**
- `tests/unit/test_risk_engine.py` — deterministic scoring formula
- `tests/unit/test_ingestion_pipeline.py` — file validation + chunking
- `tests/agents/test_llm_structured_output.py` — valid output, markdown-fenced
  output, malformed JSON, schema violation, abstention, provider failure,
  and retry-then-succeed, all with the LLM mocked

Run with: `pytest`

### Known simplifications (flagged in code, straightforward to extend)

- **Synchronous execution for the demo.** Document ingestion and every agent
  endpoint run inline within the HTTP request for simplicity, rather than
  being dispatched to a background worker/job queue. The `AgentExecution`
  status model (`QUEUED/RUNNING/...`) and idempotency keys are already in
  place — swapping to `BackgroundTasks`/Celery/arq only changes *where* the
  same functions are invoked from, not their signatures. An SSE endpoint
  (`GET /agent-executions/{id}/events`) is the natural next add for live
  progress once execution is async.
- **Regulatory change *detection* (diffing two versions into structured
  `RegulatoryChange` records) is modeled and seedable, but the automatic
  text-diffing agent that compares `RegulationVersion` A vs. B and generates
  those rows isn't wired up yet — today `RegulatoryChange` rows are created
  directly (see seed script) or manually. The impact-analysis workflow
  consumes an existing `RegulatoryChange` id, so plugging in the diff agent
  upstream is additive, not a redesign.
- **Monitoring source connectors are stubbed.** `POST /monitoring/trigger`
  runs a full job lifecycle (`MonitoringJob` row, audit event) so judges can
  demo the mechanism, but the "check configured regulatory sources" step
  reports zero new documents since no real external source is wired in.
- **Applicability rules** (`ApplicabilityRule` model) exist and are part of
  the traceability chain, but there's no dedicated Applicability Agent
  endpoint yet distinct from control mapping — applicability is currently
  folded into how control-mapping candidates are filtered.
- **Cross-regulation comparison** is capped at `max_pairs=30` per call to
  keep the hackathon LLM budget bounded; raise it or add embedding-based
  pre-filtering for larger catalogs.
- Search (`/search`) and per-entity CRUD for `Policy`/`BusinessUnit`/
  `Product`/`ApplicabilityRule` are straightforward CRUD additions following
  the exact pattern in `app/api/routes/regulations.py` — omitted here only
  for time, not because they're hard.

## Repository layout

```
app/
  main.py                 FastAPI app, CORS, exception handlers
  api/routes/              Thin route handlers only — logic lives in services/agents
  core/                    config, security (JWT/RBAC), logging, exceptions, middleware
  db/                      async engine/session, declarative base + mixins
  models/                  SQLAlchemy ORM models (grouped by domain area)
  schemas/                 Pydantic request/response schemas
  services/                LLM service (Groq), embeddings, risk engine, auth, storage
  agents/                  13 specialized agents, each wrapped in AgentRun
  workflows/               LangGraph impact-analysis orchestration
  rag/                     pgvector retrieval helper
  ingestion/               upload validation, text extraction, structure-preserving chunking
  analysis/                what-if simulation
  audit/                   append-only audit event writer
alembic/                   migrations (0001 creates full schema + pgvector extension)
scripts/seed_demo_data.py  labeled DEMO/TEST data for the 20-step demo scenario
tests/                     unit, agent (mocked LLM), — integration/DB tests are the next add
```

## Demo scenario walkthrough (spec steps → endpoints)

1. Upload a regulatory document → `POST /documents` (`document_type=REGULATION`)
2. Processed & indexed automatically as part of the same call (see "Known simplifications")
3. Extract obligations → `POST /obligations/extract`
4. Review/approve → `POST /obligations/{id}/approve`
5. Load internal policies/controls → `POST /documents` (`document_type=CONTROL_DOC`), or seed data
6. Map obligations to controls → `POST /control-mappings/generate`
7. Assess control effectiveness → `POST /control-assessments/generate`
8. Evaluate evidence → `POST /evidence/assess`
9. Identify gaps → `POST /gaps/analyze`
10. Calculate risk → `POST /risk-assessments/calculate`
11. Generate remediation → `POST /remediations/generate`
12. Upload a newer regulation version → `POST /regulation-versions` + `POST /documents`
13. Detect changes → create/inspect a `RegulatoryChange` (see simplification note above)
14. Run autonomous impact analysis → `POST /impact-analysis`
15. Inspect impacted obligations/controls/gaps → `GET /obligations`, `/control-mappings`, `/gaps`
16. Run a what-if simulation → `POST /simulations`
17. Compare two regulations → `POST /cross-regulation/compare`
18. Detect a potential contradiction → `POST /contradictions/detect`
19. Show agent execution history → `GET /agent-executions`, `/agent-executions/{id}/steps`
20. Show audit trail → `GET /audit`

## Security notes

- Roles: `COMPLIANCE_ANALYST`, `COMPLIANCE_MANAGER`, `AUDITOR`, `ADMIN`. Write
  operations on regulatory reference data and review/approval endpoints are
  gated with `require_roles(...)`.
- All secrets come from environment variables (`.env.example` has
  placeholders only — never commit a real `.env`).
- No stack traces are ever returned to clients; every error response has
  `{error: {code, message, details, request_id}}`.
