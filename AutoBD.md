# AutoBD Exam Rulebook — Reconditioned Import & Modification

Everything you need to **modify anything** in these two features during the exam: where each piece
lives (frontend / backend / database / API), what every calculation does, and how the layers
connect. Paths are relative to the repo; the app is under `web/`. `file.ts:12` = *file, line 12*.

> **Golden rule you can say out loud in a viva:** the frontend never decides money or permissions.
> Every price is re-computed on the **server**, and every action first checks **who you are**.

---

# PART 0 — The 4 layers & how they connect (memorise this)

| Layer | Where | What it is |
|---|---|---|
| **Database** | `web/prisma/schema.prisma` (models) → reached via `web/src/lib/prisma.ts` | Postgres tables. `prisma.<model>.<method>()` |
| **Backend** | `web/src/lib/*.ts` | Pure logic (calculations) + **Server Actions** (`"use server"`, mutations) |
| **API** | `web/src/app/api/**/route.ts` | `GET`/`POST` handlers the browser polls with `fetch()` |
| **Frontend** | `web/src/app/(app)/**/page.tsx` + `*.tsx` components | React UI |

### The 3 wiring patterns (this is the "connection" the exam tests)
1. **Server Component** (`page.tsx`, `async`): runs on the server → calls `await prisma...` or a lib
   function **directly**, returns finished HTML. *No fetch.*
2. **Server Action** (`"use server"` function): a client component calls it like a normal function;
   Next.js turns it into a secure POST. Used for **mutations** (place bid, create part).
3. **API route** (`route.ts`): the browser `fetch`es it on a **timer** for live data (bid clock).

### The database connection
- `web/src/lib/prisma.ts:13` → `new PrismaPg({ connectionString: process.env.DATABASE_URL })`.
  The DB URL is in `web/.env`. Every backend file does `import { prisma } from "@/lib/prisma"`.

### Adding a DB field (you WILL likely be asked this)
1. Add the field in `schema.prisma` (e.g. `color String?` inside a model).
2. Run in `web/`: `npx prisma migrate dev --name add_color` then `npx prisma generate`.
3. Now `prisma.<model>` has the field. Use it in the create/read/update + show it in the page.
4. Restart the dev server if types don't refresh: `npm run dev -- -p 1398`.

### The "no number is hardcoded" rule
Duty %, bid increment, anti-snipe window, shipping, pooling discount — all live in the DB and are
read by `web/src/lib/settings.ts` (`getSettings()` line 35). Defaults are `settings.ts:7-27`.

---

# PART 1 — RECONDITIONED IMPORT (auctions)

**User story:** pick a licensed agent → open a live auction lot → **bid in JPY** → watch a **live
landed-cost in BDT** update with every bid → win → pay via escrow.

## 1.1 Database (the tables)

| Model | Line | Key fields | Role |
|---|---|---|---|
| `Organization` | `schema.prisma:84` | `feeType` (PERCENT/FLAT), `feeValue`, `status`, `ratingAvg`, `successfulImports`, `avgTurnaroundDays` | the bidding **agent** |
| `Auction` | `:378` | `house`, `location`, `startsAt`, `status` (SCHEDULED/LIVE/ENDED), `createdByAdminId` | a **session** |
| `AuctionCar` (lot) | `:402` | `make`,`model`,`manufactureYear`,`mileageKm`,`engineCc`,`grade`,`chassisCode`, `startingPriceJpy`,`reservePriceJpy`,`durationSeconds`,`endsAt`,`status`,`extensionCount`,`winningBidId`,`photoUrls`,`videoUrls` | a **car** |
| `Bid` | `:452` | `auctionCarId`,`bidderId`,`amountJpy` | one bid (price only moves here) |
| `DutyRate` | `:896` | `ccMin`,`ccMax`,`ratePercent` | duty band table |
| `PlatformSetting` | `:910` | `key`,`value` | tunable numbers |
| `ExchangeRate` | `:917` | `rate`,`fetchedAt` | cached JPY→BDT |
| `Container` | `:821` | `capacity`,`departureDate`,`status` | shipping pool |

**Facts examiners love:**
- Price only ever moves through the `Bid` table. There is **no** admin/org bid path anywhere → shill
  bidding is impossible *by construction* (`schema.prisma:5-8`).
- `Bid` index `@@index([auctionCarId, amountJpy(sort: Desc)])` (`:463`) = fast "highest bid" lookup.

## 1.2 Connection map (follow the data)

```
Server Component pages  ──read──►  prisma / lib functions  ──►  Postgres
  auctions/page.tsx (agent list)
  .../lots/[lotId]/page.tsx (bidding)   ── passes initial state ──►  <LiveLotProvider> (client)
                                                                        │ every 3s
                                          fetch /api/lots/[id]/state ◄──┘  (API route)
Client "Place bid" button ──Server Action placeBid()──► writes Bid ► DB
```

## 1.3 THE CALCULATIONS & LOGIC (line by line)

### (A) Landed cost — the headline formula · `web/src/lib/landed-cost.ts:50-79`
Pure function (no DB) so the **browser recomputes it live** as the bid moves.
```
55  bidBdt   = bidJpy * rate                       // JPY bid → BDT at live FX
57-60 shipping = pooled ? flat*(1 - discount%/100) : flat   // container-pool cuts shipping only
63  duty     = (bidBdt + shipping) * dutyRate% / 100         // CIF approx: duty on bid+freight
65  fee      = agentFeeFor(agent, bidBdt)          // % of bid  OR  flat ৳  (agentFeeFor line 44-48)
77  total    = bidBdt + duty + shipping + fee + port
```
- **Agent fee** `agentFeeFor` (`:44-48`): `FLAT` → fixed ৳; else `(bidBdt * feeValue)/100`.
- **Duty %** comes from `dutyRateFor(engineCc)` in `landed-cost-server.ts:7-14`: loads `DutyRate`
  bands, picks the **highest band whose `ccMin` the engine clears** (`.at(-1)`, line 9-11); no band → `0`.
- **Live recompute in the browser:** `CostSidebar.tsx:29-33` calls the *same* `computeLandedCost`
  with `state.currentBidJpy` + `state.rate` from the poll → every row (`:42-50`) updates. Toggling
  "pooled" (`:70-82`) flips one boolean and the total re-derives.

### (B) Bid rules — `web/src/lib/bid-actions.ts` `placeBid()` `:30-101`
```
31-32  only a Buyer can bid (no admin/org path anywhere)
44,92  runs inside a Serializable transaction → 2 simultaneous bids can't both win;
        Postgres aborts the loser → caught at :97-100 as "another bid landed — retry"
51     lot must be status LIVE
55-56  msRemaining = endsAt - now  (must be > 0)
59-60  currentJpy = top bid OR startingPrice;  minNext = top ? current + increment : current
62-64  reject if amount < minNext
67-68  anti-snipe: inWindow = msRemaining < antiSnipeWindowSeconds*1000
70-72  write the Bid row  ← the ONLY place price moves
76-82  if inWindow → push endsAt out by antiSnipeExtendSeconds, bump extensionCount
```
- **Increment / window / extend** are settings (`settings.ts` defaults: increment 5000 `:16`, window
  30s `:12`, extend 60s `:13`).

### (C) Live lot state — `web/src/lib/auction.ts` `readLotState()` `:25-63`
```
38-42  activeBidders = COUNT(DISTINCT bidderId) on this lot
45     currentBidJpy = top bid, else startingPrice
46-48  secondsRemaining = floor((endsAt - now)/1000), min 0
55     minNextBidJpy = hasBids ? current + increment : current
```

### (D) Lazy settle — `auction.ts settleLotIfEnded()` `:70-91`
No scheduler exists, so **the first read after the clock hits 0 closes the lot**:
```
82     reserveMet = topBid exists AND (no reserve OR topBid >= reserve)
84-90  reserveMet ? status=SOLD + winningBidId  :  status=NO_SALE
```
Called at the top of the bidding page (`page.tsx:32`) and the state API (`state/route.ts:18`).

### (E) Live transport — `.../lots/[lotId]/live-lot-context.tsx`
```
43     POLL_MS = 3000
60-70  refresh(): fetch(`/api/lots/${lotId}/state`) → setState
73-76  poll every 3s (other buyers' bids/extensions appear)
80-85  tick the countdown locally every 1s; each poll overwrites it, so an
        anti-snipe extension shows as time going UP (server is source of truth)
```
- The **API route** `api/lots/[id]/state/route.ts`: `:18` settles if ended, `:20` returns
  `readLotState` + live FX, `:23-26` `Cache-Control: no-store`.

### (F) Bid buttons — `BidControls.tsx`
- `QUICK_STEP = 25000` (`:11`); quick amount = `max(minNext, current + 25000)` (`:95`).
- `customValid` = number ≥ `minNextBidJpy` (`:97`). `bid()` (`:33-49`) calls `placeBid`, shows the
  anti-snipe notice if `extendedBySeconds` came back.

### (G) Live stats — `LiveStats.tsx`
- `bidBdt = currentBidJpy * rate` (`:11`), countdown via `formatCountdown` (`time.ts:67`), `closing`
  turns the clock red inside the anti-snipe window (`:13`).

### (H) FX rate — `web/src/lib/fx.ts getJpyToBdt()` `:54-81`
Cached in `ExchangeRate` for `exchangeRateTtlMinutes` (60). Fresh → cache; stale → refetch from the
free API (`:17`); API down → last cached, else fallback `0.76` (`:20`).

### (I) Anonymised feed — `web/src/lib/bid-feed.ts`
`anonLabel(bidderId)` (`:11-17`) hashes the id → "Bidder #NN"; you see **your own** bids as "You"
(`:32`). Served by `api/lots/[id]/feed/route.ts`.

### (J) Times/countdown — `web/src/lib/time.ts`
`formatCountdown` `:67-75` → "2:34" / "1:02:34". `sessionDayLabel` `:39-47` → "Today"/"Tomorrow"/"Thu"
in Dhaka time.

## 1.4 Frontend files

| File | Layer | Shows |
|---|---|---|
| `auctions/page.tsx` | Server Comp | approved agents (`OrgStatus.APPROVED` filter `:29-32`) + sort chips `SORTS` `:12-16` |
| `.../[id]/page.tsx` | Server Comp | one agent's profile |
| `.../sessions/[auctionId]/lots/[lotId]/page.tsx` | Server Comp | the bidding screen; loads lot+state+fx+duty, wraps in `<LiveLotProvider>` `:98-109` |
| `LiveStats.tsx`, `BidControls.tsx`, `CostSidebar.tsx` | Client | live numbers / bid buttons / cost breakdown |
| `live-lot-context.tsx` | Client | the 3s poll + 1s tick |

## 1.5 Admin CRUD · `web/src/lib/system-recon-actions.ts`
All `requireAdmin()` + `(prev, formData)` shape (plug into forms via `useActionState`).
- **Org:** `createOrg` `:82` (also makes a login `User`, bcrypt hash `:98`, approved on creation
  `:106`), `updateOrg`, `deleteOrg`, `setOrgStatus` `:159` (APPROVE/REJECT/SUSPEND).
- **Auction:** `createAuction` `:204`, `updateAuction`, `deleteAuction`, `setAuctionBroadcast` `:250`.
- **Lot:** `createLot` `:341`, validated by `readLotFields` `:282-339`:
  - **Import-age gate is really "valid year"**: `manufactureYear` 1980..thisYear (`:312-313`).
  - `durationSeconds` 30..86400 (`:318-319`); `engineCc` > 0; `startingPriceJpy` > 0.
  - Media: `addLotPhotos` `:380` (max 12), `addLotVideos` `:422` (max 6).

## 1.6 ⚡ HOW TO MODIFY — Reconditioned Import cheat sheet

| Task | Edit | Connects to |
|---|---|---|
| Change **duty %** or bands | `DutyRate` rows in DB (admin/seed), read by `dutyRateFor` `landed-cost-server.ts:9-11` | flows into `computeLandedCost:63` |
| Change the **landed-cost formula** (e.g. add insurance) | `landed-cost.ts:50-79` (add a term, add it to `total:77` + to the `LandedCost` type `:32-42`) | `CostSidebar.tsx` add a `<Row>` `:42-50` |
| Change **bid increment / anti-snipe window/extend** | `settings.ts:12-16` defaults **or** the `PlatformSetting` DB rows | used in `placeBid:60,67-68` + shown in `BidControls:105` |
| Change **quick-bid step** (25k) | `BidControls.tsx:11` `QUICK_STEP` | button `:121` |
| Change **poll speed** | `live-lot-context.tsx:43` `POLL_MS` | — |
| Change **reserve/settle logic** | `auction.ts:82` (`reserveMet`) | `settleLotIfEnded:84-90` |
| Add a **lot field** (e.g. `color`) | schema `AuctionCar` + migrate → `readLotFields` (`system-recon-actions.ts:282`) → show in `lots/[lotId]/page.tsx` chips `:166-170` | admin form + DB |
| Change **agent-fee math** | `landed-cost.ts:44-48` `agentFeeFor` | `Organization.feeType/feeValue` `schema:98-99` |
| Change **who can be an agent** shown | `auctions/page.tsx:29` (`status` filter) | `Organization.status` |
| Change **countdown format** | `time.ts:67-75` | `LiveStats` |
| Change **FX fallback / TTL** | `fx.ts:20` (fallback) / `settings.ts:17` (TTL) | `getJpyToBdt` |

---

# PART 2 — MODIFICATION (parts & fitment + 3D)

**User story:** pick **brand → model → year → version** → the catalog filters to parts that **fit**
your car (by JDM **chassis code**) → add to cart → optionally open the **3D configurator**.

## 2.1 Database

| Model | Line | Key fields | Role |
|---|---|---|---|
| `Part` | `schema.prisma:543` | `name`,`brand`,`category` (enum),`priceBdt`,`brtaLegal`,`boltPattern`,`offsetMm`,`photoUrls`,`videoUrls` | a catalog part |
| `PartFitment` | `:561` | `partId`,`chassisCode` (`@@unique [partId, chassisCode]` `:567`) | "this part fits chassis X" |
| `PartCategory` (enum) | `:535` | WHEELS, BODY_KIT, INTERIOR, LIGHTING | |
| `ConfigCar`,`Rim`,`Spoiler`,`SavedBuild` | `:571,583,593,603` | 3D-configurator data | |

**Core idea:** compatibility = **chassis code**. A part's fitments list which chassis codes it bolts on.

## 2.2 Connection map

```
modifications/page.tsx (Server Comp)
  ─ readCatalog(chassis)  ─►  prisma.part.findMany({ include: fitments })  ─►  DB
  ─ readGarage(buyerId)   ─►  cars the buyer WON
        │ passes parts + garage as props
        ▼
  <ModStudio> (client): brand→model→year→version → resolveChassis() → filter parts
        │ "Add to cart" button
        ▼
  addToCart(MODIFICATION, partId)  ── Server Action ──►  CartItem (price re-looked-up server-side)
```

## 2.3 THE LOGIC & CALCULATIONS

### (A) Fitment / compatibility — `web/src/lib/fitment.ts readCatalog()` `:17-40`
```
18-21  load every Part + its fitments
37     compatible = chassisCode === null ? true : fits.includes(chassisCode)
```
So with **no car** chosen every part shows; with a car chosen each part is flagged fit/not-fit.
- `readGarage(buyerId)` `:43-54` = auction lots this buyer **WON** (`status SOLD, winningBid.bidderId = you` `:45`).

### (B) The cascade brand→model→year→version→chassis — `web/src/lib/vehicles.ts`
- `VEHICLES` table (`:21-47`) maps `{brand, model, year, version} → chassisCode`.
- Helpers: `vehicleBrands()`, `vehicleModels(brand)`, `vehicleYears(brand,model)`,
  `vehicleVersions(brand,model,year)` (`:51-68`).
- `resolveChassis(brand,model,year,version)` `:69-80` → the chassis code (or `null`).

### (C) The picker + filter — `web/src/app/(app)/modifications/ModStudio.tsx`
```
40-44  state: brand, model, year, version, chassis
54-66  picking each level clears the ones below; picking version → resolveChassis() (:65)
76-81  visible = parts
         .map(p => ({...p, compatible: chassis===null ? true : p.fits.includes(chassis)}))  (:78)
         .filter(category === "ALL" || p.category===category)
         .filter(chassis && hideIncompatible ? p.compatible : true)   (:80)
83     compatibleCount = parts that fit the chosen chassis
```
- Part card shows green **"Fits"** / grey **"Doesn't fit"** (`:230`); incompatible parts still show
  *what they're listed for* (`:247-249`).
- **3D tab** embeds `public/kaido-multicar-garage.html` in an `<iframe>` (`:271-277`), theme passed via `?theme=`.

### (D) Prices / cart
- **Part → cart:** `AddToCartButton` (client) calls `addToCart(MODIFICATION, partId)`; the server
  **re-looks-up the Part price** in `cart-actions.ts resolveItem` (`:44-52`) so the browser can't fake it.
- **3D build → cart:** the iframe posts the build to `ModStudio` (message listener), which calls
  `addBuildToCart` (`cart-actions.ts`). Build price = **paint + finish**, re-derived server-side from
  fixed tables (`ALLOWED_PAINT_PRICES`, `FINISH_PRICES`) — rims/spoilers are cosmetic (no charge).

## 2.4 Frontend files

| File | Layer | Role |
|---|---|---|
| `modifications/page.tsx` | Server Comp | loads catalog + garage (`readCatalog`/`readGarage` `:23-26`) |
| `ModStudio.tsx` | Client | cascade picker, category filter, parts grid, 3D tab |
| `public/kaido-multicar-garage.html` | static | Three.js 3D configurator |

## 2.5 Admin CRUD · `web/src/lib/system-parts-actions.ts`
`requireAdmin()` + `(prev, formData)`.
- `createPart` `:78` / `updatePart` `:91` / `deletePart` `:110`.
- `readPartFields` `:27-63`: name/brand required, `category` must be a valid `PartCategory` (`:45`),
  `priceBdt` > 0 (`:49`), `brtaLegal` = checkbox present (`:58`), `offsetMm` optional int.
- `fitmentsFrom(fd)` `:66-76` = checked chassis checkboxes (`fd.getAll("chassis")`, deduped).
  `updatePart` deletes old fitments then recreates them (`:99-105`).
- Media: `addPartPhotos` `:125` (max 8), `addPartVideos` `:167` (max 4).

## 2.6 ⚡ HOW TO MODIFY — Modification cheat sheet

| Task | Edit | Connects to |
|---|---|---|
| **Change what "fits"** (fitment logic) | `fitment.ts:37` (`compatible` flag) **and** `ModStudio.tsx:78` (client recompute) | both must agree |
| Add a **car** to the picker | add a row to `VEHICLES` in `vehicles.ts:21-47` | cascade helpers pick it up automatically |
| Add a **part category** | add to `PartCategory` enum (`schema:535`) + migrate + label in `parts.ts CATEGORY_LABEL:30-35` | admin form dropdown + filter chips |
| Change a **part price** | admin `updatePart` (DB), or seed | `resolveItem:44-52` re-reads it for cart |
| Add a **part field** (e.g. `weightKg`) | schema `Part` + migrate → `readPartFields` (`system-parts-actions.ts:27`) → show in `ModStudio` card | admin form + DB |
| Change **max photos/videos** per part | `system-parts-actions.ts:16-17` | `addPartPhotos/Videos` checks |
| Default **hide-incompatible** on/off | `ModStudio.tsx:47` `useState(true)` | filter `:80` |
| Change **3D build pricing** | `cart-actions.ts` `FINISH_PRICES` / `ALLOWED_PAINT_PRICES` | `addBuildToCart` |
| Change **BRTA-legal default** | schema `Part.brtaLegal @default(true)` (`:549`) | card warning `ModStudio.tsx:242-246` |

---

# PART 3 — Every file for these two features (quick index)

**Reconditioned Import**
- DB: `web/prisma/schema.prisma` (Auction `:378`, AuctionCar `:402`, Bid `:452`, Organization `:84`, DutyRate `:896`)
- Backend: `bid-actions.ts` · `auction.ts` · `landed-cost.ts` · `landed-cost-server.ts` · `fx.ts` · `settings.ts` · `bid-feed.ts` · `time.ts` · `system-recon-actions.ts`
- API: `app/api/lots/[id]/state/route.ts` · `app/api/lots/[id]/feed/route.ts`
- Frontend: `app/(app)/auctions/page.tsx` · `.../lots/[lotId]/page.tsx` · `LiveStats.tsx` · `BidControls.tsx` · `CostSidebar.tsx` · `live-lot-context.tsx`

**Modification**
- DB: `schema.prisma` (Part `:543`, PartFitment `:561`, PartCategory `:535`)
- Backend: `fitment.ts` · `parts.ts` · `vehicles.ts` · `system-parts-actions.ts` · `cart-actions.ts` (addToCart / addBuildToCart)
- Frontend: `app/(app)/modifications/page.tsx` · `ModStudio.tsx` · `public/kaido-multicar-garage.html`

---

# PART 4 — Answers to likely viva questions

- **"How does the price stay honest?"** Server re-computes it: bids only in `Bid` table; landed cost
  is a pure function re-run server-side; cart prices re-looked-up in `resolveItem`; nothing trusts the browser.
- **"How is it live without WebSockets?"** Short-polling: the client `fetch`es `/api/lots/[id]/state`
  every 3s (`live-lot-context.tsx:43`) and ticks the clock locally between polls.
- **"What stops two people winning the same lot?"** A **Serializable** DB transaction in `placeBid`
  (`bid-actions.ts:92`) — Postgres aborts the losing racer.
- **"How does anti-snipe work?"** A bid inside the last `antiSnipeWindowSeconds` pushes `endsAt` out by
  `antiSnipeExtendSeconds` and bumps `extensionCount` (`bid-actions.ts:67-82`).
- **"How does the fitment checker know a part fits?"** By **chassis code**: `PartFitment` rows list the
  codes a part fits; `readCatalog` sets `compatible = fits.includes(chassisCode)` (`fitment.ts:37`).
- **"How does brand→model→year→version become a chassis code?"** `resolveChassis()` looks it up in the
  static `VEHICLES` table (`vehicles.ts:69`).

> **Exam tip:** when told to modify something, name the **layer** first (DB/backend/API/frontend),
> open the file from the cheat sheet, change it, and mention the **one other place** it connects to
> (the "Connects to" column). That's what earns the marks.
