# AutoBD — API Manual (individual API submission)

This is your ready-to-adapt reference for the API assignment. Fill in your
**student-ID port** and paste your own **Postman screenshot** where noted.

---

## Your API: list used cars

- **What it does:** returns the approved used-car listings from the database as JSON.
- **Where the code is:** [`web/src/app/api/used-cars/route.ts`](web/src/app/api/used-cars/route.ts)
- **Why this one:** it's a plain `GET` that reads rows from the database and
  returns them — exactly like the Flask `getStudents` example — and it needs **no
  login**, so it's easy to screenshot in Postman.

---

## Step 1 — Run the backend on your student-ID port

The port must be the **last four digits of your student id**. Say your id ends
in `1234`. In a terminal:

```bash
cd web
npm run dev -- -p 1234
```

Wait for `Ready`, then your API base URL is `http://localhost:1234`.
(If PowerShell blocks the script, use `npm.cmd run dev -- -p 1234`.)

> Replace `1234` with your own last-four-digits everywhere below.

---

## Step 2 — API description (the part the assignment asks for)

| Field | Value |
| --- | --- |
| **Endpoint URL** | `http://localhost:1234/api/used-cars` |
| **HTTP Method** | `GET` |
| **Headers** | None required on the request. The response returns `Content-Type: application/json`. |
| **Body / Parameters** | No request body (it's a GET). Optional **query parameters**: |

Optional query parameters:

| Param | Example | Meaning |
| --- | --- | --- |
| `make` | `?make=Toyota` | filter by make (case-insensitive, partial) |
| `city` | `?city=Dhaka` | filter by location (case-insensitive, partial) |
| `limit` | `?limit=5` | max rows to return (1–100, default 50) |

You can combine them: `http://localhost:1234/api/used-cars?make=Toyota&limit=5`

---

## Step 3 — Code snippet

```ts
// web/src/app/api/used-cars/route.ts
import { prisma } from "@/lib/prisma";
import { ListingStatus, type Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const make = searchParams.get("make")?.trim();
  const city = searchParams.get("city")?.trim();
  const limitRaw = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

  // Only admin-approved listings are public.
  const where: Prisma.UsedCarListingWhereInput = {
    status: { in: [ListingStatus.ACTIVE, ListingStatus.OFFER_RECEIVED] },
  };
  if (make) where.make = { contains: make, mode: "insensitive" };
  if (city) where.location = { contains: city, mode: "insensitive" };

  const listings = await prisma.usedCarListing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const cars = listings.map((c) => ({
    id: c.id,
    title: c.title,
    make: c.make,
    model: c.model,
    year: c.manufactureYear,
    mileageKm: c.mileageKm,
    priceBdt: Number(c.priceBdt),
    location: c.location,
    ownershipVerified: c.ownershipVerified,
    listedAt: c.createdAt,
  }));

  return Response.json({ count: cars.length, cars });
}
```

> This is the Next.js equivalent of the Flask example: `@app.route` → the file
> path `app/api/used-cars/route.ts`; `def getStudents()` → `export function GET()`;
> `sqlite3 … SELECT * FROM STUDENTS` → `prisma.usedCarListing.findMany()`.

---

## Step 4 — Test it in Postman (then screenshot)

1. Make sure the backend is running (Step 1).
2. Open **Postman** → **New** → **HTTP Request**.
3. Set the method to **GET**.
4. Paste the URL: `http://localhost:1234/api/used-cars`
5. *(Optional, to show parameters)* open the **Params** tab and add
   key `make`, value `Toyota`.
6. Click **Send**.
7. You should get **200 OK** and a JSON body. **Take your screenshot here.**

> _Paste your Postman screenshot in your submission at this point._

### Example response (200 OK, `application/json`)

```json
{
  "count": 3,
  "cars": [
    {
      "id": "cmsfpd9ja0026ksue2n6us7yw",
      "title": "Toyota Axio 2016",
      "make": "Toyota",
      "model": "Axio",
      "year": 2016,
      "mileageKm": 92000,
      "priceBdt": 1350000,
      "location": "Dhaka",
      "ownershipVerified": true,
      "listedAt": "2026-08-05T06:25:17.446Z"
    }
  ]
}
```

---

## Notes for your group / your viva

**Why your project looks different from the Flask example.** AutoBD is built with
**Next.js**, which has two kinds of backend:

1. **API routes** — real HTTP endpoints in `web/src/app/api/…/route.ts`. These are
   what Postman can call. `GET /api/used-cars` (above) is one of them.
2. **Server Actions** — functions in `web/src/lib/*-actions.ts` marked
   `"use server"`. Most of the app's backend (placing bids, making offers,
   creating a listing, admin approvals) lives here. They are called directly from
   the pages and **cannot be tested in Postman**, because they use a special
   internal request format, not plain REST. That is the "restriction": most of the
   backend isn't REST, so this one clean REST endpoint is the right thing to
   document.

**For other group members (no duplication).** Each member can own a different
endpoint. Easy ones to add in the same style (say the word and they can be built):

| Suggested endpoint | Returns |
| --- | --- |
| `GET /api/used-cars` | used-car listings *(this one — yours)* |
| `GET /api/new-cars` | brand-new car models |
| `GET /api/brands` | car brands |
| `GET /api/auctions` | reconditioned-import auction sessions |
| `GET /api/dealers` | dealer showrooms + locations |
| `GET /api/research` | research-hub car specs |

**The project's existing API routes** (already in the code, but they need a login
cookie to call, so they're harder to screenshot):

- `GET /api/lots/[id]/state` — live auction lot state
- `GET /api/lots/[id]/feed` — live bid feed
- `GET /api/conversations/[id]/messages` — chat messages
- `GET|POST /api/payments/sslcommerz/callback` and `/api/payments/bkash/callback` — payment callbacks (redirect, not JSON)
- `GET|POST /api/auth/[...nextauth]` — login/session (from the Auth.js library)

---

## Every external API connection — where each one lives

There are two directions of "API":

- **Outbound** = your app calls an outside service (maps, payments, AI, etc.).
- **Inbound** = something calls your app's own endpoints (`web/src/app/api/…`, the table at the top of this file).

### Outbound connections (your app → an external service)

| Integration | Connects to | Connection file (the `fetch`/config) | Started from (the feature) | Key / env var |
| --- | --- | --- | --- | --- |
| **Database** — Neon Postgres | your `DATABASE_URL` | `web/src/lib/prisma.ts` (line ~13) | every server file, via `import { prisma }` | `DATABASE_URL` |
| **Maps — tiles** (OpenStreetMap) | `tile.openstreetmap.org` | `web/src/components/DealerMap.tsx` (line ~78) | New Cars → car detail: `web/src/app/(app)/new-cars/[brand]/[car]/NewCarDetail.tsx` (line ~120) | none (free) |
| **Maps — Google Maps** (open listing / directions) | `google.com/maps/...` | `web/src/components/DealerMap.tsx` (lines ~33–38) | same New Cars detail page | none — these are **links**, not API calls |
| **Payments — SSLCommerz** | `sandbox.sslcommerz.com` | `web/src/lib/payments/gateways.ts` (lines ~53, 55) | `web/src/lib/escrow-actions.ts` (line ~119) | `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD` |
| **Payments — bKash** | `tokenized.sandbox.bka.sh` | `web/src/lib/payments/gateways.ts` (line ~163) | `web/src/lib/escrow-actions.ts` (line ~128) | `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD` |
| **AI recommendations** — Claude (Anthropic) | `api.anthropic.com/v1/messages` | `web/src/lib/assistant/llm.ts` (line ~13) | `web/src/lib/assistant-actions.ts` (line ~23) → AI Assistant page | `ANTHROPIC_API_KEY` (optional) |
| **Exchange rate** — JPY→BDT | `open.er-api.com` | `web/src/lib/fx.ts` (line ~17) | auction landed-cost, via `getJpyToBdt()` | none (free) |
| **Auth / sessions** | (your own app) | `web/src/auth.ts` | `web/src/app/api/auth/[...nextauth]/route.ts` | `AUTH_SECRET` |

**The payment "callback" endpoints** (the gateway sends the buyer back here after paying) are your own inbound routes:
`web/src/app/api/payments/sslcommerz/callback/route.ts` and `web/src/app/api/payments/bkash/callback/route.ts`.

### Notes
- **Payments** currently have **no keys** in `web/.env`, so checkout refuses instead of faking success. Add your sandbox credentials to enable them.
- **AI** works **without** a key (it falls back to a built-in text parser and says so in the UI); add `ANTHROPIC_API_KEY` to use Claude.
- **Maps** and **exchange rate** are free and keyless.
- The `x-api-key` / `Authorization` headers for these live in each connection file above — never hard-coded, always read from environment variables in `web/.env`.
