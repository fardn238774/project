# AutoBD — web app

Real implementation of the AutoBD prototype (`../AutoBD Prototype.dc.html`).
The prototype is the visual/behavioural spec; this app rebuilds it against a
real Postgres database.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 7 · Neon
Postgres · Auth.js v5.

## Setup

```bash
npm install
cp .env.example .env      # then paste your Neon connection string
npx prisma migrate dev    # create tables
npx prisma db seed        # settings + demo data
npm run dev
```

Required env vars (see `.env.example`):

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | Auth.js session signing secret |

## ⚠️ Dev-only seeded accounts

**These are development credentials. Change or remove them before any real
deployment — do not ship them.**

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@autobd.test` | `AdminDev123!` |
| Buyer | `rafiul.buyer@autobd.test` | `testpass123` |
| Organization | `osaka.org@autobd.test` | `testpass123` |
| Organization | `yokohama.org@autobd.test` | `testpass123` |
| Organization | `tokyoline.org@autobd.test` | `testpass123` |
| Organization | `nagoya.org@autobd.test` | `testpass123` |

Admin accounts cannot self-register, so the admin above is created by the seed.

## Documented simplifications

These are deliberate, agreed deviations — not oversights.

### Auctions are platform-hosted

The FR doc describes bidding organizations acting as agents at **real Japanese
auction houses** (USS/TAA). Integrating with those auction houses' APIs is not
accessible for this project, so **the platform hosts the auction itself**: lots,
bids, countdown and settlement all live in this database, simulating the
agent-mediated process.

Consequences:

- Buyers bid directly. Organizations stay **advisory** (chat + the `Engagement`
  record of who they represent) and have **no bid path at all** — price can only
  move through a real buyer bid, so shill bidding is impossible by construction.
- "Active bidders" counts distinct bidders on that lot in our `Bid` table.

### Import duty is a simplified estimate

Duty uses an admin-editable band table keyed on **engine CC only**:

| Engine | Rate |
| --- | --- |
| ≤1500cc | 89% |
| 1501–2000cc | 110% |
| 2001–3000cc | 150% |
| >3000cc | 200% |

Surfaced in the UI as a *simplified estimate — actual NBR rates vary by vehicle
type and change with annual budget notifications*. Duty is applied to
(bid + shipping) as a **CIF approximation**, since insurance is not modelled
separately.

Vehicle **age** is not a duty modifier: it is a hard eligibility gate instead —
a car may only be listed if its manufacture year is within **5 years** of today.
The BRTA "registration life remaining" figure is `5 - (current year -
manufacture year)`.

### Other

- Shipping and port handling are flat, admin-editable settings, not formulas —
  there is no public formula to replicate accurately.
- Chat is **polling-based** (~3–5s), not WebSockets: Vercel's serverless runtime
  can't hold long-lived connections.
- Route protection uses `auth()` in server layouts rather than Next 16's `proxy`
  convention, which is documented as CDN-deployable and unable to rely on shared
  modules — incompatible with Prisma-backed session checks.

## Future work

- **BRTA historical policy view** — the FR asks for a history of how NBR's import
  age-limit policy changed across past budgets. Deferred; needs a policy dataset.
- Call-log panel alongside chat (the FR mentions it; out of scope for now).
- SMS alerts on shipment stage transitions.
