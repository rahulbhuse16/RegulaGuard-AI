# RegulaGuard AI: frontend

React + Vite + TypeScript + Tailwind v4 client for the FastAPI compliance backend. The product name is configurable through `VITE_PRODUCT_NAME`.

## Run

```powershell
cd regulaguard-frontend
copy .env.example .env      # VITE_API_BASE_URL defaults to http://localhost:8000/api/v1
npm install
npm run dev                 # http://localhost:5173
```

The backend must be running, and its `CORS_ORIGINS` must include `http://localhost:5173` (the default in `.env.example`).

## Structure

`src/api` typed API layer (one module per backend area, shared axios client with token refresh and normalized `ApiError`), `src/types` enums and entities that mirror the backend, `src/components/ui` design system, `src/layouts` app shell and navigation, `src/pages` one file per screen, `src/routes` router and role guard.

## How AI output is presented

- Every AI-derived value shows a confidence indicator and an expandable "Why / Sources" section.
- Suggestions carry a review state (pending, approved, rejected, modified) and are changed only through explicit confirm dialogs that record a note.
- Simulation results carry a permanent banner saying they are scenario analysis, not actual status.
- Risk scores and priorities are displayed exactly as the backend returns them. Nothing is computed in the browser.
- Role checks hide actions and pages, but the backend stays the authority on authorization.

## Status against the spec

Built and wired to real endpoints: login and registration, dashboard, regulations and versions, document upload with lifecycle and polling, obligations with extract and review, control mapping with review, control assessments, evidence assessments, gaps, risk prioritization, remediation with review, impact analysis with execution timeline, what-if simulation, cross-regulation, contradictions with review, agent activity with step drill-down, audit trail, monitoring.

## Not possible yet: missing backend endpoints

These screens or fields need a backend read endpoint that does not exist, so they show an explanation or ask for a pasted ID instead of using invented data:

- Regulatory changes list and side-by-side version diff (the page is a placeholder; Impact analysis takes a change ID)
- Policies and controls list and create (Control assessments takes a control ID)
- Evidence list (Evidence takes an evidence ID)
- Products and business units list (Simulation takes optional IDs)
- Source citations per obligation (stored by the backend, not exposed)
- Global search across all areas
- Live event stream for agent runs (the app polls instead)
- Separate likelihood and impact values per gap (so no likelihood-by-impact matrix)
- Users and roles management, and a per-user name lookup for audit entries (IDs are shown)

## Not done

Multi-select filters, drawer panels, gap aging and regulatory change trend charts (they need dated data from the API), and automated tests. The app has been type-checked and production-built, but not yet exercised against the live backend in a browser.
