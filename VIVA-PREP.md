# AutoBD — Viva Preparation Guide

Everything you need to explain the project confidently.

---

## 1. The 30-second pitch (memorize this)

> "AutoBD is a **multi-pillar car marketplace for Bangladesh**. Users can buy
> **brand-new cars** from dealers, **used cars** peer-to-peer, or import
> **Japanese reconditioned cars** through **live online auctions** — with a
> transparent breakdown of the total landed cost including import duty and
> shipping. It also has a **modification studio**, a **research hub**, and an
> **AI recommendation assistant**. It's a **full-stack web application** with a
> real database, three user roles, and real business logic."

---

## 2. Technology stack — what we used and why

| Technology | What it is | Where it's used |
| --- | --- | --- |
| **TypeScript** | The programming language (a safer JavaScript) | Everything — frontend AND backend |
| **React 19** | Library for building the user interface | Frontend (the screens) |
| **Next.js 16** | Full-stack framework built on React | Ties frontend + backend together, handles pages |
| **Tailwind CSS** | Styling system | The look and design |
| **Prisma 7** | ORM — turns our code into database queries | The bridge to the database |
| **PostgreSQL** (on **Neon**) | The database | Stores all data |
| **Auth.js (NextAuth 5)** | Authentication library | Login / sign-up / sessions |
| **Leaflet + OpenStreetMap** | Free maps | The "nearest dealer" map |

**One-line answer if asked "what language?"** →
*"TypeScript for the whole app — with React and Next.js on the frontend, and
Next.js server functions with Prisma on the backend."*

---

## 3. The three parts: Frontend, Backend, Database

### 🖥️ FRONTEND — what the user sees and clicks
- Built with **React + Next.js + Tailwind CSS**, written in **TypeScript**.
- Runs **in the browser**.
- Lives in `web/src/app/` (the screens) and `web/src/components/` (reusable
  pieces like the header, the map, buttons).
- Example: the New Cars page, the bidding screen, the login form.

### ⚙️ BACKEND — the logic and rules
- Also **TypeScript**, using **Next.js server functions** (called "server
  actions") and a few API endpoints.
- Runs **on the server**, not in the browser — so it's secure.
- Lives in `web/src/lib/` (business logic) and `web/src/app/api/` (endpoints).
- Handles: checking who's logged in, validating input, the business rules
  (bidding, anti-snipe, landed-cost calculation), and reading/writing the
  database.
- **Key point:** Next.js lets the frontend and backend live in **one project** —
  there's no separate backend server. This is modern full-stack development.

### 🗄️ DATABASE — where everything is stored
- **PostgreSQL**, hosted on **Neon** (a cloud database service).
- **39 tables** (e.g. `User`, `Brand`, `NewCar`, `Auction`, `Bid`, `Payment`).
- We never write raw SQL — we use **Prisma**, which turns TypeScript into SQL
  safely.
- The tables are defined in `web/prisma/schema.prisma`.

---

## 4. How they work together (the data flow)

Say a buyer places a bid:

```
1. Buyer clicks "Bid"  →  FRONTEND (React screen in the browser)
2. That calls a server action  →  BACKEND (runs on the server)
3. The backend checks the rules, then uses Prisma  →
4. Prisma runs an SQL INSERT  →  DATABASE (PostgreSQL / Neon)
5. The result comes back and the screen updates
```

**Every feature follows this same pattern: Frontend → Backend → Prisma → Database → back.**

---

## 5. Key features (good things to mention or demo)

1. **Four buying pillars** — New Cars, Used Cars, Reconditioned Import (auctions),
   Modifications.
2. **Live auctions** — real bidding with a countdown, **anti-snipe** (a late bid
   extends the timer so it's fair), and live currency conversion (JPY→BDT).
3. **Transparent landed cost** — automatically adds import duty, shipping, agent
   fee, and port handling, so buyers see the true total.
4. **Three user roles** — Buyer, Organization (bidding agent), and Admin — each
   with different screens and permissions.
5. **AI assistant** — recommends cars across all pillars from a plain-language
   request.
6. **Real payments** — SSLCommerz and bKash integration (Bangladesh gateways).
7. **BRTA registration paper-value tracker** — a Bangladesh-specific feature.

---

## 6. Numbers you can quote

- **39** database tables · **19** enums · **4** database migrations
- **23** screens/pages · **33** backend logic files · **6** API endpoints
- **3** user roles · **4** buying pillars

---

## 7. Likely viva questions & short answers

**Q: What language did you use?**
A: TypeScript for the entire app — React and Next.js for the frontend, Next.js
server functions with Prisma for the backend.

**Q: How are the frontend and backend separated?**
A: It's a Next.js full-stack app, so they're in one project. The frontend is
React components that run in the browser; the backend is "server actions" and
API routes that run on the server. Next.js decides what runs where.

**Q: What database did you use, and how do you connect to it?**
A: PostgreSQL, hosted on Neon. We connect through Prisma, an ORM that lets us
query the database in TypeScript instead of raw SQL.

**Q: How does the live auction update in real time?**
A: The screen polls the server every few seconds through an API route. We used
polling instead of WebSockets because serverless hosting can't hold a permanent
connection.

**Q: What is anti-snipe?**
A: If someone bids in the final 30 seconds, the timer extends by 60 seconds — so
no one can win unfairly by bidding at the last instant.

**Q: How do you stop cheating in the auction?**
A: Bids run inside a database transaction so two bids can't conflict, and there
is deliberately no way for an admin or organization to raise a price — only a
real buyer's bid moves it.

**Q: How is login handled securely?**
A: Auth.js with passwords hashed using bcrypt, and sessions stored as signed
tokens (JWT).

**Q: Why did you choose Next.js?**
A: It lets us build the frontend and backend in one modern framework with
TypeScript, which is faster to develop and easier to maintain.

**Q: What is Prisma?**
A: An ORM (Object-Relational Mapper). It maps our database tables to TypeScript
objects, so we write safe, readable code instead of raw SQL.

**Q: Is the data real or fake?**
A: The structure and logic are real — a real database with real relationships.
We seed it with realistic demo data so it can be demonstrated.

---

## 8. If you get stuck — the safe things to say

- "It's a **full-stack Next.js application** written in **TypeScript**, with a
  **PostgreSQL** database accessed through **Prisma**."
- "The **frontend** is React, the **backend** is Next.js server functions, and
  they share one codebase."
- "Every action flows from the **screen → server function → Prisma → database →
  back to the screen**."

Good luck! 🚗
