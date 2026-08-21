# API + Postman Assignment — Step-by-Step (AutoBD)

*A beginner-friendly walkthrough. Your two features are **Live Auction (Lots)** and **Payments**, giving **4 REST APIs** total — all connected to the database.*

---

## What you are handing in

| # | Feature | API | Method |
|---|---------|-----|--------|
| 1 | Live Auction (Lots) | List all auction lots | GET |
| 2 | Live Auction (Lots) | Get one lot's details | GET |
| 3 | Payments | List all payments | GET |
| 4 | Payments | Get one payment's status | GET |

**Title-page answers:** Project Title = **AutoBD**, Backend Framework = **Next.js (App Router — Route Handlers)**, Name = **Fardin Alam**. (Fill in your Group Number, Student ID, Section, Date yourself.)

All four APIs read your **Neon PostgreSQL** database through **Prisma** — that satisfies the assignment's "Database must be connected" rule.

---

## ⚠️ FIRST: figure out your PORT

> Your port = **the last 4 digits of your student ID.**
> Example: if your ID is `2330**1234**`, your port is **1234**.

Everywhere below I use **`1234`** as an example. **Replace `1234` with your own 4 digits every time you see it.**

---

## STEP 1 — Start the server on your port

1. Open the project folder in **VS Code**.
2. Open a terminal: menu **Terminal → New Terminal**.
3. Type these two lines (press Enter after each):

```bash
cd web
npm run dev -- -p 1234
```

*(If PowerShell shows an error about `npm.ps1`, use `npm.cmd run dev -- -p 1234` instead.)*

4. Wait until you see **`✓ Ready`**. Your APIs are now live at `http://localhost:1234/...`

> **Only ONE server at a time.** If a server is already running in another terminal, click that terminal and press **Ctrl + C** to stop it first — otherwise you'll get errors.

---

## STEP 2 — Open Postman

- Open the **Postman** desktop app (or get it free at postman.com/downloads). You do **not** need an account — you can skip sign-in.
- Click the **`+`** to open a new request tab.

For every API below you'll do the same 3 things: pick the **method** (GET), paste the **URL**, click **Send**. Then screenshot the result.

---

## STEP 3 — Test each API and screenshot it

### 📸 API 1 — List auction lots
- **Method:** `GET`
- **URL:** `http://localhost:1234/api/lots`
- **Headers:** None
- **Optional parameter:** add `?status=PENDING` to filter (values: `LIVE`, `PENDING`, `SOLD`, `NO_SALE`)
  → `http://localhost:1234/api/lots?status=PENDING`
- Click **Send**. You'll see JSON like:
```json
{ "count": 29, "lots": [ { "id": "cmsq76...", "car": "2023 Suzuki Swift Sport", "status": "PENDING", ... } ] }
```
- **Take a screenshot** (whole Postman window: method + URL + response).

### 📸 API 2 — Get one lot's details
- **Method:** `GET`
- **URL:** `http://localhost:1234/api/lots/PUT_A_LOT_ID_HERE`
  - Copy any `id` from API 1's response and paste it at the end.
  - A real one that exists right now: `http://localhost:1234/api/lots/cmsq76wxn000eeguesq3h5nn5`
- **Headers:** None
- Click **Send** → you get that car's year/make/model, grade, status, starting price and top bids.
- **Screenshot it.**

### 📸 API 3 — List payments
- **Method:** `GET`
- **URL:** `http://localhost:1234/api/payments`
- **Headers:** None
- **Optional parameter:** `?status=HELD_IN_ESCROW` (values: `PENDING`, `HELD_IN_ESCROW`, `RELEASED`, `FAILED`, `REFUNDED`)
- Click **Send** → you'll see 4 payments:
```json
{ "count": 4, "payments": [ { "purpose": "AUCTION_WIN", "gateway": "SSLCOMMERZ", "status": "HELD_IN_ESCROW", "amountBdt": 4200000 }, ... ] }
```
- **Screenshot it.**

### 📸 API 4 — Get one payment's status
- **Method:** `GET`
- **URL:** `http://localhost:1234/api/payments/PUT_A_PAYMENT_ID_HERE`
  - Copy any `id` from API 3's response.
  - A real one right now: `http://localhost:1234/api/payments/cmt1qtjtc0000i8uekeq35j0q`
- **Headers:** None
- Click **Send** → that payment's purpose, gateway, amount, status and reference.
- **Screenshot it.**

> If **API 3 shows `"count": 0`** (no payments), run this once from the `web` folder, then Send again:
> ```bash
> npx tsx prisma/seed-demo-payments.ts
> ```

---

## STEP 4 — What to write for each API (copy into the template)

For each API the template wants: **Endpoint URL, HTTP Method, Headers, Body/Parameters, Code snippet, Screenshot.** Here it all is, ready to paste. *(Remember to swap `1234` for your port.)*

### API 1 — List auction lots
- **Endpoint URL:** `http://localhost:1234/api/lots`
- **HTTP Method:** GET
- **Headers:** None
- **Body/Parameters:** Optional query `status` = `LIVE` | `PENDING` | `SOLD` | `NO_SALE`
- **Code snippet** (`web/src/app/api/lots/route.ts`):
```ts
import { prisma } from "@/lib/prisma";
import { LotStatus } from "@/generated/prisma/enums";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("status");
  const status = raw && (Object.values(LotStatus) as string[]).includes(raw)
    ? (raw as LotStatus) : undefined;

  const lots = await prisma.auctionCar.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { bids: { orderBy: { amountJpy: "desc" }, take: 1 },
               auction: { select: { house: true, location: true } } },
  });

  const data = lots.map((lot) => ({
    id: lot.id, lotNumber: lot.lotNumber,
    car: `${lot.manufactureYear} ${lot.make} ${lot.model}`,
    grade: lot.grade, status: lot.status,
    startingPriceJpy: Number(lot.startingPriceJpy.toString()),
    topBidJpy: lot.bids[0] ? Number(lot.bids[0].amountJpy.toString()) : null,
    auctionHouse: lot.auction.house, location: lot.auction.location,
  }));

  return Response.json({ count: data.length, lots: data });
}
```

### API 2 — Get one lot's details
- **Endpoint URL:** `http://localhost:1234/api/lots/{id}`  (example: `/api/lots/cmsq76wxn000eeguesq3h5nn5`)
- **HTTP Method:** GET
- **Headers:** None
- **Body/Parameters:** `id` in the URL path (the lot's id)
- **Code snippet** (`web/src/app/api/lots/[id]/route.ts`):
```ts
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lot = await prisma.auctionCar.findUnique({
    where: { id },
    include: { bids: { orderBy: { amountJpy: "desc" }, take: 3 },
               auction: { select: { house: true, location: true, startsAt: true } } },
  });
  if (!lot) return Response.json({ error: "Lot not found" }, { status: 404 });

  return Response.json({
    id: lot.id, lotNumber: lot.lotNumber,
    car: `${lot.manufactureYear} ${lot.make} ${lot.model}`,
    mileageKm: lot.mileageKm, engineCc: lot.engineCc, grade: lot.grade,
    chassisCode: lot.chassisCode, status: lot.status,
    startingPriceJpy: Number(lot.startingPriceJpy.toString()),
    topBidsJpy: lot.bids.map((b) => Number(b.amountJpy.toString())),
    auction: { house: lot.auction.house, location: lot.auction.location, startsAt: lot.auction.startsAt },
  });
}
```

### API 3 — List payments
- **Endpoint URL:** `http://localhost:1234/api/payments`
- **HTTP Method:** GET
- **Headers:** None
- **Body/Parameters:** Optional query `status` = `PENDING` | `HELD_IN_ESCROW` | `RELEASED` | `FAILED` | `REFUNDED`
- **Code snippet** (`web/src/app/api/payments/route.ts`):
```ts
import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@/generated/prisma/enums";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("status");
  const status = raw && (Object.values(PaymentStatus) as string[]).includes(raw)
    ? (raw as PaymentStatus) : undefined;

  const payments = await prisma.payment.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" }, take: 50,
  });

  const data = payments.map((p) => ({
    id: p.id, purpose: p.purpose, gateway: p.gateway,
    amountBdt: Number(p.amountBdt.toString()), status: p.status, createdAt: p.createdAt,
  }));

  return Response.json({ count: data.length, payments: data });
}
```

### API 4 — Get one payment's status
- **Endpoint URL:** `http://localhost:1234/api/payments/{id}`  (example: `/api/payments/cmt1qtjtc0000i8uekeq35j0q`)
- **HTTP Method:** GET
- **Headers:** None
- **Body/Parameters:** `id` in the URL path (the payment's id)
- **Code snippet** (`web/src/app/api/payments/[id]/route.ts`):
```ts
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.payment.findUnique({ where: { id } });
  if (!p) return Response.json({ error: "Payment not found" }, { status: 404 });

  return Response.json({
    id: p.id, purpose: p.purpose, gateway: p.gateway,
    amountBdt: Number(p.amountBdt.toString()), status: p.status,
    gatewayRef: p.gatewayRef, createdAt: p.createdAt, updatedAt: p.updatedAt,
  });
}
```

---

## STEP 5 — Fill the title page & submit

- Project Title: **AutoBD**
- Group Number: *(yours)*
- Backend Framework: **Next.js (App Router / Route Handlers)**
- Submitted by: **Fardin Alam**
- Student ID / Section / Date: *(yours)*

Then paste your 4 screenshots under the matching API. Done. ✅

---

## Quick answers if the teacher asks

- **"Is the database connected?"** Yes — every endpoint uses **Prisma** (`prisma.auctionCar.findMany`, `prisma.payment.findMany`) which talks to **Neon PostgreSQL**. No data is hardcoded.
- **"What port and why?"** The server runs on the last 4 digits of my student ID, started with `npm run dev -- -p <port>`.
- **"Why these endpoints?"** They are the REST APIs for two of my project's features — the live auction lots and the payments. Each returns JSON and can be tested directly in Postman.
- **Files:** `web/src/app/api/lots/route.ts`, `web/src/app/api/lots/[id]/route.ts`, `web/src/app/api/payments/route.ts`, `web/src/app/api/payments/[id]/route.ts`.
