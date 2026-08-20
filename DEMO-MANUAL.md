# AutoBD — Code Demonstration Manual

**Two features, end to end: the Research Hub and the Modification Studio.**
Frontend → backend → database → the web-scraper CLI → the scheduled API — every file, what it does, how to run it live, and the questions you'll likely be asked.

All paths are from the repo root. App code lives in `web/`. Run every command from inside the `web/` folder.

---

## 0. The 60-second architecture (read this first)

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma 7 → Neon Postgres · Auth.js v5.

In this project code talks to the database in **three** ways. You'll point at each during the demo, so learn the names:

| Pattern | What it is | Runs where | Example in these features |
|---|---|---|---|
| **Server Component** | An `async` page/component that queries Prisma directly and returns HTML. No API call needed. | Server only | `research/page.tsx`, `modifications/page.tsx` |
| **Server Action** | A `"use server"` function a browser component can `await` like a normal function (Next handles the network). RPC-style, not a REST URL. | Server only | `priceForYear()`, `addToCart()` |
| **API route** | A real REST endpoint at a URL — `app/api/**/route.ts`. Testable in a browser/Postman. | Server only | `GET /api/cron/refresh-prices` |

**One more idea that explains half the code — data *in* vs data *refresh*:**

- **Seed** puts the starting data in the tables (`npx prisma db seed`).
- The **scraper** refreshes the live market prices later (CLI or cron).
- **Pages only ever *read* the tables** — they never scrape while a user waits. That's why the site stays fast and survives a scrape failure.

---
---

# FEATURE 1 — RESEARCH HUB

## 1.1 What it does

A "dream car research" section. You browse **brand → model → detail**, exactly like New Cars. On a model's page you see:

- **Live used-market price** (average, range, recent samples) — *scraped from Bikroy.com*.
- A **year selector** — because a 2016 Axio and a 2020 Axio aren't worth the same, it fetches the live price for the exact year on demand.
- **Reliability issues**, **specs**, and a **parts & maintenance cost** table (real BD workshop prices, with a "≈ ৳X/yr upkeep" estimate).
- A **Total-Cost-of-Ownership calculator** (reg tax, token tax, insurance, fuel).

## 1.2 Data flow

```
                    ┌─────────────────── writes prices ───────────────────┐
                    │                                                      │
  npx tsx prisma/scrape-bikroy.ts  ──┐                          ┌──►  MarketPrice  ◄─┐
  (manual CLI refresh)               ├─ share fetch+parse ──────┤                    │ reads (cached)
                                     │  (src/lib/research.ts)   ├──►  bikroy.com     │
  GET /api/cron/refresh-prices  ─────┘                          └────────────────────┘
  (scheduled, vercel.json daily 3am)                                                 │
                                                                                     │
  Browser ──► /research ──► /research/[brand] ──► /research/[brand]/[model] ─────────┘
             (brands)       (models)             (detail: reads ResearchModel +
                                                  MarketPrice + MaintenanceItem)
                                                        │
                                     pick a year ──► YearPriceSelector (client)
                                                        │ awaits
                                                  priceForYear()  ── live scrape for "<model> <year>"
                                                  (server action, src/lib/research-actions.ts)
```

**The one design decision that matters most:** the fetch-and-parse logic is a **pure module** (`src/lib/research.ts` — no Prisma, no `server-only`), so the *same code* is imported by **three** callers: the page components (for `brandOf`), the CLI scraper, and the cron route. One source of truth for "how we read Bikroy."

## 1.3 File map

| File | Layer | Role |
|---|---|---|
| `web/src/app/(app)/research/page.tsx` | Frontend (Server Component) | Brand grid. Groups models by brand. |
| `web/src/app/(app)/research/[brand]/page.tsx` | Frontend (Server Component) | Models within a brand. |
| `web/src/app/(app)/research/[brand]/[model]/page.tsx` | Frontend (Server Component) | The detail page (price, specs, reliability, maintenance, TCO). |
| `web/src/app/(app)/research/[brand]/[model]/YearPriceSelector.tsx` | Frontend (Client Component) | Year dropdown → calls the price-by-year server action. |
| `web/src/app/(app)/research/[brand]/[model]/TcoCalculator.tsx` | Frontend (Client Component) | Cost-of-ownership arithmetic. |
| `web/src/lib/research.ts` | **Backend, pure/shared** | `brandOf`, `fetchModelPrices`, `extractPrices`, `aggregate`. No DB. |
| `web/src/lib/research-actions.ts` | Backend (Server Action) | `priceForYear(model, year)` — live on-demand scrape. |
| `web/prisma/scrape-bikroy.ts` | **Scraper CLI** | Loops models, scrapes prices, reloads maintenance. Run by hand. |
| `web/src/app/api/cron/refresh-prices/route.ts` | Backend (API route) | Same scrape, on a schedule; secured by `CRON_SECRET`. |
| `web/vercel.json` | Config | Cron schedule: `0 3 * * *` (daily 03:00). |
| `web/prisma/research-models.ts` | Data (seed source) | The 14 models × 6 brands + specs/tax/fuel. |
| `web/prisma/maintenance.ts` | Data (seed + scraper source) | Curated parts/servicing costs per model. |

## 1.4 The scraper — the core of this feature

### (a) `src/lib/research.ts` — the shared engine

**Derive the brand from the name** (there is no separate Brand table for research — the brand is just the first word):

```ts
export function brandOf(name: string) {           // "Toyota Harrier" → { name:"Toyota", slug:"toyota" }
  const brand = name.trim().split(/\s+/)[0] || name;
  return { name: brand, slug: brand.toLowerCase() };
}
```

**Fetch a search page** with a real browser User-Agent and a 20-second timeout:

```ts
export async function fetchModelPrices(query: string): Promise<number[]> {
  const url = `https://bikroy.com/cars?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return extractPrices(await res.text());
}
```

**Parse prices out of the HTML** with a regex, and sanity-filter to drop junk (parts, typos):

```ts
export function extractPrices(html: string): number[] {
  const out: number[] = [];
  const re = /qa-advert-price">BDT\s+([\d,]+)/g;       // Bikroy tags every price with this class
  let m;
  while ((m = re.exec(html)) !== null) {
    const n = Number(m[1].replace(/,/g, ""));          // "12,50,000" → 1250000
    if (Number.isFinite(n) && n >= 100000 && n <= 100000000) out.push(n);  // 1 lakh … 10 crore
  }
  return out;
}
```

**Reduce to a summary** (this is what gets cached):

```ts
export function aggregate(prices) {
  if (prices.length === 0) return null;
  return {
    minPriceBdt: Math.min(...prices),
    maxPriceBdt: Math.max(...prices),
    avgPriceBdt: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    sampleCount: prices.length,
    samples: prices.slice(0, 6),
  };
}
```

### (b) `prisma/scrape-bikroy.ts` — the CLI you run in the demo

Loops every `ResearchModel`. For each: **(1)** reloads its maintenance costs, **(2)** scrapes its price and **upserts** it — or **deletes** the cached row if there are zero matches (self-healing, so a stale figure never lingers). A 1.5s polite pause between requests.

```ts
const prices = await fetchModelPrices(bikroyQuery(model.slug, model.name));
const agg = aggregate(prices);
if (!agg) {
  await prisma.marketPrice.deleteMany({ where: { researchModelId: model.id } });   // no matches → clear
} else {
  await prisma.marketPrice.upsert({
    where:  { researchModelId: model.id },
    update: { source: "bikroy", ...agg, scrapedAt: new Date() },
    create: { researchModelId: model.id, source: "bikroy", ...agg, scrapedAt: new Date() },
  });
}
await sleep(1500);
```

**Run it (from `web/`):**

```bash
npx tsx prisma/scrape-bikroy.ts
```

You'll see live log lines like `[price] Toyota Axio: 18 listings · avg ৳19,30,000 (৳12,50,000–৳27,00,000)`. If PowerShell blocks `npx`, use `npx.cmd tsx prisma/scrape-bikroy.ts`.

### (c) `app/api/cron/refresh-prices/route.ts` — the same job, scheduled

Identical scrape loop behind a **real URL**, so it can run automatically. Secured with a bearer token when `CRON_SECRET` is set; open in dev without one.

```ts
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... same loop: fetchModelPrices → aggregate → upsert/delete ...
  return Response.json({ ok: true, refreshedAt: new Date().toISOString(), results });
}
```

`web/vercel.json` wires the schedule:

```json
{ "crons": [{ "path": "/api/cron/refresh-prices", "schedule": "0 3 * * *" }] }
```

**Demo it in the browser (dev, no secret needed):** open `http://localhost:3000/api/cron/refresh-prices` — it returns JSON and refreshes the cache. This is the one Research-Hub endpoint that's Postman-testable.

## 1.5 Frontend walkthrough

- **`/research` (brands):** reads every `ResearchModel`, groups by `brandOf(name)` into brand cards showing model count and "from ৳X".
- **`/research/[brand]` (models):** filters models where `brandOf(name).slug === brand`, shows each with its cached market average.
- **`/research/[brand]/[model]` (detail):** one query pulls the model with `issues`, `marketPrice`, and `maintenance` included. Guards the URL — a Honda slug under `/research/toyota/...` 404s. The **annual upkeep estimate** amortises interval items at 15,000 km/yr:

  ```ts
  const annualEstimate = Math.round(
    model.maintenance.filter((m) => m.intervalKm)
      .reduce((sum, m) => sum + m.priceBdt * (15000 / m.intervalKm!), 0)
  );
  ```

- **`YearPriceSelector.tsx` (client):** the one place a scrape happens *while the user waits* — on demand, when they pick a year. It awaits the server action:

  ```ts
  // src/lib/research-actions.ts
  export async function priceForYear(modelName: string, year: number): Promise<YearPrice> {
    await requireUser();
    const prices = await fetchModelPrices(`${modelName} ${year}`);   // e.g. "Toyota Axio 2019"
    const agg = aggregate(prices);
    return agg
      ? { year, count: agg.sampleCount, avgBdt: agg.avgPriceBdt, minBdt: agg.minPriceBdt, maxBdt: agg.maxPriceBdt }
      : { year, count: 0 };
  }
  ```

## 1.6 Database tables (Prisma)

```prisma
model ResearchModel {
  id   String @id @default(cuid())
  slug String @unique
  name String                       // "Toyota Harrier" — brand derived from word 1
  specs String
  regTaxBdt Decimal; tokenTaxBdt Decimal; insuranceBdt Decimal; fuelPricePerL Decimal; kmPerL Decimal
  issues      ResearchIssue[]
  marketPrice MarketPrice?          // the scraped cache (1:1)
  maintenance MaintenanceItem[]     // curated parts/servicing costs
}

model MarketPrice {                 // written ONLY by the scraper/cron; read by pages
  researchModelId String @unique
  sampleCount Int; minPriceBdt Int; avgPriceBdt Int; maxPriceBdt Int
  samples Int[]; scrapedAt DateTime
}

model MaintenanceItem {             // "Engine oil + filter · ৳6,500 · every 8,000 km"
  category String                   // "Routine service" | "Wear & tear" | "Major job"
  name String; priceBdt Int; intervalKm Int?; note String?
}
```

**Where the data comes from:** `ResearchModel` + `MaintenanceItem` + `ResearchIssue` are seeded from `prisma/research-models.ts` and `prisma/maintenance.ts`. `MarketPrice` is *never* seeded — it appears the first time the scraper runs.

## 1.7 Live demo script (Research Hub)

1. **Show the site:** click **Research Hub** → 6 brand cards → click **Toyota** → click **Axio**. Point out the market-price card ("Bikroy · N listings", scraped date).
2. **Explain the cache:** "The page didn't scrape — it read the `MarketPrice` table. Scraping is a separate job." Now show that job.
3. **Run the scraper** in a terminal: `npx tsx prisma/scrape-bikroy.ts` — watch the live `[price] …` log lines hit Bikroy for real.
4. **Show it's the same code, scheduled:** open `http://localhost:3000/api/cron/refresh-prices` → JSON result. Mention `vercel.json` runs this daily at 3 AM in production.
5. **Show the year selector** on the Axio page: pick 2016, then 2020 — different live averages. That's `priceForYear()` scraping on demand.
6. **Scroll to Parts & maintenance** — real workshop prices + the "≈ ৳X/yr" estimate, and the TCO calculator below it.

## 1.8 Likely viva questions

- **"Is this real scraping or fake data?"** Real. `fetchModelPrices` does a live `fetch` to `bikroy.com/cars?query=...`; `extractPrices` pulls the prices out of the returned HTML with a regex. Run the CLI and watch it hit the network.
- **"Why cache it instead of scraping on page load?"** Speed (no user waits on a network round-trip), resilience (a Bikroy outage doesn't break the page — it shows the last figure), and politeness (we don't hammer their site once per visitor).
- **"Same logic is in the CLI, the cron route, and the pages — did you copy-paste?"** No — it's one pure module, `src/lib/research.ts`, imported by all three. It deliberately has no Prisma/`server-only` import so it can be shared everywhere.
- **"Is scraping allowed?"** Bikroy's robots.txt permits the car listing pages; we send one polite request per model with a 1.5s pause, not a crawl.
- **"How does the year price differ from the card price?"** The card is the cached average across all years; the selector scrapes `"<model> <year>"` live for a specific year.

---
---

# FEATURE 2 — MODIFICATION STUDIO

## 2.1 What it does

A parts catalog with a **fitment checker**. You pick a car from **your garage** (cars you won at auction) or type a **chassis code**; the catalog then marks each part **"Fits"** or **"Doesn't fit"** — so you can see everything but can't order the wrong wheel/kit for your car. Parts can be added to the **universal cart** and paid for with everything else. A second tab is a **3D configurator** (an embedded page).

## 2.2 Data flow

```
  Browser ──► /modifications  (Server Component)
                  │ reads via src/lib/fitment.ts
                  ├── readCatalog()      → Part + PartFitment   (every part, with the chassis codes it fits)
                  ├── readGarage(buyer)  → AuctionCar (SOLD, won by me)
                  └── knownChassisCodes()→ distinct PartFitment.chassisCode
                  │
                  ▼
             <ModStudio> (Client Component)
                  │  pick a chassis → mark each part compatible = fits.includes(chassis)
                  │
             [Add to cart] on a part
                  │ awaits addToCart(MODIFICATION, partId)   (server action, src/lib/cart-actions.ts)
                  │   → resolveItem() re-reads the Part server-side for its real title + price
                  ▼
              CartItem row ──► /cart ──► "Pay all" ──► checkoutCart()  (demo mode until gateway keys)
```

**Two design decisions to point out:**
1. **`lib/parts.ts` (pure types) vs `lib/fitment.ts` (Prisma queries).** The client component imports only the pure types/labels, so Prisma never ends up in the browser bundle. This split repeats across the codebase.
2. **The cart never trusts the browser's price.** The button only sends `kind` + `refId`; the server re-looks-up the real price in `resolveItem`. A user can't tamper with what they'll be charged.

## 2.3 File map

| File | Layer | Role |
|---|---|---|
| `web/src/app/(app)/modifications/page.tsx` | Frontend (Server Component) | Loads catalog, garage, chassis codes; renders `ModStudio`. |
| `web/src/app/(app)/modifications/ModStudio.tsx` | Frontend (Client Component) | Tabs, fitment picker, filters, part cards, Add-to-cart, 3D iframe. |
| `web/src/lib/fitment.ts` | Backend (Prisma queries) | `readCatalog`, `readGarage`, `knownChassisCodes`. |
| `web/src/lib/parts.ts` | Backend (pure types) | `CatalogPart`/`GarageCar` types + `CATEGORY_LABEL`. Client-safe. |
| `web/src/components/AddToCartButton.tsx` | Frontend (Client Component) | Reusable "Add to cart" — used by all four pillars. |
| `web/src/lib/cart-actions.ts` | Backend (Server Actions) | `addToCart` / `removeFromCart` / `checkoutCart` + `resolveItem`. |
| `web/src/lib/cart.ts` | Backend (Prisma reads) | `getCartItems`, `getCartCount` (header badge). |
| `web/src/app/(app)/cart/page.tsx` + `CartView.tsx` | Frontend | The universal "pay all dues" page. |

## 2.4 Backend — the fitment queries

`readCatalog` reads every `Part` with its `PartFitment` rows and marks compatibility against the selected chassis:

```ts
export async function readCatalog(chassisCode: string | null): Promise<CatalogPart[]> {
  const parts = await prisma.part.findMany({ orderBy: [{ category: "asc" }, { priceBdt: "asc" }],
                                             include: { fitments: true } });
  return parts.map((p) => {
    const fits = p.fitments.map((f) => f.chassisCode);
    return { id: p.id, name: p.name, brand: p.brand, category: p.category,
             priceBdt: num(p.priceBdt), brtaLegal: p.brtaLegal, boltPattern: p.boltPattern,
             offsetMm: p.offsetMm, fits,
             compatible: chassisCode === null ? true : fits.includes(chassisCode) };
  });
}
```

`readGarage` is what makes "your garage" real — it's the cars this buyer **actually won** at auction:

```ts
const won = await prisma.auctionCar.findMany({
  where: { status: LotStatus.SOLD, winningBid: { bidderId: buyerId } },
});
```

## 2.5 Frontend — the fitment checker

`ModStudio` recomputes the visible list whenever the chassis / category / "hide incompatible" toggle changes:

```ts
const visible = useMemo(() =>
  parts
    .map((p) => ({ ...p, compatible: chassis === null ? true : p.fits.includes(chassis) }))
    .filter((p) => (category === "ALL" ? true : p.category === category))
    .filter((p) => (chassis !== null && hideIncompatible ? p.compatible : true)),
  [parts, chassis, category, hideIncompatible]);
```

Each card shows a green **"Fits"** / grey **"Doesn't fit"** badge, price, a **"Not BRTA-legal"** warning where relevant, and the Add-to-cart button.

## 2.6 Cart integration (the part becomes an order)

The button carries only the kind + id:

```tsx
<AddToCartButton kind={CartItemKind.MODIFICATION} refId={p.id} className="w-full …" />
```

The server action re-resolves the real price (never trusting the client) and creates the row:

```ts
// resolveItem — the MODIFICATION branch
const p = await prisma.part.findUnique({ where: { id: refId } });
if (!p) return null;
return { title: `${p.brand} ${p.name}`, subtitle: "Modification part",
         amountBdt: Number(p.priceBdt.toString()) };

// addToCart — dedupe, then create
const existing = await prisma.cartItem.findFirst({
  where: { buyerId: buyer.id, kind, refId, status: CartItemStatus.IN_CART } });
if (existing) return { error: "That's already in your cart." };
await prisma.cartItem.create({ data: { buyerId: buyer.id, kind, refId, ...resolved } });
```

`/cart` sums every `IN_CART` row and **"Pay all"** calls `checkoutCart`, which marks them `PAID`. It runs in **clearly-labelled demo mode** until SSLCommerz/bKash sandbox keys are added to `web/.env` — it never pretends a real gateway responded.

> The same `<AddToCartButton>` + `resolveItem` handles all four pillars (`NEW_CAR`, `USED_CAR`, `RECONDITIONED`, `MODIFICATION`). For reconditioned lots the price is the estimated landed cost; for the others it's the listed price.

## 2.7 Database tables (Prisma)

```prisma
model Part {
  id String @id @default(cuid())
  name String; brand String
  category PartCategory              // WHEELS | BODY_KIT | INTERIOR | LIGHTING
  priceBdt Decimal
  brtaLegal Boolean @default(true)
  boltPattern String?; offsetMm Int?
  fitments PartFitment[]
}

model PartFitment {                  // a part fits many chassis codes
  partId String
  chassisCode String                 // e.g. "AVU65"
  @@unique([partId, chassisCode])
}

model CartItem {                     // universal cross-pillar cart
  buyerId String
  kind CartItemKind                  // which pillar
  refId String                       // loose ref to the source row (no FK — table depends on kind)
  title String; subtitle String?; amountBdt Decimal
  status CartItemStatus @default(IN_CART)   // IN_CART | PAID
  paidAt DateTime?
  @@index([buyerId, status])
}
```

## 2.8 Live demo script (Modification Studio)

1. Sign in as a **buyer**, open **Modification Studio**. Show the full catalog with category filter chips.
2. **Pick a chassis code** (or a car from your garage). Watch cards flip to **"Fits" / "Doesn't fit"**; tick *"Hide parts that don't fit"* to prove the checker works.
3. Point out the **"Not BRTA-legal"** badge on a part — a compliance detail.
4. Click **Add to cart** on a fitting part → header cart badge increments → open **/cart** → **Pay all** → "Payment successful ✓ (Demo checkout)".
5. Mention the price is resolved **server-side** (`resolveItem`), so the client can't spoof it.
6. Open the **3D configurator** tab to show the embedded KAIDO garage.

## 2.9 Likely viva questions

- **"How does it know a part fits?"** By **chassis code**. Each `Part` has `PartFitment` rows listing the codes it fits; a part is compatible when the selected code is in that list.
- **"Where do the garage cars come from?"** They're `AuctionCar` rows the buyer won (`status = SOLD`, `winningBid.bidderId = me`) — real ownership, not a manual list.
- **"Why are types and queries in two files?"** `parts.ts` is pure types the client can import; `fitment.ts` holds the Prisma queries. Keeping Prisma out of `parts.ts` keeps the database layer out of the browser bundle.
- **"Can a user fake a lower price?"** No. The button sends only `kind` + `refId`; `resolveItem` reads the real price from the DB server-side.
- **"Does checkout really charge money?"** Not yet — it's honest demo mode. Real charging needs SSLCommerz/bKash sandbox credentials in `web/.env`; the code path to redirect to the gateway is where the demo completion currently is.

---
---

# THE 3D LIVE CONFIGURATOR — deep dive

*(The "3D configurator" tab inside the Modification Studio — file: `kaido-multicar-garage.html`)*

## 3.1 What it actually is

One **self-contained Three.js (WebGL) app in a single HTML file**. It is **not** React, has **no** database, and makes **no** API calls. It renders a real-time 3D car in the browser's GPU and lets you recolour it, change the finish, and swap wheels and spoilers — all updating instantly. The app just embeds it in an `<iframe>`.

- **3D library:** Three.js r160, pulled from a CDN via an **import map** (lines 490–497).
- **The 3D models** (6 cars, 4 wheel sets, 2 spoilers) are **base64-embedded** inside `<script id="modelData…">` tags at the very bottom of the file (lines 1842–1855). That's why the file is ~44 MB — the models travel *inside* the HTML, so nothing is fetched over the network while you configure.

## 3.2 How it plugs into the rest of the app

```
ModStudio.tsx  ──(3D configurator tab)──►  <iframe src="/kaido-multicar-garage.html">
                                                        ▲
                                    served from web/public/  (Next only serves static files from public/)
                                                        ▲
   scripts/copy-configurator.mjs  ── copies the 44MB file from repo root → web/public/ at dev/build
   (public copy is gitignored, so the 44MB blob is committed only once, at the root)
```

- `web/src/app/(app)/modifications/ModStudio.tsx` (the `tab === "studio"` branch) renders the iframe.
- `web/scripts/copy-configurator.mjs` runs automatically before `dev`/`build` (`predev`/`prebuild` in `package.json`) and copies the file into `public/` only if it changed.

## 3.3 Line-by-line section map

The whole engine is the ES-module `<script>` that opens at **line 498**. Everything below is inside it unless noted.

| Lines | Section / function | What it does |
|---|---|---|
| 1–489 | HTML + `<style>` (line 9) | The 2D UI overlay: car carousel, paint swatches, finish buttons, rim/spoiler chips, price panel, payment modal, loading overlay. |
| 490–497 | `<script type="importmap">` | Maps `three` and `three/addons/` to the Three.js **r160 CDN** build. |
| 498–503 | Module imports | `THREE`, `GLTFLoader`, `OrbitControls`, `RoomEnvironment`, `Reflector`. |
| 511–527 | **Scene / camera / renderer** | Scene + black fog; perspective camera; `WebGLRenderer` with ACES tone-mapping + shadows; **PMREM image-based lighting** baked from `RoomEnvironment` (soft studio reflections). |
| 529–538 | Lights | Hemisphere fill + a shadow-casting key light + a fill light. |
| 540–564 | **The floor** | `Reflector` = a real mirror floor (re-renders the scene each frame — resolution deliberately **capped** for performance, see the comment) + a `ShadowMaterial` disc that catches the car's shadow. |
| 566–594 | `addBar()` + ~15 calls | Builds the glowing white **"neon tube" light-rig cage** around the car (emissive boxes). |
| 596–602 | `OrbitControls` | Drag-to-orbit with damping; min/max zoom; `maxPolarAngle` stops you going under the floor. |
| 604–642 | Spin + camera tween | `toggleSpin()`; `anglePositions()` returns front/side/rear/¾ camera presets; `setAngle()` starts a smooth fly-to. |
| 644–661 | **Global state** | The current colour, brightness, finish, rim, spoiler, loaded model, and running prices. |
| 663–678 | `fmtBDT`, `updatePaintMaterials` | ৳ formatting; **recolours every "paint" mesh** (colour × brightness) — the core of instant repaint. |
| 680–709 | Flash + paint handlers | `doFlash()` (screen-flash on colour change); `pickPaint` / `onCustomColor` / `onBrightness` UI handlers. |
| 711–740 | **Finish system** | `finishPresets` = gloss / matte / metallic / chrome as real PBR params (roughness, metalness, clearcoat…); `applyFinish()` writes them onto the paint materials. |
| 742–754 | Rating + price | `updateRating()` (the little star bars); `updatePriceDisplay()` (paint + finish totals). |
| 756–781 | Payment modal | The configurator's **own mock checkout** summary — a prototype flow, separate from the app's real universal cart. |
| 783–~1078 | **`carConfigs`** | The per-car data table. Each car has a name/tag/badge, the `elementId` of the `<script>` holding its GLB, **and mesh-classifier functions** — `isPaintMesh` / `isWheelMesh` / `isTireMesh` / `isTrustedMesh` — that identify meshes by **regex on their material name**. The rim/spoiler catalogs (`rimOptions`, `spoilerOptions`) live here too. |
| 1080–1088 | `base64ToArrayBuffer` | Decodes an embedded base64 GLB string into an `ArrayBuffer`. |
| 1090–1118 | `disposeMaterial`, `clearCurrentCar` | **Frees GPU memory** (geometries/materials/textures) when you switch cars — prevents leaks. |
| **1120–1204** | **`loadCarById` ★** | The core loader (see 3.4). Decode → parse → auto-scale → recenter → find paint/wheels/spoiler anchor → place camera. |
| 1206–1240 | `findSpoilerAnchor` | Finds the **highest point on the bodywork** (ignores glass/interior/wheels) — that's where a spoiler mounts, with no hardcoded coordinates. |
| **1242–1297** | **`computeWheelClusters` ★** | Samples wheel-mesh vertices, splits them into the **4 hubs** (FL/FR/RL/RR), and *measures* each wheel's diameter, width and **axle direction** from geometry. |
| 1299–1377 | Wheel hide/show + rim load | `hideWheelAssembly` / `showWheelAssembly`; `clearRimClones`; `loadRimTemplate`; `getAxleInfo`. |
| **1379–1447** | **`applyCustomRim` ★** | Clones the chosen rim into all 4 hubs, rotates/scales/mirrors each to fit, and builds a **procedural rubber tyre** (a `TorusGeometry`) when the rim GLB has none. |
| 1449–1507 | `focusOnHeroWheel`, `selectRim`, `buildRimRow` | Camera close-up on a wheel; the "pick a rim" handler; builds the rim UI chips. |
| 1509–1553 | Spoiler load helpers | `loadSpoilerTemplate`, `clearSpoilerClone`. |
| **1555–1676** | **`applySpoiler` ★** | Measures the part, scales it relative to the car (with safety clamps so it can never dwarf the car), **auto-orients it to the rear** using the measured anchor, and mounts it flush. |
| 1677–1738 | `focusOnSpoiler`, `selectSpoiler`, `buildSpoilerRow` | Spoiler close-up; pick handler; spoiler UI chips. |
| 1740–1780 | Car cards | `selectCarCard`, `enterViewMode`/`exitViewMode`, `buildCarCarousel` (builds the cards from `carConfigs`). |
| 1782–1812 | Carousel slider | `setupCarouselSlider` + `updateCarouselTransform`; then everything boots (`buildCarCarousel()`, `updatePriceDisplay()`). |
| 1814–1819 | `onResize` | Keeps the camera aspect + renderer size synced to the viewport. |
| **1821–1837** | **`animate` ★** | The **60 fps render loop** — `requestAnimationFrame`, camera-tween easing, auto-rotate, `renderer.render()`. |
| 1839 | `loadCarById('lambo')` | Boots the scene with the first car. |
| 1842–1855 | `<script id="modelData…">` ×12 | The **raw base64 GLB models** (2–9 MB each). Pure data — `loadCarById` reads them by id. |

★ = the functions to talk about in a viva.

## 3.4 The functions that matter, explained

### `loadCarById(carId)` — how a car appears (lines 1120–1204)

This is the heart of it. Note it uses `loader.parse(...)`, **not** `loader.load(url)` — the model is already in memory as base64, so there is no network request.

```js
const base64 = document.getElementById(cfg.elementId).textContent;   // read the embedded GLB
const arrayBuffer = base64ToArrayBuffer(base64);                      // decode to bytes
loader.parse(arrayBuffer, '', (gltf) => {
  const model = gltf.scene;
  // auto-fit: scale the car so its largest dimension = 2.6 world units
  const size = new THREE.Vector3(); new THREE.Box3().setFromObject(model).getSize(size);
  model.scale.setScalar(2.6 / Math.max(size.x, size.y, size.z));
  // collect the meshes we're allowed to repaint, using the car's own classifier
  model.traverse((child) => { if (child.isMesh && cfg.isPaintMesh(child)) paintMaterials.push(child.material); });
  // recenter on the floor, then analyse it for the mod engines
  wheelClusters = computeWheelClusters(model, cfg);
  spoilerAnchor = findSpoilerAnchor(model, cfg);
});
```

So one function: reads the embedded model → decodes → parses → **auto-scales any car to a consistent size** → drops it on the floor → records which meshes are paint → measures wheels + spoiler mount. Every car "just works" without hand-tuned numbers.

### `computeWheelClusters(model, cfg)` — finding the 4 wheels (lines 1242–1297)

It doesn't trust the model's coordinate system. It samples wheel vertices, splits them **left/right on X then front/rear on Z** to get 4 hubs, and for each measures the real **axle direction** — because a wheel is round, the *smallest* of its 3 bounding-box dimensions is the tyre's width, i.e. the axle:

```js
dims.sort((a, b) => a.val - b.val);
const diameter = (dims[1].val + dims[2].val) / 2;   // the two big dims = diameter
return { center, diameter, width: dims[0].val, axleVec: dims[0].vec };  // smallest dim = axle
```

### `applyCustomRim(cfg, template, opt)` — swapping wheels (lines 1379–1447)

For each of the 4 hubs it clones the rim GLB, **rotates it onto that hub's measured axle**, scales it to the wheel's diameter, mirrors the left side, and — if the rim has no tyre — generates a rubber `TorusGeometry` tyre to fill the gap:

```js
const quat = new THREE.Quaternion().setFromUnitVectors(axle.axleVec, cluster.axleVec); // align to THIS hub
clone.quaternion.copy(quat);
clone.scale.setScalar(cluster.diameter / axle.diameter);
if (cluster.side < 0) clone.scale.x *= -1;              // mirror the left wheels
```

### `findSpoilerAnchor` + `applySpoiler` — mounting a spoiler (lines 1206–1240, 1555–1676)

`findSpoilerAnchor` scans the bodywork for its **highest point** (skipping glass/interior/wheels). `applySpoiler` then scales the part to the car (clamped so it can't be oversized) and figures out which way is "the rear" from where that anchor sits relative to the car's centre — so it never mounts backwards:

```js
const rearSign = (Math.sign(anchor.z - carCenter.z) || 1) * carRearFlip;  // which way is "back"?
const rotationY = rearSign > 0 ? Math.PI : 0;                              // spin 180° if needed
```

### `animate()` — what makes it "live" (lines 1821–1837)

A classic Three.js render loop. It runs ~60 times a second; between frames it eases the camera along any active fly-to and spins the car:

```js
function animate(){
  requestAnimationFrame(animate);                       // schedule the next frame
  if (tweenActive){                                     // smooth camera fly-to (cubic ease-out)
    tweenT += 0.035;
    const eased = 1 - Math.pow(1 - tweenT, 3);
    camera.position.lerpVectors(tweenStart, tweenEnd, eased);
  }
  controls.autoRotate = autoSpin && !tweenActive;
  controls.update();
  renderer.render(scene, camera);                       // draw the frame
}
```

**"Live" means:** the scene is redrawn every frame, and every control (repaint, finish, rim, spoiler) simply **mutates a Three.js material or adds/removes a mesh** — the very next frame shows the change. There's no reload, no server round-trip.

## 3.5 The one design idea to stress in the viva

The wheel and spoiler systems are **geometry-driven, not hardcoded**. Instead of storing "the Lambo's front-left hub is at (x, y, z)", the code **measures** each car at load time — where the wheels are, how big they are, which way the axles point, and where the highest body point is. That's why adding a brand-new car needs only its GLB + a small `carConfigs` entry (name + mesh-name patterns), and the rims/spoilers fit automatically. Point at the long comments around lines 1206–1215 and 1276–1294 — they explain exactly this.

## 3.6 Live demo script (3D configurator)

1. In **Modification Studio**, click the **3D configurator** tab → the Lamborghini loads (`loadCarById('lambo')`, line 1839).
2. **Orbit** with the mouse (OrbitControls) and hit an **angle button** — watch the camera *fly* smoothly (that's the tween in `animate`).
3. **Pick a paint swatch** and drag **brightness** — instant repaint (`updatePaintMaterials`, line 668). Try **Chrome** finish (`finishPresets`, line 715).
4. **Swap a rim** — it clones onto all four hubs and the camera zooms to a wheel (`applyCustomRim` + `focusOnHeroWheel`).
5. **Add a spoiler** — it auto-mounts on the tail (`applySpoiler`).
6. **Switch cars** in the carousel — note the loading overlay while the next embedded GLB is parsed, and that memory is freed first (`clearCurrentCar`).

## 3.7 Likely viva questions

- **"Is this a video or real 3D?"** Real-time 3D. It's Three.js rendering to a WebGL canvas via `renderer.render()` in a `requestAnimationFrame` loop (line 1821) — you can orbit, zoom, and every change redraws live.
- **"Where do the 3D models come from / why is the file 44 MB?"** The GLB models are base64-embedded in `<script id="modelData…">` tags at the bottom (lines 1842–1855). `loadCarById` reads one by id and `GLTFLoader.parse()`s it from memory — no model is fetched over the network.
- **"How does a new wheel/spoiler fit different cars automatically?"** Nothing is hardcoded. `computeWheelClusters` measures the four hubs and axle directions, and `findSpoilerAnchor` finds the highest body point, at load time. The mod engines fit parts to those measurements.
- **"Is it connected to the database or the cart?"** No — it's a standalone prototype embedded via `<iframe>`. Its little payment modal is a mock. The real, DB-backed buying flow is the *Parts & fitment checker* tab (Feature 2), which uses `AddToCartButton` → `CartItem`.
- **"Does it need the internet?"** Only for the Three.js **library** (loaded from a CDN by the import map). The **car models are embedded**, so they load with no network.
- **"How is performance handled?"** The mirror floor re-renders the scene every frame, so its resolution is capped (line 546); switching cars disposes old geometries/materials/textures (`clearCurrentCar`, line 1098); pixel ratio is clamped to 2 (line 518).

---
---

## Appendix — command cheat sheet (run inside `web/`)

```bash
# Start the app
npm run dev                      # → http://localhost:3000   (use npm.cmd on Windows if npm is blocked)

# Put starting data in the DB (models, maintenance, parts, fitments, ...)
npx prisma db seed

# Refresh live market prices (the web scraper) — great to run live in a demo
npx tsx prisma/scrape-bikroy.ts  # use npx.cmd if PowerShell blocks npx

# Trigger the same refresh via the scheduled API route (dev: no secret needed)
#   open in a browser:  http://localhost:3000/api/cron/refresh-prices

# Inspect the tables visually
npx prisma studio
```

**Key files to have open during the viva**

- Research Hub backend/scraper: `web/src/lib/research.ts`, `web/prisma/scrape-bikroy.ts`, `web/src/app/api/cron/refresh-prices/route.ts`
- Research Hub frontend: `web/src/app/(app)/research/[brand]/[model]/page.tsx`
- Modification backend: `web/src/lib/fitment.ts`, `web/src/lib/cart-actions.ts`
- Modification frontend: `web/src/app/(app)/modifications/ModStudio.tsx`
- 3D configurator: `kaido-multicar-garage.html` (repo root) + `web/scripts/copy-configurator.mjs`
- Schema: `web/prisma/schema.prisma`
