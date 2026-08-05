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

Optional — without these the feature shows an explicit "not configured" state,
never a fake success:

| Var | Enables |
| --- | --- |
| `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD` | SSLCommerz checkout (primary gateway) |
| `SSLCOMMERZ_SANDBOX` | `false` for live; defaults to sandbox |
| `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD` | bKash checkout (secondary gateway) |
| `BKASH_SANDBOX` | `false` for live; defaults to sandbox |
| `ANTHROPIC_API_KEY` | Natural-language requirement extraction in the AI assistant |

The "nearest dealer" map (New Cars) needs **no key**: it renders with
OpenStreetMap + Leaflet, and "Get directions" opens Google Maps routing via a
keyless deep-link.

## ⚠️ Dev-only seeded accounts

**These are development credentials. Change or remove them before any real
deployment — do not ship them.**

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@autobd.test` | `AdminDev123!` |
| Buyer | `rafiul.buyer@autobd.test` | `testpass123` |
| Buyer | `nusrat.buyer@autobd.test` | `testpass123` |
| Buyer | `tanvir.buyer@autobd.test` | `testpass123` |
| Organization | `osaka.org@autobd.test` | `testpass123` |
| Organization | `yokohama.org@autobd.test` | `testpass123` |
| Organization | `tokyoline.org@autobd.test` | `testpass123` |
| Organization | `nagoya.org@autobd.test` | `testpass123` |

Admin accounts cannot self-register, so the admin above is created by the seed.

## Running an auction

The seeded live session (USS Yokohama) puts its first lot on the block for 30
minutes, so a fresh seed is immediately usable. After that, an admin drives it:

1. Sign in as the admin → **Admin view**.
2. **Auction & lot control** → set a duration and *Put on the block*. A short
   duration (e.g. 60s) is the easy way to watch anti-snipe fire.
3. **Live auction broadcast** → paste a stream URL → *Go live*. Every buyer's
   telecast screen picks it up.

Admin controls only *when* a lot runs and *which* one is live. There is no code
path anywhere for an admin or organization to move a price.

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
- Lots **settle lazily**: the first read after `endsAt` closes the lot. This
  deployment target has no scheduler, and a lazy close keeps the state machine
  honest without one.

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

The prototype's own BRTA numbers (6.4 / 5.1 / 3.8 years) follow no formula from
its model years, so its listing titles and its bar values cannot both be
matched. The titles won; the bars show the real computed figure, including an
explicit **aged out** state for cars past the limit.

### Revenue rates are placeholders

The FR names four revenue sources (dealership referrals, listing fees, agent
placement commissions, modification sourcing margin) but sets **no rates**. The
volumes on the admin revenue panel are real transaction counts; the commission
rates multiplying them are placeholders in platform settings, editable by an
admin. **Set these to real numbers before drawing any conclusion from that
panel.**

### Organization stats

`successfulImports` and `avgTurnaroundDays` are declared org history — they
predate the platform and aren't derivable from our data. The **star rating is
real**: `ratingAvg`/`ratingCount` are recomputed from `Rating` rows whenever a
buyer rates an agent, and the seed derives them from a seeded import history
rather than hardcoding an average. Numbers are therefore small but true (the
prototype's "521 reviews" was invented).

### Other

- Shipping and port handling are flat, admin-editable settings, not formulas —
  there is no public formula to replicate accurately.
- Chat is **polling-based** (~3–5s), not WebSockets: Vercel's serverless runtime
  can't hold long-lived connections.
- Route protection uses `auth()` in server layouts rather than Next 16's `proxy`
  convention, which is documented as CDN-deployable and unable to rely on shared
  modules — incompatible with Prisma-backed session checks.
- The FR names the **OpenAI API** for the recommendation assistant. The LLM
  layer targets Claude instead and is isolated to `src/lib/assistant/llm.ts`, so
  swapping providers is a one-file change. The ranking, inventory and reasoning
  are real regardless; without a key a deterministic parser reads the brief and
  the UI says so.
- **Shipment stages are admin-only.** They assert facts about a physical car, so
  the prototype's buyer-facing "simulate advance stage" button had the wrong
  actor.
- Photos are hatched placeholders. The schema carries no image columns and the
  prototype ships no photos — this is a faithful port of its design, not
  simulated data.
- The kaido 3D configurator (~44MB of base64-embedded GLB) lives once at the
  repo root and is copied into `public/` by `scripts/copy-configurator.mjs` on
  `predev`/`prebuild`. The copy is gitignored so the repo doesn't carry it twice.

## Architecture notes

- **`lib/prisma.ts` imports `server-only`.** A client component that reaches a
  prisma-backed module drags `pg` → `node:dns` into the browser bundle and 500s
  with an error naming neither file. Keep pure helpers (`format`, `parts`,
  `landed-cost`) in modules free of prisma; reach the database from server
  components or server actions.
- **Bids and container bookings use `Serializable` transactions.** Two bids
  racing must not both clear the current price, and two buyers must not both
  take the last container slot.
- **Gateway callbacks are untrusted.** A success redirect is browser-supplied,
  so SSLCommerz is re-validated via its validator API and bKash via `/execute`,
  and the captured amount is checked against what we charged, before any payment
  is marked held. Totals are always recomputed server-side.

## Future work

- **BRTA historical policy view** — the FR asks for a history of how NBR's import
  age-limit policy changed across past budgets. Deferred; needs a policy dataset.
- Call-log panel alongside chat (the FR mentions it; out of scope for now).
- SMS alerts on shipment stage transitions.
- Ordering parts / saving a 3D build to `SavedBuild` — needs the payment
  gateways configured first.
