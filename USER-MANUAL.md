# AutoBD — User Manual

**AutoBD** is a multi-pillar car marketplace for Bangladesh. In one platform you can buy
brand-new cars, buy and sell used cars, bid on Japanese reconditioned imports through
licensed agents, modify a car in a 3D studio, research models, find service centres, and
pay securely — with the full landed cost shown up front.

This is the complete guide to using every part of the system.

---

## 1. Accounts and roles

AutoBD has three kinds of accounts:

| Role | Who it's for | What they can do |
|------|--------------|------------------|
| **Buyer** | Regular users | Browse and buy across all pillars, bid in auctions, pay, track shipments |
| **Bidding Organization** (agent) | Licensed import agents | Represent buyers in Japanese auctions; approved by an admin before going live |
| **Admin** | Platform operators | Approve agents, run auctions, manage duty rates, resolve disputes, track shipments |

### Signing up / logging in
1. Open the site — you land on the **welcome page**.
2. Click **Log in / Get started**.
3. On the login page, pick your role tab (**Buyer**, **Bidding Org**, or **Admin**), choose
   **Log in** or **Create account**, enter your details, and submit.
   - **Buyers** register instantly with name, phone, email, and password.
   - **Organizations** submit company details and a licence number, then wait for admin approval.
   - **Admins** are created internally and cannot self-register.
4. After login you arrive at the **home page** (the four pillars). Sign out returns you to the welcome page.

---

## 2. Getting around

- **Top bar (desktop):** logo, the pillar links (New Cars, Used Cars, Reconditioned Import,
  Modifications, Research Hub, Services), plus **AI Assistant**, **Cart**, your account chip,
  and a **light/dark theme** toggle.
- **Top bar (mobile):** tap the **☰ menu** button to open the navigation; Cart and theme stay visible.
- **Home page:** four large cards for the four buying pillars, plus shortcuts to Research,
  Services, and the AI Assistant.

---

## 3. Pillar 1 — Brand New Cars

Browse dealer inventory of new cars.

1. Go to **New Cars**.
2. Pick a **brand**, then a **model / trim**.
3. View **specifications, price, and warranty terms**.
4. **Book a test drive** or **send a dealer inquiry** from the car's page.

---

## 4. Pillar 2 — Used Cars (peer-to-peer)

### Buying a used car
1. Go to **Used Cars** to see active listings.
2. Each listing shows **verified-ownership** and **accident-history** badges, photos, and price.
3. Open a listing to **make an offer** or **message the seller** directly.

### Selling your car
1. From Used Cars, open your **Seller dashboard**.
2. Click **Create a listing** and add photos/video, price, and ownership details.
3. Your listing stays **pending** until an admin verifies it, then goes live.
4. Offers and buyer messages appear on your seller dashboard, where you can accept or reply.

---

## 5. Pillar 3 — Reconditioned Import (the core feature)

This is the full journey of importing a car from a live Japanese auction through a licensed agent.

1. **Choose an agent.** Go to **Reconditioned Import** and pick a **bidding organization**
   (each shows its licence, rating, and fee).
2. **Open a session.** The agent runs auction **sessions** (e.g. "USS Yokohama"). Open one to
   see its **lots** (cars).
3. **Bid live.** On a lot page you see the car, its auction grade, and a **live price + countdown**.
   - Place a bid with the quick buttons or a custom amount.
   - The price only moves through real buyer bids — agents and admins can never raise it.
   - **Anti-snipe:** a bid in the final seconds **extends the clock** so nobody can snipe the win.
   - **Scheduled start:** some lots open at a set **Bangladesh time** — you'll see a "Starts in…"
     countdown until bidding opens.
4. **See the true cost.** The **landed-cost panel** updates live:
   `bid + NBR import duty + shipping + agent fee + port handling = total in BDT`.
5. **Win and pay.** If you win, go to **Escrow payment** and pay with **SSLCommerz** or **bKash**.
   Funds are held in escrow and only released after you confirm delivery.
6. **Save on shipping (optional).** Join a shared **container** with nearby buyers to cut freight ~30%.
7. **Track the shipment.** The **Shipment & import tracker** shows the pipeline
   (Win → Payment → Collected in Japan → Vessel departed → In transit → Arrived Chattogram →
   Customs → Ready for delivery) plus a **status-history timeline** of who changed each stage and when.
8. **Confirm and rate.** On delivery, confirm receipt — escrow releases to the agent — then **rate** them.

---

## 6. Pillar 4 — Modification Studio

Customise a car and buy fitment-checked parts. It has two tabs:

- **Parts & fitment checker:** browse parts filtered to fit your exact car (BRTA-legal parts flagged).
- **3D configurator:** the Kaido Garage studio.
  1. Pick a car from the **Select Car** picker.
  2. Choose **paint colour** and **finish**; the **price** updates live.
  3. Rotate the car (Front / Side / Rear / auto-rotate).
  4. Switch between **light and dark** studio modes.
  5. Tap **Add build to cart** to save your configuration for checkout.
  - *On mobile,* the controls appear as a bottom sheet so the car stays visible above them.

---

## 7. Research Hub

1. Go to **Research Hub** and pick a **brand → model**.
2. View **specifications and reliability** data.
3. Use the **Total-Cost-of-Ownership (TCO) calculator** — tuned for Bangladesh — to estimate
   what a car really costs to own over time (fuel, maintenance, registration, etc.).

---

## 8. Service Centre Finder

1. Go to **Services**.
2. Allow location for **"near me"**, or type an **area / city** to search.
3. Nearby car repair, tyre, parts, and wash shops appear on a **live map**, sorted by distance.
4. Select a centre to draw the **real driving route** with **distance and estimated drive time**
   (like Google Maps). Address and phone are shown where available.

---

## 9. AI Assistant

Open **AI Assistant** from the top bar to ask questions and get guidance about buying,
importing, costs, or using the platform.

---

## 10. Cart and payments

- The **Cart** is universal: used-car purchases, car parts, 3D configurator builds, and won
  auction lots all check out together.
- At checkout, choose **SSLCommerz** or **bKash**. You are redirected to the gateway's secure
  page — AutoBD never sees your card or wallet details.
- Auction wins are held in **escrow** and released only after you confirm delivery, protecting
  your money until the car arrives.

---

## 11. Admin console (admins only)

Open **Admin view** from the top bar to:
- **Approve or suspend** bidding organizations.
- **Run auctions:** create sessions, **start a lot now** or **schedule it to open at a specific
  Bangladesh time**, and advance shipments through their stages.
- Edit the **NBR duty-rate table** and **platform settings**.
- Review **disputes** and see platform **analytics** (revenue by source, successful imports, etc.).

---

## 12. Organization console (agents only)

Approved organizations get a dedicated **agent console** showing the buyers they represent and
their engagement history. Agents advise buyers and act on their behalf in sessions — they never
place or raise bids themselves.

---

## Key terms

- **Landed cost** — the all-in price of an imported car: bid + duty + shipping + agent fee + port handling.
- **Escrow** — your payment is held safely and released to the seller/agent only after you confirm delivery.
- **Container pooling** — sharing a shipping container with other buyers to cut freight cost (~30%).
- **Anti-snipe** — a late bid extends the auction clock so the lot can't be won at the last instant.
- **BRTA paper value** — the remaining import-eligible registration life of a vehicle.
