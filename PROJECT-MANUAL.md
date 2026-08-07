# AutoBD — Project Manual (read me first)

A plain-English guide to every folder and file in this project, so you always
know what you're looking at.

---

## 1. What is this project?

**AutoBD** is a multi-pillar car marketplace for Bangladesh — buy brand-new
cars, used cars, or Japanese reconditioned cars (via live auctions), plus a
modification studio, a research hub, and an AI assistant.

The real, working app is built with **Next.js + TypeScript + a Postgres
database**. It all lives in the **`web/`** folder.

---

## 2. ⚠️ The #1 thing to understand: the real app vs. the old mockup

There are **two different things** in this project, and mixing them up causes
most confusion:

| | The REAL app | The OLD mockup |
| --- | --- | --- |
| **Where** | the `web/` folder | the `.dc.html` files in the main folder |
| **What** | a real program with a database, logins, real features | a static picture of the design (no real features) |
| **How to open** | run it, then visit `http://localhost:3000` | double-click / "Live Server" (port 8000) |
| **Your new work shows here?** | ✅ **Yes** | ❌ No |

👉 **Always look at your work on `http://localhost:3000`** (the real app).
The `.dc.html` files were just the early design and are kept for reference only.

---

## 3. The main folder (project root) — what each item is

```
project/
├── web/                       ✅ THE REAL APP — everything important is here
├── uploads/                   📄 source material (the requirements PDF, images)
├── assets/                    🖼️ a few old images from the original design
├── .claude/                   🤖 settings for the AI coding tool (not part of the app)
├── .git/                      🔧 version history (don't touch — GitHub Desktop uses it)
│
├── AutoBD Prototype.dc.html   🗑️ OLD design mockup (reference only)
├── AutoBD Landing.dc.html     🗑️ OLD design mockup
├── AutoBD Prototype - Standalone.html   🗑️ OLD design mockup
├── kaido-multicar-garage.html 🚗 the 3D car configurator (used by Modification Studio)
├── support.js / .thumbnail    🗑️ helper files for the old mockup
├── .gitattributes / .gitignore 🔧 git settings
└── PROJECT-MANUAL.md          📘 this file
```

**Day to day, you only work inside `web/`.** The rest is either reference
material or things you can ignore.

- **`uploads/`** — your project's source material: `Functional_Requirements_AutoBDF.pdf`
  (the requirements), plus some images and 3D model files.
- **`assets/`** — 8 leftover images from the very first design. Not used by the app.
- **`.claude/`** — configuration for the AI assistant that helped build this
  (e.g. how to launch the dev server). Nothing the app itself needs.

---

## 4. Inside `web/` — the real app

```
web/
├── src/            ✅ ALL the code (see section 5)
├── prisma/         🗄️ the database: table definitions, demo data
├── public/         🖼️ images & files served as-is (your brand logos, car photos)
├── scripts/        🔧 one small build helper
│
├── .env            🔑 SECRET — your database password. NEVER share or upload this.
├── .env.example    📋 a blank template showing what goes in .env
├── README.md       📖 how to set up and run the app + design decisions
├── ARCHITECTURE.md 🧭 which files belong to which feature (read this to navigate)
├── package.json    📦 the list of tools the app uses + the "npm run dev" command
└── (other config)  ⚙️ tsconfig / next.config / eslint / postcss — settings, rarely touched
```

- **`prisma/`** — the database.
  - `schema.prisma` — defines every table (Brand, NewCar, Auction, …).
  - `seed.ts` — fills the database with demo data (brands, cars, the test accounts).
  - `migrations/` — the history of database changes.
- **`public/`** — anything here is served directly at the website root.
  - `public/brands/` — drop brand logos here (`toyota.png`, …).
  - `public/cars/` — drop car photos here (`honda-civic.jpg`, …).

---

## 5. Inside `web/src/` — the code, explained

This is where you'll spend your time.

```
web/src/
├── app/          📱 THE SCREENS (pages) + web endpoints
│   ├── (app)/    the logged-in screens — one folder per feature
│   ├── login/    the login / sign-up page
│   └── api/      small backend endpoints for live updates (chat, live bids)
│
├── lib/          ⚙️ THE LOGIC (the "backend") — one file per feature area
├── components/   🧩 reusable UI pieces (header, map, photo box, …)
├── generated/    🤖 auto-made database code — DO NOT edit
├── types/        🏷️ TypeScript type definitions
└── auth.ts       🔐 login/session setup
```

### The screens live in `app/(app)/` — one folder per feature:

| Folder | Feature |
| --- | --- |
| `new-cars/` | New Cars |
| `used-cars/` | Used Cars |
| `auctions/` | Reconditioned Import (the live auctions) |
| `modifications/` | Modification Studio |
| `research/` | Research Hub |
| `assistant/` | AI Assistant |
| `org/` | Organization dashboard |
| `admin/` | Admin dashboard |
| `escrow/`, `shipment/`, `rating/` | the after-you-win steps |

Inside each, the file called **`page.tsx`** is the screen itself.

### The logic lives in `lib/` — named after each feature:

| File | Feature it powers |
| --- | --- |
| `new-car-actions.ts`, `test-drive-actions.ts` | New Cars |
| `used-car-actions.ts` | Used Cars |
| `auction.ts`, `bid-actions.ts`, `fx.ts`, `landed-cost.ts` | Auctions |
| `fitment.ts`, `parts.ts` | Modification Studio |
| `assistant/` (folder) | AI Assistant |
| `prisma.ts`, `session.ts`, `settings.ts`, `format.ts` | **shared** — used by everything |

> 📎 For the full breakdown of which files power each feature, open
> **`web/ARCHITECTURE.md`**.

---

## 6. How to run the app

In VS Code: **Terminal → New Terminal**, then:

```
cd web
npm run dev
```

Wait for **`Ready`**, then open **http://localhost:3000** and log in with
`rafiul.buyer@autobd.test` / `testpass123`.

(If you get a PowerShell "scripts disabled" error, use `npm.cmd run dev`
instead, or switch the terminal to "Command Prompt".)

---

## 7. Where to look for more detail

| Question | Read this |
| --- | --- |
| Which files make up a feature? | `web/ARCHITECTURE.md` |
| How do I set it up / what were the design decisions? | `web/README.md` |
| What are the login accounts? | `web/README.md` (Dev-only accounts) |
| How do I add brand/car images? | `web/public/brands/README.md` & `web/public/cars/README.md` |

---

## 8. The golden rules

1. **Work in `web/`.** Ignore the `.dc.html` files — they're the old mockup.
2. **Check your work at `http://localhost:3000`**, not Live Server.
3. **Never share or upload `web/.env`** — it holds your database password.
4. Don't edit anything in **`web/src/generated/`** — it's made automatically.
