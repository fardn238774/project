# AutoBD — Feature Engineering Manual

A code-level walkthrough of **every major feature**: where the **frontend** lives, where the
**backend** lives, how the **database** is connected, and — line by line — where each
**calculation / logical decision** actually happens.

Everything below points at real files with real line numbers. Paths are relative to the repo
root; the app itself lives under `web/`. A reference like `web/src/lib/prisma.ts:13` means
*file, line 13*.

---

## How to read this manual

Three words show up in every section. In plain English:

| Term | What it means in this project | Where it lives |
|---|---|---|
| **Frontend** | The page/UI the user sees and clicks. React components. | `web/src/app/**/page.tsx` and `*.tsx` components |
| **Backend** | Code that runs on the server: reads/writes the database, does the maths, talks to payment/map APIs. | `web/src/lib/**` (functions & "server actions") and `web/src/app/api/**` (API routes) |
| **Database** | The Postgres tables where data is stored. Defined once in the Prisma schema. | `web/prisma/schema.prisma`, reached through `web/src/lib/prisma.ts` |

**Golden rule of this codebase:** the frontend never trusts the browser for anything that
matters (prices, permissions, who won a lot). Every price is re-looked-up on the server; every
mutation checks *who you are* first. You'll see this pattern repeat.

---

# Part 0 — The foundation every feature shares

Read this once and Parts 1–8 become easy — they all reuse these pieces.

## 0.1 The stack

- **Next.js 16 (App Router)** — one framework for both frontend pages and backend code.
- **React 19 + TypeScript** — the UI.
- **Prisma 7** — the "translator" between TypeScript and the Postgres database.
- **Neon Postgres** — the actual cloud database.
- **Auth.js v5 (NextAuth)** — login / sessions.
- **Tailwind CSS v4** — styling.

## 0.2 The database connection — `web/src/lib/prisma.ts`

This one small file is **the single door to the database**. Every backend file that needs data
imports `prisma` from here.

```ts
web/src/lib/prisma.ts
 5  import "server-only";                                  // ← safety: bans this file from the browser
 7  import { PrismaPg } from "@prisma/adapter-pg";         // the Postgres driver adapter
 8  import { PrismaClient } from "@/generated/prisma/client";
13  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
21  export const prisma =
22    globalForPrisma.prisma ??                            // reuse one client (don't open 100 connections)
23    new PrismaClient({ adapter, ... });
```

- **`web/src/lib/prisma.ts:13`** — the connection string comes from the environment variable
  `DATABASE_URL`, which is stored in **`web/.env`** (the real Neon URL; never committed). Change
  databases = change that one line's value in `.env`, nothing else.
- **`web/src/lib/prisma.ts:5`** — `import "server-only"` makes the build **fail loudly** if any
  browser component accidentally imports the database layer. This is why data code lives in `lib/`
  and pure helpers (formatting, maths) are kept in separate files.
- **`web/src/lib/prisma.ts:21-23`** — in development the client is cached on a global so hot-reload
  doesn't exhaust the connection pool.

**How a feature uses it:** `import { prisma } from "@/lib/prisma"` then
`await prisma.newCar.findMany()`, `await prisma.bid.create({...})`, etc. `newCar`, `bid`, `buyer`…
are the models below.

## 0.3 The schema = your tables — `web/prisma/schema.prisma`

The schema is the **blueprint of every table**. Prisma reads it and generates the typed
`prisma.*` methods. A few anchors you'll meet again:

| Model (table) | Line | Powers |
|---|---|---|
| `User`, `Buyer`, `Organization`, `Admin` | `:30`, `:44`, `:84`, `:122` | identity & roles |
| `Brand`, `Dealer`, `NewCar`, `NewCarVariant` | `:142`, `:159`, `:177`, `:198` | New Cars |
| `UsedCarListing`, `Offer`, `ListingThread`, `ListingMessage` | `:276`, `:329`, `:343`, `:356` | Used Cars + chat |
| `Auction`, `AuctionCar`, `Bid` | `:378`, `:402`, `:452` | Reconditioned auctions |
| `Part`, `PartFitment` | `:543`, `:561` | Modification parts + fitment |
| `ResearchModel`, `MarketPrice`, `MaintenanceItem` | `:625`, `:653`, `:669` | Research Hub |
| `CartItem`, `Payment`, `Escrow` | `:698`, `:739`, `:768` | Cart & Payment |
| `DutyRate`, `PlatformSetting`, `ExchangeRate` | `:896`, `:910`, `:917` | admin-tunable numbers behind every calculation |

Two design facts to remember:
- **`schema.prisma:896` `DutyRate`** and **`:910` `PlatformSetting`** mean *no number is hardcoded*.
  Duty %, shipping cost, bid increment, pooling discount — all live in the database, admin-editable.
- **`schema.prisma:5-8`** (top comment) — price only ever moves through the `Bid` table; there is
  deliberately **no** admin/org "raise the price" path anywhere (that would be shill bidding).

## 0.4 Login & "who is this user?" — `auth.ts` + `session.ts`

**`web/src/auth.ts`** configures login:
- **`auth.ts:24`** — looks up the user by email.
- **`auth.ts:27`** — `bcrypt.compare(password, user.passwordHash)` checks the password against the
  stored hash (passwords are never stored in plain text).
- **`auth.ts:30`** — on success returns `{ id, email, role }`.
- **`auth.ts:34-49`** — stuffs `id` and `role` into the session token so every later request knows
  who you are and whether you're a `BUYER`, `ORGANIZATION`, or `ADMIN`.

**`web/src/lib/session.ts`** is the guard every backend uses:
- **`session.ts:7-11` `requireUser()`** — "must be logged in, else redirect to /login".
- **`session.ts:18-23` `requireBuyer()`** / **`:26-30` `currentBuyer()`** — get the Buyer profile
  (buyer-only screens: offers, bids, cart).
- **`session.ts:39-45` `requireAdmin()`** — admin-only screens.

Every server action you'll see starts by calling one of these. That's the permission check.

## 0.5 The three ways the frontend talks to the backend

This is the mental model for the whole app. There are exactly three:

1. **Server Component** *(most pages)* — the `page.tsx` is `async` and runs **on the server**, so
   it just calls `await prisma...` or a `lib` function directly and returns finished HTML. No API
   call. Example: `web/src/app/(app)/new-cars/page.tsx:9` awaits the DB right in the page.

2. **Server Action** *(most buttons/forms)* — a function marked `"use server"`. A client component
   calls it like a normal function; Next.js turns it into a secure POST behind the scenes. Used for
   *mutations* (place a bid, submit an offer, add to cart). Example: `placeBid()` in
   `web/src/lib/bid-actions.ts`.

3. **API route** *(live polling)* — a `route.ts` exporting `GET`/`POST`, hit with `fetch()` on a
   timer. Used when the client needs to re-check something repeatedly. Example: the live bid clock at
   `web/src/app/api/lots/[id]/state/route.ts`.

## 0.6 Shared money & logic helpers

Small but everywhere:

- **`format.ts`** — money formatting. `bdt()` → "৳20,50,000" (`:33`), `bdtLakh()` → "৳48L" (`:18`),
  `num()` safely turns a Prisma `Decimal` into a JS number (`:10`). *Why `num()` exists:* Postgres
  money columns come back as `Decimal` objects, not numbers — `num()` is the one place that
  conversion happens.
- **`settings.ts`** — reads the admin-tunable numbers. `getSettings()` (`:35`) loads them all in one
  query; defaults at `:7-27` (e.g. `shippingFlatBdt: 195000`, `minBidIncrementJpy: 5000`,
  `poolingDiscountPercent: 30`) so a missing row degrades to a sane value instead of `NaN`.
- **`fx.ts`** — the live **JPY→BDT** exchange rate. `getJpyToBdt()` (`:54`) returns a cached rate
  and only calls the free rate API when the cache is older than the admin TTL.

---

# Part 1 — New Cars (Pillar 1)

**What the user does:** browse brands → pick a model → send a dealer inquiry or book a test drive.

### Files at a glance

| Layer | File | Role |
|---|---|---|
| Frontend (list) | `web/src/app/(app)/new-cars/page.tsx` | grid of brands |
| Frontend (detail) | `web/src/app/(app)/new-cars/[brand]/[car]/page.tsx` | one model + variants + dealers |
| Frontend (interactive) | `web/src/app/(app)/new-cars/[brand]/[car]/NewCarDetail.tsx` | inquiry/test-drive UI |
| Backend | `web/src/lib/new-car-actions.ts` | records a dealer inquiry |
| Backend | `web/src/lib/test-drive-actions.ts` | books a test drive |
| Database | `Brand`, `Dealer`, `NewCar`, `NewCarVariant`, `DealerInquiry`, `TestDriveReservation` | |

### Frontend

**Brands list — `new-cars/page.tsx`:**
- **`:9-15`** — the page is a Server Component; it queries all brands **directly**, and uses
  Prisma's `_count` to fetch "how many cars / dealers" without a second query.
- **`:33`** — the **"from ৳XX L" price** shown on each brand card is computed on the fly:
  `bdtLakh(Math.min(...b.cars.map(c => num(c.priceMinBdt))))` → the cheapest model's minimum price.

**Model detail — `new-cars/[brand]/[car]/page.tsx`:**
- **`:18-24`** — loads the car with its `brand.dealers` (for the map/branch picker) and `variants`
  sorted cheapest-first.
- **`:26`** — **URL integrity check:** `if (!car || car.brand.slug !== brand) notFound()`. Stops
  someone hand-editing the URL to show a Toyota under `/new-cars/honda/…`.
- **`:30-46`** — if a buyer is logged in, it also loads *their* open inquiries and *their* upcoming
  test drives for this car, so the UI can show "already inquired / already booked".
- **`:111-145`** — hands everything to the client component `NewCarDetail`, converting `Decimal`
  prices/coords with `num()` and formatting the test-drive time in Asia/Dhaka.

### Backend + logic

**Dealer inquiry — `new-car-actions.ts` `submitInquiry()` (`:13-47`):**
- **`:20-21`** — `currentBuyer()` guard: only buyers can inquire.
- **`:23-27`** — re-fetch the variant server-side (never trust the posted price/name).
- **`:30-37`** — **validation with meaning:** if the buyer picked a branch, that dealer *must belong
  to this car's brand* (`dealer.brandId !== variant.newCar.brandId` → rejected). Prevents booking a
  Toyota test drive at a Honda showroom.
- **`:39-42`** — dedupe: no second open inquiry for the same variant.
- **`:44`** — writes the `DealerInquiry` row.

**Test drive — `test-drive-actions.ts`:** same shape — validate the dealer belongs to the brand,
validate the chosen date/time, then create a `TestDriveReservation`. The DB has a
`@@unique([buyerId, newCarId, dealerId, scheduledAt])` (`schema.prisma:256`) so an accidental
double-submit of the identical slot is rejected by the database itself.

---

# Part 2 — Used Cars, P2P (Pillar 2) + live buyer↔seller chat

**What the user does:** list their own car (goes through admin approval) → buyers browse approved
cars → make an offer or **live-chat** the seller → seller accepts/rejects/marks sold.

### Files at a glance

| Layer | File | Role |
|---|---|---|
| Frontend (list) | `web/src/app/(app)/used-cars/page.tsx` | approved marketplace + sort chips |
| Frontend (detail) | `web/src/app/(app)/used-cars/[id]/page.tsx` | one car; offer form, chat, seller controls |
| Frontend (sell) | `web/src/app/(app)/used-cars/seller/new/page.tsx` | "list your car" form |
| Frontend (chat) | `web/src/components/ListingChatPanel.tsx` | polling chat bubbles |
| Backend | `web/src/lib/used-car-actions.ts` | create listing, offers, accept/reject, mark sold |
| Backend | `web/src/lib/listing-chat-actions.ts` | send/read chat messages |
| Database | `UsedCarListing`, `Offer`, `ListingThread`, `ListingMessage` | |

### Frontend

**Marketplace — `used-cars/page.tsx`:**
- **`:15-23`** — the four sort chips ("All / By make / By price / By location") are real DB
  `orderBy` clauses in a `SORTS` map.
- **`:39-42`** — **key filter:** the list only shows `ACTIVE` and `OFFER_RECEIVED` listings. A
  seller's fresh submission (`PENDING_VERIFICATION`), a rejected one, and a sold one are *not* on
  the public marketplace.

**Detail — `used-cars/[id]/page.tsx`:** this page decides what you can see based on who you are:
- **`:35-42`** — computes `isOwnListing` / `isPublic`; a pending/rejected listing 404s for everyone
  except its owner.
- **`:83-119`** — if you're the **seller**, it loads *all* offers and *every* buyer's chat thread.
- **`:120-141`** — if you're a **buyer**, it loads only *your own* thread with the seller.
- **`:263-373`** — renders the seller view (offers + accept/reject + mark-sold + chat panels) or the
  buyer view (add-to-cart, `OfferForm`, one chat panel) accordingly.

### Backend + logic

**Making an offer — `used-car-actions.ts` `submitOffer()` (`:22-58`):**
- **`:16-20` `parseBdt()`** — accepts "৳20,50,000", "2050000", "20,50,000" and strips everything but
  digits so any format the user types becomes the same number.
- **`:38`** — you can't offer on your **own** listing; **`:39`** — can't offer on a **sold** car;
  **`:41-44`** — no duplicate pending offer.
- **`:47-53`** — **one atomic transaction**: create the `Offer` **and** flip the listing to
  `OFFER_RECEIVED` together, so the seller's dashboard reflects it instantly. If either fails, both
  roll back.

**Seller accepts an offer — `acceptOffer()` (`:231-257`):** the most important transaction in this
feature. Lines **`:241-251`** do three things atomically:
1. mark the chosen offer `ACCEPTED`,
2. mark **all other** pending offers `REJECTED`,
3. set the listing to `SOLD`.

Because it's one `prisma.$transaction([...])`, a car can never end up "sold to two people".

**Reject / mark sold — `rejectOffer()` (`:260-283`)** reverts the listing to `ACTIVE` only if no
pending offers remain (`:270-278`); **`markSold()` (`:286-304`)** lets a seller close a deal reached
in chat. Both re-check `listing.sellerId === me.id` first — only the seller can do these.

**Listing a car (with uploads) — `createListing()` (`:103-224`):**
- **`:130-147`** — a wall of validation with human error messages (title length, year 1980–now,
  mileage sane, price > 0, BRTA registration present, condition notes ≥ 20 chars…).
- **`:153-180`** — the **auction sheet is required** (JPG/PNG/WebP/PDF, ≤5 MB); photos (≤8, ≤6 MB
  each) and a walkaround video (≤40 MB) are optional and type-checked.
- **`:85-91` `saveUpload()`** — writes each file under `web/public/uploads/<subdir>/<uuid>.<ext>`
  and returns its public path.
- **`:196-219`** — creates the listing in `PENDING_VERIFICATION`, i.e. **off the marketplace until
  an admin approves it**; **`:223`** redirects to the seller dashboard.

### The live chat (how "live" works without WebSockets)

There's no WebSocket server on this deployment, so chat is **short-polling**:
- **`ListingChatPanel.tsx:8`** — `POLL_MS = 4000` (re-fetch every 4 seconds).
- **`ListingChatPanel.tsx:36-52`** — a `setInterval` calls the read action and replaces the message
  list; **`:59-85`** sends a message and immediately re-reads.
- Backend `listing-chat-actions.ts`:
  - **`messageSeller()` (`:47-77`)** — a buyer's first message **upserts** the `(listing, buyer)`
    thread (`:65-69`) then adds the message. Upsert = "create the thread if it doesn't exist, else
    reuse it" — so one thread per interested buyer.
  - **`replyToThread()` (`:80-92`)** — seller or buyer replies; **`participantThread()` (`:36-44`)**
    guarantees only the two people in that thread can post.
  - **`readListingThread()` (`:95-102`)** — the poll target the panel hits every 4 s.

---

# Part 3 — Reconditioned Import auctions (Pillar 3) + the landed-cost engine

**What the user does:** pick a licensed agent (organization) → open a live auction lot → bid in real
time → watch a **unified landed-cost** figure update live → optionally join a shipping container.

This is the most calculation-heavy feature. Two engines drive it: **bidding** and **landed cost**.

### Files at a glance

| Layer | File | Role |
|---|---|---|
| Frontend (bidding) | `web/src/app/(app)/auctions/agents/[id]/sessions/[auctionId]/lots/[lotId]/page.tsx` | the live lot screen |
| Frontend (cost) | `.../lots/[lotId]/CostSidebar.tsx` | live landed-cost breakdown |
| Backend (bids) | `web/src/lib/bid-actions.ts` | places a real bid (anti-snipe, anti-race) |
| Backend (state) | `web/src/lib/auction.ts` | current price, clock, settle lot |
| Backend (poll) | `web/src/app/api/lots/[id]/state/route.ts` | ~3s live-state endpoint |
| Backend (maths) | `web/src/lib/landed-cost.ts` + `landed-cost-server.ts` | the cost formula |
| Database | `Auction`, `AuctionCar`, `Bid`, `Container`, `DutyRate` | |

### The bidding logic — `bid-actions.ts` `placeBid()` (`:30-101`)

This function is worth reading closely; it's where "real, not simulated" is enforced.

- **`:31-32`** — only a `Buyer` can bid. There is **no** admin/org bid path in the entire codebase —
  so shill bidding is impossible *by construction*, not just by rule.
- **`:44` + `:92`** — the whole thing runs inside a **Serializable transaction**. If two buyers bid
  at the exact same instant, Postgres aborts the loser, which surfaces at **`:97-100`** as
  "another bid landed — retry" instead of silently losing a bid.
- **`:46-49`** — reads the lot and its current highest bid.
- **`:51-56`** — refuses if the lot isn't `LIVE`, has no close time, or the clock already hit zero.
- **`:59-60`** — computes the minimum acceptable next bid: `current + minBidIncrementJpy` (the first
  bid may equal the starting price; later bids must clear the increment).
- **`:62-64`** — rejects a bid below that minimum with the exact figure.
- **`:67-68`** — **anti-snipe rule:** if the bid lands within `antiSnipeWindowSeconds` of the close,
  it will extend the auction.
- **`:70-72`** — writes the `Bid` row (this is the *only* way price moves).
- **`:76-82`** — if in the window, pushes `endsAt` out by `antiSnipeExtendSeconds` and bumps
  `extensionCount`, so late bids can't "snipe" the lot.

### The live state & clock — `auction.ts`

- **`readLotState()` (`:25-63`)** — reads everything the screen needs from real rows:
  - **`:38-42`** — "active bidders" = *distinct* `bidderId`s on this lot.
  - **`:45`** — current price = top bid, or the starting price if no bids yet.
  - **`:46-48`** — `secondsRemaining` = `endsAt − now`, floored at 0.
  - **`:55`** — `minNextBidJpy` = current + increment.
- **`settleLotIfEnded()` (`:70-91`)** — there's no background scheduler, so **the lot settles
  lazily on the next read** after its clock runs out:
  - **`:82`** — a lot only sells if the top bid meets the reserve; otherwise it's `NO_SALE` (exactly
    like a real auction house).
  - **`:84-90`** — sets `SOLD` + records the `winningBidId`, or `NO_SALE`.
- **`api/lots/[id]/state/route.ts`** — the browser polls this ~every 3 s: **`:18`** settles the lot
  if needed, **`:20`** returns fresh state + FX rate with `Cache-Control: no-store` (`:23-26`).

### The landed-cost engine — `landed-cost.ts` `computeLandedCost()` (`:50-79`)

This is a **pure function** (no database), which is the whole trick: the server computes it once,
and the browser **re-computes it live** as the bid moves — no round-trip needed. The formula:

```ts
web/src/lib/landed-cost.ts
55  const bidBdt = input.bidJpy * input.rate;                     // 1. JPY bid → BDT at live FX
57  const shippingBeforeDiscount = settings.shippingFlatBdt;      // 2. flat shipping (admin setting)
58  const shipping = input.pooled                                 //    …minus pooling discount if joined
59    ? shippingBeforeDiscount * (1 - settings.poolingDiscountPercent / 100)
60    : shippingBeforeDiscount;
63  const duty = ((bidBdt + shipping) * dutyRatePercent) / 100;   // 3. duty on (bid+freight) — CIF approx
65  const fee = agentFeeFor(input.agent, bidBdt);                 // 4. agent fee: % of bid OR flat
77  total: bidBdt + duty + shipping + fee.amount + port          // 5. sum everything
```

Line-by-line meaning:
- **`:55`** — the bid is entered in **yen**; multiply by the **live JPY→BDT rate** from `fx.ts`.
- **`:58-60`** — **container pooling discount**: joining a shared container cuts *shipping only* by
  `poolingDiscountPercent` (default 30%).
- **`:63`** — **import duty** = `(bid + shipping) × duty% / 100`. Applying duty to bid **plus
  freight** is the "CIF" customs approximation (documented as a simplification).
- **`:44-48` `agentFeeFor()`** — the agent fee is either a **percentage of the bid** or a **flat
  BDT amount**, depending on that organization's `feeType`.
- **`:77`** — grand total.

**Where the duty % comes from — `landed-cost-server.ts` `dutyRateFor()` (`:7-14`):**
- **`:8`** — loads the admin-editable `DutyRate` bands.
- **`:9-11`** — picks the **highest band whose `ccMin` the engine clears** (open-topped last band
  via `ccMax === null`). So a 1490 cc car lands in a lower band than a 2500 cc car.
- **`:13`** — if no band matches, charge **0** rather than guess.

**Live recompute in the browser — `CostSidebar.tsx` (`:29-33`):** the client imports the *same*
`computeLandedCost` and calls it with the live `state.currentBidJpy` and `state.rate` from the poll,
so the entire breakdown (`:42-50`) updates every few seconds without asking the server to do the
maths. Toggling "pooled shipping" (`:70-82`) flips one boolean and the total recalculates instantly.

---

# Part 4 — Modification Studio + fitment checker (Pillar 4)

**What the user does:** pick **brand → model → year → version**; the catalog filters to parts that
**actually fit** that car (by JDM chassis code); add parts to cart; optionally open a 3D configurator.

### Files at a glance

| Layer | File | Role |
|---|---|---|
| Frontend (page) | `web/src/app/(app)/modifications/page.tsx` | loads catalog + garage |
| Frontend (UI) | `web/src/app/(app)/modifications/ModStudio.tsx` | cascading picker + parts grid + 3D tab |
| Backend (query) | `web/src/lib/fitment.ts` | reads catalog & marks compatibility |
| Data (types) | `web/src/lib/parts.ts` | pure types/labels (safe for the browser) |
| Data (mapping) | `web/src/lib/vehicles.ts` | brand/model/year/version → chassis code |
| Database | `Part`, `PartFitment` | |

### The core idea: compatibility is decided by **chassis code**

A part physically bolts on (or doesn't) based on the car's **JDM chassis code** (e.g. Toyota Harrier
= `AVU65`). The DB stores which chassis codes each part fits in the `PartFitment` table
(`schema.prisma:561`).

### Frontend

**`modifications/page.tsx`** (Server Component):
- **`:23-26`** — loads the catalog via `readCatalog()` and, if arriving from a won lot, preselects
  that car's chassis; loads the buyer's "garage" (cars they actually won) via `readGarage()`.

**`ModStudio.tsx`** — the cascading picker (this is the "which line does the filtering" answer):
- **`:40-44`** — state for brand / model / year / version / chassis.
- **`:49-52`** — each dropdown's options are derived from the one above it (`vehicleModels(brand)`,
  `vehicleYears(brand, model)`, …), so you can't pick an invalid combination.
- **`:54-66`** — picking each level clears the ones below it; **`:65`** picking a *version* resolves
  the final **chassis code** via `resolveChassis(brand, model, year, version)`.
- **`:76-81`** — the **filter itself**: for every part, recompute `compatible = fits.includes(chassis)`
  (`:78`), then filter by category, then (if a car is chosen and "hide incompatible" is on) drop the
  parts that don't fit (`:80`).
- **`:230`** — each card shows a green **"Fits"** or grey **"Doesn't fit"** badge; **`:247-249`**
  an incompatible part still shows *what it's listed for* (so the buyer sees it exists but can't
  order the wrong thing).
- **`:271-277`** — the "3D configurator" tab embeds `public/kaido-multicar-garage.html` in an iframe.

### Backend + data

**`fitment.ts` `readCatalog()` (`:17-40`):**
- **`:18-21`** — pulls every `Part` with its `fitments` in one query.
- **`:37`** — computes the compatibility flag server-side too:
  `compatible: chassisCode === null ? true : fits.includes(chassisCode)`. With no car chosen,
  everything shows; with a car chosen, each part is marked.

**`fitment.ts` `readGarage()` (`:43-54`)** — "your garage" = auction lots this buyer **won**
(`status: SOLD, winningBid.bidderId = you`, `:45`). This is what lets a buyer jump straight from a
car they won to the parts that fit it.

**`vehicles.ts`** — the friendly-name → chassis mapping, kept in code because chassis↔model facts are
stable (no DB reseed needed):
- **`:21-47`** — the `VEHICLES` table (e.g. `{ Toyota, Harrier, 2019, Premium, AVU65 }`).
- **`:51-68`** — the cascade helpers (`vehicleBrands`, `vehicleModels`, `vehicleYears`,
  `vehicleVersions`).
- **`:69-80` `resolveChassis()`** — the exact function that turns the four dropdowns into a chassis
  code the catalog matches against.

---

# Part 5 — Dream Car Research Hub + TCO + BRTA paper value

**What the user does:** open a model page → see **live used-market prices** (scraped from Bikroy),
reliability issues, maintenance costs, and an interactive **Total-Cost-of-Ownership** calculator.

### Files at a glance

| Layer | File | Role |
|---|---|---|
| Frontend (model) | `web/src/app/(app)/research/[brand]/[model]/page.tsx` | the model page |
| Frontend (TCO) | `.../[model]/TcoCalculator.tsx` | interactive cost calculator |
| Backend (scrape helpers) | `web/src/lib/research.ts` | Bikroy price parsing (pure) |
| Backend (BRTA) | `web/src/lib/brta.ts` | registration-paper-value formula |
| Backend (refresh) | `web/src/app/api/cron/refresh-prices/route.ts` | re-runs the scrape |
| Database | `ResearchModel`, `MarketPrice`, `ResearchIssue`, `MaintenanceItem` | |

### Live market price (scrape-then-cache)

The page **never scrapes on a page load** — that would be slow and fragile. Instead a scraper writes
prices into the `MarketPrice` table, and the page only *reads* that cache:
- **`research.ts:24-34` `extractPrices()`** — pulls BDT prices out of a Bikroy results page with a
  regex (`:26`) and **sanity-filters** them to 1 lakh–10 crore (`:31`) to drop parts/stray prices.
- **`research.ts:56-65` `aggregate()`** — reduces the list to **min / avg / max / count** + a few
  sample prices (`:59-61`).
- **`research/[brand]/[model]/page.tsx:19-23`** reads the model + its cached `marketPrice`; **`:64-98`**
  renders "Average asking ৳XXL", the range, recent samples, and the "scraped … updated <date>" line.

### The TCO calculator — `TcoCalculator.tsx`

This is a **client** component so the slider updates instantly:
- **`:23`** — a slider state `monthlyKm` (default 1200).
- **`:25`** — **fuel cost/month** = `(monthlyKm / kmPerL) × fuelPricePerL`. (km driven ÷ economy =
  litres; × price/litre = taka.)
- **`:28`** — **first-year total** = registration tax + token tax + insurance + `fuelCost × 12`.
- **`:43-52`** — the slider; every drag re-runs the two formulas above and re-renders the numbers.

The maintenance section adds a second calculation, in the page itself:
- **`research/[brand]/[model]/page.tsx:36-40`** — **annual upkeep estimate**: for every maintenance
  item that has a service interval, amortise it to a year at 15,000 km/year
  (`price × (15000 / intervalKm)`) and sum. One-off "major" jobs (no interval) are shown as reference
  prices only.

### BRTA paper-value tracker — `brta.ts` `brtaPaperValue()` (`:24-53`)

Shown on used/reconditioned cars: how many years of import-eligible registration life remain.
- **`:29-30`** — `age = thisYear − manufactureYear`; `remaining = maxAgeYears − age`
  (`maxAgeYears` is the admin setting `importEligibilityMaxAgeYears`, default 5).
- **`:32-44`** — if `remaining ≤ 0` the car is **"aged out"** (past the limit) with a clear label.
- **`:48`** — otherwise `pct` (the progress-bar fill) = `remaining / maxAgeYears × 100`.

This same helper is reused on the auction cost sidebar (`CostSidebar.tsx:96-104`) and the used-car
detail page (`used-cars/[id]/page.tsx:52`).

---

# Part 6 — AI Assistant

**What the user does:** type a plain-language brief ("family SUV under 40 lakh, good mileage") and get
a **ranked shortlist across all three pillars** with reasons and trade-offs, plus a conversational
reply.

### Files at a glance

| Layer | File | Role |
|---|---|---|
| Frontend (page) | `web/src/app/(app)/assistant/page.tsx` | shell |
| Frontend (chat) | `web/src/app/(app)/assistant/Assistant.tsx` | chat UI |
| Backend (entry) | `web/src/lib/assistant-actions.ts` | orchestrates a request |
| Backend (parse) | `web/src/lib/assistant/requirements.ts` | plain text → structured needs (no key needed) |
| Backend (LLM) | `web/src/lib/assistant/llm.ts` | optional Claude API layer |
| Backend (rank) | `web/src/lib/assistant/recommend.ts` | scores real inventory |

**Important:** this feature works **with or without** an AI API key. Without a key it uses a
deterministic parser and templated prose; the **ranking and inventory are real either way**.

### The flow — `assistant-actions.ts` `askAssistant()` (`:16-61`)

1. **`:17`** — `requireUser()`.
2. **`:23-24`** — try the LLM to extract requirements (`extractWithLlm`); if no key/failure, fall back
   to the deterministic `parseRequirements`.
3. **`:25`** — `recommend(req)` ranks the actual database inventory.
4. **`:54`** — ask the LLM for a friendly reply *grounded on the matched cars* (`:47-52` builds an
   "only refer to these" note); if no key, use the templated answer (`:29-43`).
5. **`:56-60`** — return the answer + suggestions + a `usedLlm` flag (so the UI can badge it honestly).

### Requirement extraction — `requirements.ts`

- **`parseBudget()` (`:23-37`)** — understands "25 lakh"/"25L" (`:26-27`), "2 crore" (`:29-30`), and a
  bare "under 2500000" (`:33-34`).
- **`parseRequirements()` (`:39-61`)** — regexes for seats (`:42`), and boolean flags for
  fuel-efficient / family / city / lowest-TCO by keyword matching (`:48-51`), preferred makes (`:52`),
  and body type SUV/Sedan/Hatch (`:53-59`).

### The ranking engine — `recommend.ts` `recommend()` (`:42-232`)

This is the heart of the assistant. Every score comes from **real row data**.
- **`:43-55`** — loads all three pillars' inventory + research + settings + FX **in parallel**.
- **`scoreCommon()` (`:62-103`)** — the shared scorer:
  - **`:71`** — **hard budget filter**: over budget → dropped entirely (returns `null`).
  - **`:72-74`** — cheaper-than-budget earns "headroom" points (base 40 + up to 20).
  - **`:79-82`** — matching body type (+15); **`:84-92`** — 7-seat requests reward the Xpander and
    penalise 5-seaters, with an explicit trade-off note.
- **Pillar 1 new cars (`:106-139`)** — adds warranty & fuel-economy reasons (`:118-123`).
- **Pillar 2 used (`:142-181`)** — rewards BRTA-verified ownership (`:154-160`), flags accident
  history and mileage as trade-offs (`:161-165`), and pulls a "known issue" from the Research Hub
  (`:167-168`).
- **Pillar 3 reconditioned (`:184-224`)** — prices each lot at a **full landed cost** (reusing
  `computeLandedCost`, `:186-193`) so a Japanese import is compared on its *real* delivered price,
  not the yen bid. Notes the duty band (`:200`, `:208-211`).
- **`:231`** — sort by score, return the top few. Trade-offs are surfaced, not hidden — as the FR
  requires.

### The optional LLM — `llm.ts`

- **`:12-15`** — targets Claude's Messages API; `llmConfigured()` is simply "is `ANTHROPIC_API_KEY`
  set?".
- **`extractWithLlm()` (`:25-73`)** — asks the model to return **only JSON** matching the
  `Requirements` shape (`:17-22` system prompt), tolerates a stray code fence (`:52`), and **merges
  with the deterministic parser as a safety net** (`:58-69`) so a missing field never breaks ranking.
- **`chatReply()` (`:85-112`)** — the conversational answer, constrained to the matched inventory so
  it can't invent listings.

---

# Part 7 — Service Center Finder + live route (Google-Maps style)

**What the user does:** search an area or use their location → see real nearby car service centers on
a map, filter by radius/category → tap one to get a **real driving route with road distance & drive
time**.

### Files at a glance

| Layer | File | Role |
|---|---|---|
| Frontend (page) | `web/src/app/(app)/services/page.tsx` | title + finder |
| Frontend (UI) | `web/src/app/(app)/services/ServiceFinder.tsx` | search, radius, filters, list, route banner |
| Frontend (map) | `web/src/app/(app)/services/ServiceMap.tsx` | Leaflet map + pins + route line |
| Backend | `web/src/lib/services-actions.ts` | geocode, search shops, route |
| External (free) | Nominatim, Overpass, OSRM, OpenStreetMap tiles | no API key |

**Everything here is real data with free, keyless APIs** — no simulation.

### Backend — `services-actions.ts`

- **`geocodeArea()` (`:57-75`)** — turns typed text ("Dhanmondi, Dhaka") into coordinates via
  **OpenStreetMap Nominatim**. Runs server-side so there are no browser CORS issues and it can send
  the polite `User-Agent` these services require.
- **`searchServiceCenters()` (`:77-180`)** — the real shop search:
  - **`:85`** — clamps the radius to 1–25 km and converts to metres.
  - **`:86-95`** — builds an **Overpass** query for `car_repair`, `car` dealers, `tyres`,
    `car_parts`, and `car_wash` within the radius.
  - **`:99-128`** — **reliability layer:** three free Overpass mirrors, tried in turn, in **two
    passes with a backoff** — because the public servers are frequently busy. If all fail, it returns
    a clear "try again" message (never fake data).
  - **`:135-172`** — parses results into `{ name, category, lat, lng, distanceKm, address, phone }`,
    de-duplicating and skipping unnamed points.
  - **`:47-55` `haversine()`** — the straight-line "how far is this shop" distance (great-circle
    formula) used to sort results and label each card.
  - **`:178-179`** — sort by distance, cap at 40.
- **`routeBetween()` (`:188-236`)** — the **live driving route** (the Google-Maps part):
  - calls the free **OSRM** demo server for `driving` directions between origin and the chosen shop;
  - OSRM returns distance (metres) and duration (seconds) → converted to **km** and **minutes**;
  - the road geometry comes back as GeoJSON `[lng, lat]` and is **flipped to `[lat, lng]`** for
    Leaflet, so the exact road path can be drawn on the map.

### Frontend

**`ServiceFinder.tsx`** — orchestrates state (query, radius, origin, centers, category, selected,
route). Key logic:
- the **radius buttons** re-run the search around the current point; the **category chips** are
  derived from the results with live counts and filter the map + list instantly (client-side, no
  extra API call).
- `selectCenter(id)` — when you tap a center, it calls `routeBetween(origin → center)` and stores the
  result; the **route banner** shows "X.X km by road · Y min drive" with a Directions button; picking
  a different center replaces the route.

**`ServiceMap.tsx`** — a Leaflet map (free OpenStreetMap tiles):
- a blue "you are here" dot + red pins for each center; `drawRoute()` paints the OSRM road path as a
  blue line with a white casing (the familiar Google-Maps look) in its **own layer**, so redrawing
  pins and redrawing the route never wipe each other, and re-selecting never stacks two lines.

---

# Part 8 — Cart & Payment

**What the user does:** add anything (new car, used car, reconditioned lot, mod part) to **one
cross-pillar cart**, then check out for the whole total.

### Files at a glance

| Layer | File | Role |
|---|---|---|
| Frontend (page) | `web/src/app/(app)/cart/page.tsx` | cart list + total |
| Frontend (UI) | `web/src/app/(app)/cart/CartView.tsx` | remove/checkout buttons |
| Frontend (add) | `web/src/components/AddToCartButton.tsx` | used everywhere |
| Backend (cart) | `web/src/lib/cart-actions.ts` | add / remove / checkout |
| Backend (gateways) | `web/src/lib/payments/gateways.ts` | SSLCommerz + bKash |
| Backend (callbacks) | `web/src/app/api/payments/{sslcommerz,bkash}/callback/route.ts` | gateway returns |
| Database | `CartItem`, `Payment`, `Escrow` | |

### The cart — `cart-actions.ts`

**The security centrepiece is `resolveItem()` (`:18-76`):** whatever kind of item you add, the price
and title are **looked up fresh from the server**, from whichever table `kind` points at — so the
browser can **never inject its own price**.
- **`:19-30`** new car → price from `NewCarVariant`.
- **`:32-42`** used car → price from `UsedCarListing` (and only if it's actually for sale).
- **`:44-52`** mod part → price from `Part`.
- **`:54-75`** reconditioned lot → price is a **full landed-cost calculation** (`landedCostFor`),
  because a reconditioned car's "price" is its delivered cost, not the yen bid.

**`addToCart()` (`:78-103`)** — resolves the item, refuses duplicates (`:84-87`), writes a `CartItem`
with the **server-resolved** title/subtitle/amount (`:89-98`), and revalidates the header cart badge
(`:101`).

**`checkoutCart()` (`:121-137`)** — this is honest about its state:
- **`:129-132`** — marks all cart items `PAID`.
- **`:136`** — returns `demo: true`. The comment at **`:115-120`** says exactly why: with real
  SSLCommerz/bKash sandbox keys in `web/.env` this would redirect to the hosted gateway; **until
  those keys are added, checkout completes in clearly-labelled demo mode** — it *never* pretends a
  real gateway responded.

**Cart total** is computed in the page — `cart/page.tsx:10`:
`items.reduce((s, i) => s + Number(i.amountBdt), 0)`.

### The real payment gateways — `payments/gateways.ts`

These are wired for **real sandbox credentials**, not mocks:
- **`sslcommerzConfig()` (`:18-27`)** / **`bkashConfig()` (`:29-40`)** — read keys from the
  environment; `configured` is true only when the keys exist. **If a gateway isn't configured, the
  checkout refuses rather than faking success** (`:78-80`).
- **`sslcommerzInit()` (`:68-123`)** — creates a real SSLCommerz session: builds the form body with
  amount/currency/customer + success/fail/cancel callback URLs (`:82-102`), POSTs to the
  sandbox/live endpoint (`:105-111`), and returns the hosted **`GatewayPageURL`** to redirect to
  (`:116-119`). The buyer enters card details **on SSLCommerz's page** — the app never handles them.
- **`sslcommerzValidate()` (`:130-159`)** — after payment, **re-checks the transaction directly with
  SSLCommerz** (`:148-149`), because a browser "success" redirect could be forged. Trust the
  server-to-server validation, not the redirect.
- **bKash (`:166-275`)** — the same shape: grant a token (`:166-192`), create a payment (`:194-238`),
  then **execute/capture** it (`:241-275`), reading the real `trxID`.

### Where escrow fits

For auction wins the money is meant to be **held in escrow** (`Payment.status = HELD_IN_ESCROW`,
`schema.prisma:729-735`) and released after a dispute window (`Escrow`, `schema.prisma:768`). The
escrow release/dispute actions live in `web/src/lib/escrow-actions.ts`.

---

# Appendix A — "Where is X?" quick index

| I want to see… | Open this |
|---|---|
| The database connection | `web/src/lib/prisma.ts:13` |
| Every table definition | `web/prisma/schema.prisma` |
| Login / password check | `web/src/auth.ts:27` |
| Permission guards | `web/src/lib/session.ts` |
| Bid rules (increment, anti-snipe, anti-race) | `web/src/lib/bid-actions.ts:30-101` |
| Landed-cost formula | `web/src/lib/landed-cost.ts:50-79` |
| Import duty band lookup | `web/src/lib/landed-cost-server.ts:7-14` |
| Live JPY→BDT rate | `web/src/lib/fx.ts:54-81` |
| Fitment (which parts fit) | `web/src/lib/fitment.ts:37` + `web/src/lib/vehicles.ts:69` |
| TCO calculator | `.../research/[brand]/[model]/TcoCalculator.tsx:25-28` |
| BRTA paper-value formula | `web/src/lib/brta.ts:24-53` |
| AI ranking | `web/src/lib/assistant/recommend.ts:62-103` |
| Nearby shops (Overpass) | `web/src/lib/services-actions.ts:77-180` |
| Driving route (OSRM) | `web/src/lib/services-actions.ts:188-236` |
| Cart price protection | `web/src/lib/cart-actions.ts:18-76` |
| Payment gateways | `web/src/lib/payments/gateways.ts` |
| Admin-tunable numbers | `web/src/lib/settings.ts:7-27` |

# Appendix B — The two backend patterns, side by side

**Server Action** (a button/form calls it) — mutation, checks permission, writes DB, revalidates:
```ts
"use server";
export async function placeBid(auctionCarId, amountJpy) {
  const buyer = await currentBuyer();          // 1. who are you? (permission)
  if (!buyer) return { error: "..." };
  // 2. validate + 3. write inside a transaction
  // 4. revalidatePath("/auctions")            // refresh the screen
}
```

**API route** (the browser `fetch`es it on a timer) — read-only live state:
```ts
export async function GET(_req, { params }) {
  const session = await auth();                 // permission
  const state = await readLotState(id);         // read
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}
```

Every feature in this manual is built from those two shapes plus Server Components that read the DB
directly. Once you can spot which of the three you're looking at, the whole codebase reads the same
way.
