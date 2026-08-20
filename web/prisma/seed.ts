import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  FeeType,
  OrgStatus,
  Role,
  AuctionStatus,
  LotStatus,
  ListingStatus,
  AccidentStatus,
  PartCategory,
  EngagementStatus,
} from "../src/generated/prisma/client";
import { EXTRA_CATALOGS } from "./catalogs";
import { MAINTENANCE } from "./maintenance";
import { RESEARCH } from "./research-models";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// DEV ONLY. Documented in README — must be changed/removed before any real
// deployment.
const ADMIN_EMAIL = "admin@autobd.test";
const ADMIN_PASSWORD = "AdminDev123!";
const DEMO_PASSWORD = "testpass123";

const YEAR = new Date().getFullYear();
const ELIGIBILITY_MAX_AGE = 5;
/// Lots must be within the import-eligibility window, so model years are
/// derived from the current year rather than hardcoded.
const eligibleYear = (agedBy: number) => YEAR - agedBy;

// ---------------------------------------------------------------- settings

const DUTY_BANDS = [
  { ccMin: 0, ccMax: 1500, ratePercent: 89 },
  { ccMin: 1501, ccMax: 2000, ratePercent: 110 },
  { ccMin: 2001, ccMax: 3000, ratePercent: 150 },
  { ccMin: 3001, ccMax: null, ratePercent: 200 },
];

const SETTINGS: Record<string, string> = {
  shippingFlatBdt: "195000",
  portHandlingBdt: "42000",
  antiSnipeWindowSeconds: "30",
  antiSnipeExtendSeconds: "60",
  antiSnipeWarnAfterExtensions: "20",
  containerCapacity: "10",
  poolingDiscountPercent: "30",
  importEligibilityMaxAgeYears: String(ELIGIBILITY_MAX_AGE),
  minBidIncrementJpy: "5000",
  exchangeRateTtlMinutes: "60",

  // ASSUMPTION: the FR names four revenue sources but sets no rates. These are
  // placeholders for the business to set — admin-editable, and every figure on
  // the admin revenue panel is derived from real rows using them.
  referralFeePerInquiryBdt: "2000",
  listingFeeBdt: "500",
  agentPlacementCutPercent: "10",
  modSourcingMarginPercent: "8",
};

async function seedSettings() {
  await prisma.dutyRate.deleteMany();
  await prisma.dutyRate.createMany({ data: DUTY_BANDS });
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.platformSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}

// ------------------------------------------------------------------ users

async function upsertUser(email: string, password: string, role: Role) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { role },
    create: { email, passwordHash, role },
  });
}

async function seedAdmin() {
  const user = await upsertUser(ADMIN_EMAIL, ADMIN_PASSWORD, Role.ADMIN);
  return prisma.admin.upsert({
    where: { userId: user.id },
    update: { fullName: "AutoBD Admin" },
    create: { userId: user.id, fullName: "AutoBD Admin" },
  });
}

const ORGS = [
  {
    email: "osaka.org@autobd.test",
    companyName: "Osaka Bridge Auto",
    licenseNumber: "JP-BD-0442",
    yearsInOperation: 11,
    feeType: FeeType.PERCENT,
    feeValue: 3,
    successfulImports: 2100,
    avgTurnaroundDays: 33,
    about:
      "Osaka Bridge Auto has run BD-facing auction sourcing since 2015, specializing in hybrid SUVs and sedans from Kansai-region auction houses. Their in-house translators produce a fully translated auction sheet before any bid is placed, and they carry the lowest dispute rate on the platform.",
  },
  {
    email: "yokohama.org@autobd.test",
    companyName: "Yokohama Direct Trading",
    licenseNumber: "JP-BD-0198",
    yearsInOperation: 8,
    feeType: FeeType.PERCENT,
    feeValue: 3.5,
    successfulImports: 1240,
    avgTurnaroundDays: 38,
    about:
      "Yokohama Direct Trading focuses on volume imports of compact and mid-size sedans, with direct relationships at three Kanto-area auction houses.",
  },
  {
    email: "tokyoline.org@autobd.test",
    companyName: "TokyoLine Motors BD",
    licenseNumber: "JP-BD-0367",
    yearsInOperation: 6,
    feeType: FeeType.FLAT,
    feeValue: 45000,
    successfulImports: 860,
    avgTurnaroundDays: 45,
    about:
      "TokyoLine Motors BD offers a flat-fee model, useful for buyers targeting higher-value lots where a percentage fee would run high.",
  },
  {
    email: "nagoya.org@autobd.test",
    companyName: "Nagoya Fleet Partners",
    licenseNumber: "JP-BD-0521",
    yearsInOperation: 4,
    feeType: FeeType.PERCENT,
    feeValue: 4,
    successfulImports: 310,
    avgTurnaroundDays: 52,
    about:
      "A newer agent on the platform, Nagoya Fleet Partners is building track record with a focus on kei cars and small hatchbacks.",
  },
];

async function seedOrgs() {
  const out = [];
  for (const o of ORGS) {
    const user = await upsertUser(o.email, DEMO_PASSWORD, Role.ORGANIZATION);
    const { email, ...profile } = o;
    out.push(
      await prisma.organization.upsert({
        where: { userId: user.id },
        update: { ...profile, status: OrgStatus.APPROVED },
        create: { userId: user.id, ...profile, status: OrgStatus.APPROVED },
      }),
    );
  }
  return out;
}

const BUYERS = [
  { email: "rafiul.buyer@autobd.test", fullName: "Rafiul Hasan", phone: "01711223344", city: "Dhaka" },
  { email: "nusrat.buyer@autobd.test", fullName: "Nusrat Jahan", phone: "01711223355", city: "Chattogram" },
  { email: "tanvir.buyer@autobd.test", fullName: "Tanvir Ahmed", phone: "01711223366", city: "Sylhet" },
  { email: "rahman.seller@autobd.test", fullName: "M. Rahman", phone: "01712000001", city: "Dhaka" },
  { email: "islam.seller@autobd.test", fullName: "S. Islam", phone: "01712000002", city: "Chattogram" },
  { email: "karim.seller@autobd.test", fullName: "A. Karim", phone: "01712000003", city: "Sylhet" },
];

async function seedBuyers() {
  const out = [];
  for (const b of BUYERS) {
    const user = await upsertUser(b.email, DEMO_PASSWORD, Role.BUYER);
    const { email, ...profile } = b;
    out.push(
      await prisma.buyer.upsert({
        where: { userId: user.id },
        update: profile,
        create: { userId: user.id, ...profile },
      }),
    );
  }
  return out;
}

// ------------------------------------------------------------- new cars

/// Brands own their dealers and their car models. Dealer coordinates are real
/// Dhaka-area points for the actual BD distributors (Navana=Toyota,
/// Rangs=Honda/Mitsubishi, Uttara Motors=Suzuki) so the map plots something
/// true once a Google Maps key is set. Each brand carries 3-4 models so the
/// brand pages aren't single-car.
const BRANDS = [
  {
    slug: "toyota",
    name: "Toyota",
    country: "Japan",
    dealers: [
      { name: "Navana Toyota — Tejgaon", address: "205/1/A Tejgaon Industrial Area", city: "Dhaka", latitude: 23.763900, longitude: 90.393600, phone: "+8809612444444" },
      { name: "Navana Toyota — Gulshan", address: "Gulshan Avenue, Gulshan 1", city: "Dhaka", latitude: 23.792500, longitude: 90.407800, phone: "+8809612444445" },
    ],
    cars: [
      { model: "Corolla Cross Hybrid", priceMinBdt: 4800000, priceMaxBdt: 5800000, warrantyYears: 5, warrantyKm: 100000, variants: [
        { name: "X", priceBdt: 4800000, engine: "1.8L Hybrid", transmission: "CVT", economyKmPerL: 23 },
        { name: "G", priceBdt: 5300000, engine: "1.8L Hybrid", transmission: "CVT", economyKmPerL: 22 },
        { name: "Z", priceBdt: 5800000, engine: "1.8L Hybrid", transmission: "CVT", economyKmPerL: 21 },
      ] },
      { model: "Corolla Altis", priceMinBdt: 4200000, priceMaxBdt: 4800000, warrantyYears: 5, warrantyKm: 100000, variants: [
        { name: "1.6 GL", priceBdt: 4200000, engine: "1.6L Petrol", transmission: "CVT", economyKmPerL: 16 },
        { name: "1.8 GX", priceBdt: 4800000, engine: "1.8L Petrol", transmission: "CVT", economyKmPerL: 15 },
      ] },
      { model: "Yaris", priceMinBdt: 3200000, priceMaxBdt: 3800000, warrantyYears: 3, warrantyKm: 100000, variants: [
        { name: "J", priceBdt: 3200000, engine: "1.5L Petrol", transmission: "CVT", economyKmPerL: 19 },
        { name: "S", priceBdt: 3800000, engine: "1.5L Petrol", transmission: "CVT", economyKmPerL: 18 },
      ] },
      { model: "Raize", priceMinBdt: 3500000, priceMaxBdt: 4000000, warrantyYears: 3, warrantyKm: 100000, variants: [
        { name: "G", priceBdt: 3500000, engine: "1.0L Turbo", transmission: "CVT", economyKmPerL: 20 },
        { name: "Z", priceBdt: 4000000, engine: "1.0L Turbo", transmission: "CVT", economyKmPerL: 19 },
      ] },
    ],
  },
  {
    slug: "honda",
    name: "Honda",
    country: "Japan",
    dealers: [
      { name: "Honda — Gulshan Showroom", address: "Gulshan 2 Circle", city: "Dhaka", latitude: 23.794300, longitude: 90.414500, phone: "+8809606999999" },
      { name: "Rangs Motors — Bijoy Sarani", address: "Bijoy Sarani, Tejgaon", city: "Dhaka", latitude: 23.765000, longitude: 90.386000, phone: "+8809606999998" },
    ],
    cars: [
      { model: "City e:HEV", priceMinBdt: 4200000, priceMaxBdt: 4600000, warrantyYears: 3, warrantyKm: 100000, variants: [
        { name: "EL", priceBdt: 4200000, engine: "1.5L e:HEV", transmission: "e-CVT", economyKmPerL: 27 },
        { name: "SV", priceBdt: 4600000, engine: "1.5L e:HEV", transmission: "e-CVT", economyKmPerL: 26 },
      ] },
      { model: "Civic", priceMinBdt: 5500000, priceMaxBdt: 6500000, warrantyYears: 3, warrantyKm: 100000, variants: [
        { name: "VX", priceBdt: 5500000, engine: "1.5L Turbo", transmission: "CVT", economyKmPerL: 17 },
        { name: "RS", priceBdt: 6500000, engine: "1.5L Turbo", transmission: "CVT", economyKmPerL: 16 },
      ] },
      { model: "HR-V", priceMinBdt: 4800000, priceMaxBdt: 5600000, warrantyYears: 3, warrantyKm: 100000, variants: [
        { name: "e:HEV X", priceBdt: 4800000, engine: "1.5L Hybrid", transmission: "e-CVT", economyKmPerL: 25 },
        { name: "e:HEV Z", priceBdt: 5600000, engine: "1.5L Hybrid", transmission: "e-CVT", economyKmPerL: 24 },
      ] },
    ],
  },
  {
    slug: "mitsubishi",
    name: "Mitsubishi",
    country: "Japan",
    dealers: [
      { name: "Rangs Motors — Uttara", address: "Sonargaon Janapath, Sector 11, Uttara", city: "Dhaka", latitude: 23.870900, longitude: 90.399900, phone: "+8809606999990" },
      { name: "Rangs Motors — Motijheel", address: "Dilkusha C/A, Motijheel", city: "Dhaka", latitude: 23.728000, longitude: 90.417000, phone: "+8809606999991" },
    ],
    cars: [
      { model: "Xpander", priceMinBdt: 3800000, priceMaxBdt: 4300000, warrantyYears: 5, warrantyKm: 100000, variants: [
        { name: "GLS", priceBdt: 3800000, engine: "1.5L Petrol", transmission: "4AT", economyKmPerL: 14 },
        { name: "Ultimate", priceBdt: 4300000, engine: "1.5L Petrol", transmission: "4AT", economyKmPerL: 14 },
      ] },
      { model: "Outlander", priceMinBdt: 6000000, priceMaxBdt: 7200000, warrantyYears: 5, warrantyKm: 100000, variants: [
        { name: "2.0 GLX", priceBdt: 6000000, engine: "2.0L Petrol", transmission: "CVT", economyKmPerL: 13 },
        { name: "PHEV", priceBdt: 7200000, engine: "2.4L PHEV", transmission: "CVT", economyKmPerL: 18 },
      ] },
      { model: "Attrage", priceMinBdt: 2800000, priceMaxBdt: 3300000, warrantyYears: 5, warrantyKm: 100000, variants: [
        { name: "GLX", priceBdt: 2800000, engine: "1.2L Petrol", transmission: "CVT", economyKmPerL: 21 },
        { name: "GLS", priceBdt: 3300000, engine: "1.2L Petrol", transmission: "CVT", economyKmPerL: 20 },
      ] },
    ],
  },
  {
    slug: "suzuki",
    name: "Suzuki",
    country: "Japan",
    dealers: [
      { name: "Uttara Motors — Tejgaon", address: "Tejgaon Industrial Area", city: "Dhaka", latitude: 23.770000, longitude: 90.400000, phone: "+8809612555555" },
      { name: "Uttara Motors — Dhanmondi", address: "Mirpur Road, Dhanmondi", city: "Dhaka", latitude: 23.746000, longitude: 90.376000, phone: "+8809612555556" },
    ],
    cars: [
      { model: "Swift", priceMinBdt: 2900000, priceMaxBdt: 3300000, warrantyYears: 3, warrantyKm: 100000, variants: [
        { name: "GL", priceBdt: 2900000, engine: "1.2L Petrol", transmission: "5MT", economyKmPerL: 20 },
        { name: "GLX", priceBdt: 3300000, engine: "1.2L Petrol", transmission: "CVT", economyKmPerL: 19 },
      ] },
      { model: "Ciaz", priceMinBdt: 3000000, priceMaxBdt: 3500000, warrantyYears: 3, warrantyKm: 100000, variants: [
        { name: "GL", priceBdt: 3000000, engine: "1.5L Petrol", transmission: "4AT", economyKmPerL: 20 },
        { name: "GLX", priceBdt: 3500000, engine: "1.5L Petrol", transmission: "4AT", economyKmPerL: 19 },
      ] },
      { model: "Vitara Brezza", priceMinBdt: 3400000, priceMaxBdt: 4000000, warrantyYears: 3, warrantyKm: 100000, variants: [
        { name: "GLX", priceBdt: 3400000, engine: "1.5L Petrol", transmission: "4AT", economyKmPerL: 18 },
        { name: "ZDI", priceBdt: 4000000, engine: "1.5L Petrol", transmission: "4AT", economyKmPerL: 17 },
      ] },
    ],
  },
];

async function seedNewCars() {
  // Children first (they FK into variant/car/dealer), then dealers, then brands.
  await prisma.testDriveReservation.deleteMany();
  await prisma.dealerInquiry.deleteMany();
  await prisma.newCarVariant.deleteMany();
  await prisma.newCar.deleteMany();
  await prisma.dealer.deleteMany();
  await prisma.brand.deleteMany();

  for (const b of BRANDS) {
    const { dealers, cars, ...brand } = b;
    await prisma.brand.create({
      data: {
        ...brand,
        dealers: { create: dealers },
        cars: {
          create: cars.map((c) => {
            const { variants, ...car } = c;
            return { ...car, variants: { create: variants } };
          }),
        },
      },
    });
  }
}

// ------------------------------------------------------------ used cars

async function seedUsedCars(sellers: { id: string; fullName: string }[]) {
  const byName = (n: string) => sellers.find((s) => s.fullName === n)!.id;
  await prisma.offer.deleteMany();
  await prisma.usedCarListing.deleteMany();
  await prisma.usedCarListing.createMany({
    data: [
      {
        sellerId: byName("M. Rahman"),
        title: "Toyota Axio 2016",
        make: "Toyota",
        model: "Axio",
        manufactureYear: 2016,
        mileageKm: 92000,
        location: "Dhaka",
        priceBdt: 1350000,
        conditionNotes:
          "Well-maintained, single owner. Minor bumper touch-up documented. Full service history available.",
        inspectionNotes: "Third-party inspection completed via partner garage, report attached.",
        ownershipVerified: true,
        accidentStatus: AccidentStatus.NONE_FOUND,
        status: ListingStatus.ACTIVE,
      },
      {
        sellerId: byName("S. Islam"),
        title: "Honda Vezel 2017",
        make: "Honda",
        model: "Vezel",
        manufactureYear: 2017,
        mileageKm: 65000,
        location: "Chattogram",
        priceBdt: 2100000,
        conditionNotes:
          "Rear-end collision in 2020, professionally repaired. Drives well, cosmetic panel replaced.",
        inspectionNotes: "Inspection report on file, visible on all future relistings.",
        ownershipVerified: true,
        accidentStatus: AccidentStatus.ONE_INCIDENT,
        status: ListingStatus.ACTIVE,
      },
      {
        sellerId: byName("A. Karim"),
        title: "Nissan X-Trail 2015",
        make: "Nissan",
        model: "X-Trail",
        manufactureYear: 2015,
        mileageKm: 110000,
        location: "Sylhet",
        priceBdt: 1800000,
        conditionNotes:
          "Seller-reported good condition, single owner. Minor scratch on front-left fender and two small dents on the tailgate (see auction sheet). Full service history available.",
        inspectionNotes: "Not yet requested by buyer.",
        ownershipVerified: false,
        accidentStatus: AccidentStatus.NOT_CHECKED,
        // Seller-submitted registration + auction sheet, awaiting admin review.
        // This is the sample the admin panel shows out of the box.
        registrationNumber: "DHAKA METRO-GA 14-7788",
        registrationYear: 2016,
        transmission: "CVT",
        fuelType: "Petrol",
        engineCc: 2000,
        color: "Pearl White",
        auctionSheetUrl: "/sample-auction-sheet.svg",
        status: ListingStatus.PENDING_VERIFICATION,
      },
      // The three listings above come from the prototype and are all long past
      // the import-eligibility window, so the BRTA paper-value tracker reads
      // "aged out" on every one. These two are recent enough to exercise the
      // healthy and near-the-limit states.
      {
        sellerId: byName("M. Rahman"),
        title: `Toyota Corolla Cross ${eligibleYear(2)}`,
        make: "Toyota",
        model: "Corolla Cross",
        manufactureYear: eligibleYear(2),
        mileageKm: 18400,
        location: "Dhaka",
        priceBdt: 4650000,
        conditionNotes:
          "Company-maintained, still under manufacturer warranty. Full digital service record.",
        inspectionNotes: "Dealer inspection completed at last service, report attached.",
        ownershipVerified: true,
        accidentStatus: AccidentStatus.NONE_FOUND,
        status: ListingStatus.ACTIVE,
      },
      {
        sellerId: byName("S. Islam"),
        title: `Honda City ${eligibleYear(4)}`,
        make: "Honda",
        model: "City",
        manufactureYear: eligibleYear(4),
        mileageKm: 39500,
        location: "Dhaka",
        priceBdt: 2850000,
        conditionNotes:
          "Second owner, garage kept. Tyres replaced last year, no accident history on record.",
        inspectionNotes: "Third-party inspection available on request.",
        ownershipVerified: true,
        accidentStatus: AccidentStatus.NONE_FOUND,
        status: ListingStatus.ACTIVE,
      },
    ],
  });
}

// -------------------------------------------------------------- auctions

/**
 * Scheduled sessions are pinned to realistic JST clock times on future days
 * rather than "now + N hours" — otherwise every session lands at the same
 * wall-clock time and the JST/BST columns all read identically.
 */
const AUCTIONS = [
  { house: "USS Yokohama", location: "Yokohama, Kanagawa", inDays: 0, jstHour: 14, jstMinute: 0 },
  { house: "TAA Kanto", location: "Sagamihara, Kanagawa", inDays: 1, jstHour: 10, jstMinute: 30 },
  { house: "USS Nagoya", location: "Toyoake, Aichi", inDays: 2, jstHour: 9, jstMinute: 0 },
  { house: "Arai Bay Auction", location: "Kisarazu, Chiba", inDays: 3, jstHour: 11, jstMinute: 0 },
  { house: "JU Gifu", location: "Gifu", inDays: 4, jstHour: 13, jstMinute: 30 },
];

/// JST is UTC+9 year-round (no DST), so a JST wall time maps to UTC by -9h.
/// Date.UTC normalises the negative hour by rolling the date back.
function jstDate(inDays: number, jstHour: number, jstMinute: number) {
  const nowJst = new Date(Date.now() + 9 * 3600e3);
  return new Date(
    Date.UTC(
      nowJst.getUTCFullYear(),
      nowJst.getUTCMonth(),
      nowJst.getUTCDate() + inDays,
      jstHour - 9,
      jstMinute,
    ),
  );
}

/**
 * Real auction lots run 1–2 minutes. The seeded live lot gets a 30-minute
 * window so the session is actually usable straight after seeding; an admin
 * can start any lot from the admin dashboard with whatever duration they want.
 */
const LIVE_LOT_SECONDS = 1800;

/// Model years are expressed as "age in years" so every lot stays inside the
/// import-eligibility window no matter when the seed runs.
const LOTS = [
  { lotNumber: "A-8842", make: "Toyota", model: "Harrier Hybrid", chassisCode: "AVU65", agedBy: 4, mileageKm: 32400, engineCc: 1986, grade: "4.5B", startingPriceJpy: 620000, reservePriceJpy: 680000 },
  { lotNumber: "A-8851", make: "Honda", model: "Vezel Hybrid Z", chassisCode: "RU3", agedBy: 4, mileageKm: 48900, engineCc: 1496, grade: "4B", startingPriceJpy: 460000, reservePriceJpy: 510000 },
  { lotNumber: "A-8863", make: "Mazda", model: "CX-5 XD", chassisCode: "KF2P", agedBy: 5, mileageKm: 61200, engineCc: 2188, grade: "4B", startingPriceJpy: 560000, reservePriceJpy: 620000 },
  { lotNumber: "A-8870", make: "Toyota", model: "Corolla Axio", chassisCode: "NZE161", agedBy: 3, mileageKm: 75500, engineCc: 1496, grade: "3.5C", startingPriceJpy: 300000, reservePriceJpy: 330000 },
  { lotNumber: "A-8881", make: "Nissan", model: "X-Trail 20X", chassisCode: "T32", agedBy: 5, mileageKm: 58100, engineCc: 1997, grade: "4B", startingPriceJpy: 430000, reservePriceJpy: 480000 },
  { lotNumber: "A-8894", make: "Toyota", model: "Premio 1.5F", chassisCode: "NZT260", agedBy: 4, mileageKm: 41700, engineCc: 1496, grade: "4.5B", startingPriceJpy: 420000, reservePriceJpy: 470000 },
];

async function seedAuctions(adminId: string) {
  // Everything that references an AuctionCar has to go first.
  await prisma.rating.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.containerBooking.deleteMany();
  await prisma.shipmentEvent.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.engagement.deleteMany();
  await prisma.auctionCar.updateMany({ data: { winningBidId: null } });
  await prisma.bid.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.auctionCar.deleteMany();
  await prisma.broadcast.deleteMany();
  await prisma.auction.deleteMany();

  const now = Date.now();
  const first = AUCTIONS[0];
  const rest = AUCTIONS.slice(1);

  // The nearest session is live and owns the seeded lots. It started half an
  // hour ago regardless of its nominal JST slot, so it is live on any seed run.
  const live = await prisma.auction.create({
    data: {
      house: first.house,
      location: first.location,
      startsAt: new Date(now - 30 * 60 * 1000),
      status: AuctionStatus.LIVE,
      createdByAdminId: adminId,
      lots: {
        create: LOTS.map((l, i) => {
          const { agedBy, ...lot } = l;
          const isOnBlock = i === 0;
          return {
            ...lot,
            manufactureYear: eligibleYear(agedBy),
            durationSeconds: LIVE_LOT_SECONDS,
            // First lot is on the block; the rest are queued for the admin.
            status: isOnBlock ? LotStatus.LIVE : LotStatus.PENDING,
            startedAt: isOnBlock ? new Date(now) : null,
            endsAt: isOnBlock ? new Date(now + LIVE_LOT_SECONDS * 1000) : null,
          };
        }),
      },
    },
  });

  for (const a of rest) {
    await prisma.auction.create({
      data: {
        house: a.house,
        location: a.location,
        startsAt: jstDate(a.inDays, a.jstHour, a.jstMinute),
        status: AuctionStatus.SCHEDULED,
        createdByAdminId: adminId,
        // Each scheduled session ships with its own catalog, so the admin can
        // start any of them and buyers immediately have lots to bid on.
        lots: {
          create: (EXTRA_CATALOGS[a.house] ?? []).map(({ agedBy, ...lot }) => ({
            ...lot,
            manufactureYear: eligibleYear(agedBy),
            durationSeconds: LIVE_LOT_SECONDS,
            status: LotStatus.PENDING,
          })),
        },
      },
    });
  }
  return live;
}

// --------------------------------------------------- modification studio

async function seedModification() {
  await prisma.savedBuild.deleteMany();
  await prisma.partFitment.deleteMany();
  await prisma.part.deleteMany();
  await prisma.rim.deleteMany();
  await prisma.spoiler.deleteMany();
  await prisma.configCar.deleteMany();

  // The FR names wheels (Rays, BBS, Work, Enkei), body kits (Rocket Bunny,
  // Modellista, Kuhl Racing), interior and lighting. Bolt patterns are the real
  // ones for each chassis, so the fitment checker rejects genuinely wrong parts:
  //   AVU65 Harrier 5x114.3 · RU3 Vezel 5x114.3 · KF2P CX-5 5x114.3
  //   T32 X-Trail 5x114.3 · NZE161 Axio 4x100 · NZT260 Premio 5x100
  const parts = [
    { name: 'Rays TE37 Saga 18"', brand: "Rays", category: PartCategory.WHEELS, priceBdt: 185000, boltPattern: "5x114.3", offsetMm: 40, fits: ["AVU65", "RU3", "KF2P", "T32"] },
    { name: 'BBS LM 19"', brand: "BBS", category: PartCategory.WHEELS, priceBdt: 240000, boltPattern: "5x114.3", offsetMm: 35, fits: ["AVU65", "KF2P", "T32"] },
    { name: 'Work Emotion CR Kiwami 17"', brand: "Work", category: PartCategory.WHEELS, priceBdt: 152000, boltPattern: "5x100", offsetMm: 45, fits: ["NZT260"] },
    { name: 'Enkei RPF1 17"', brand: "Enkei", category: PartCategory.WHEELS, priceBdt: 98000, boltPattern: "4x100", offsetMm: 43, fits: ["NZE161"] },
    { name: "Rocket Bunny Wide Body Kit", brand: "Rocket Bunny", category: PartCategory.BODY_KIT, priceBdt: 320000, fits: ["AVU65"] },
    { name: "Modellista Aero Kit", brand: "Modellista", category: PartCategory.BODY_KIT, priceBdt: 210000, fits: ["AVU65", "NZT260", "NZE161"] },
    { name: "Kuhl Racing Full Kit", brand: "Kuhl Racing", category: PartCategory.BODY_KIT, priceBdt: 410000, fits: ["KF2P"] },
    { name: "LED Headlight Conversion", brand: "Koito", category: PartCategory.LIGHTING, priceBdt: 45000, fits: ["AVU65", "RU3", "KF2P", "T32", "NZE161", "NZT260"] },
    { name: "Sequential LED Tail Lamps", brand: "Valenti", category: PartCategory.LIGHTING, priceBdt: 62000, fits: ["AVU65", "RU3", "NZT260"] },
    { name: "Alcantara Steering Wheel", brand: "Damd", category: PartCategory.INTERIOR, priceBdt: 38000, fits: ["AVU65", "RU3", "KF2P", "T32"] },
    { name: "Ambient Interior Lighting Kit", brand: "Garson", category: PartCategory.INTERIOR, priceBdt: 21000, fits: ["AVU65", "RU3", "KF2P", "T32", "NZE161", "NZT260"] },
    // BRTA-illegal: surfaced but flagged, per the FR's "BRTA-legal" catalog framing.
    { name: "HID Underglow Kit", brand: "Generic", category: PartCategory.LIGHTING, priceBdt: 18000, brtaLegal: false, fits: ["AVU65", "RU3", "KF2P", "T32", "NZE161", "NZT260"] },
  ];
  for (const p of parts) {
    const { fits, ...part } = p;
    await prisma.part.create({
      data: { ...part, fitments: { create: fits.map((chassisCode) => ({ chassisCode })) } },
    });
  }

  const cars = [
    { slug: "aventador", name: "Lamborghini Aventador", tagline: "V12 · 700 HP" },
    { slug: "silvia-s15", name: "Nissan Silvia S15", tagline: "Garage Mak Widebody" },
    { slug: "prius-2012", name: "Toyota Prius 2012", tagline: "Hybrid · Fuel Sipper" },
    { slug: "prius-c", name: "2012 Toyota Prius C", tagline: "Subcompact Hybrid" },
    { slug: "chr", name: "Toyota C-HR", tagline: "Crossover Coupe" },
  ];
  for (const c of cars) {
    const car = await prisma.configCar.create({ data: c });
    await prisma.rim.createMany({
      data: [
        { name: "Stock", priceBdt: 0, configCarId: car.id },
        { name: 'TE37 18"', priceBdt: 185000, configCarId: car.id },
        { name: 'BBS LM 19"', priceBdt: 240000, configCarId: car.id },
      ],
    });
    await prisma.spoiler.createMany({
      data: [
        { name: "None", priceBdt: 0, configCarId: car.id },
        { name: "Ducktail", priceBdt: 65000, configCarId: car.id },
        { name: "GT Wing", priceBdt: 120000, configCarId: car.id },
      ],
    });
  }
}

// ------------------------------------------------------- research hub


async function seedResearch() {
  await prisma.researchIssue.deleteMany();
  await prisma.researchModel.deleteMany();
  for (const r of RESEARCH) {
    const { issues, ...model } = r;
    await prisma.researchModel.create({
      data: {
        ...model,
        issues: { create: issues.map((text) => ({ text })) },
        // Curated parts/servicing costs. Live market prices are NOT seeded —
        // they come from `npx tsx prisma/scrape-bikroy.ts`.
        maintenance: { create: MAINTENANCE[model.slug] ?? [] },
      },
    });
  }
}

// -------------------------------------------------- completed import history

/**
 * A past auction whose lots actually sold, so agent ratings are real rows
 * rather than a hardcoded average. Organization.ratingAvg/ratingCount are
 * recomputed from these — see recomputeOrgRatings.
 *
 * Note: successfulImports and avgTurnaroundDays stay as declared org history
 * (they predate the platform and are not derivable from our data), but the
 * star rating a buyer sees is genuinely computed from the Rating table.
 */
const HISTORY = [
  {
    lot: { lotNumber: "H-7701", make: "Toyota", model: "Harrier Hybrid", chassisCode: "AVU65", agedBy: 5, mileageKm: 40100, engineCc: 1986, grade: "4.5B", hammerJpy: 705000 },
    orgName: "Osaka Bridge Auto",
    buyerName: "Rafiul Hasan",
    rating: { communication: 5, gradingAccuracy: 5, timeliness: 4, overallValue: 5, comment: "Grading matched the car exactly when it arrived. No surprises." },
  },
  {
    lot: { lotNumber: "H-7702", make: "Honda", model: "Vezel Hybrid Z", chassisCode: "RU3", agedBy: 4, mileageKm: 51200, engineCc: 1496, grade: "4B", hammerJpy: 540000 },
    orgName: "Osaka Bridge Auto",
    buyerName: "M. Rahman",
    rating: { communication: 5, gradingAccuracy: 4, timeliness: 5, overallValue: 5, comment: "Fast replies during the live bid — felt like they were right there with me." },
  },
  {
    lot: { lotNumber: "H-7703", make: "Mazda", model: "CX-5 XD", chassisCode: "KF2P", agedBy: 5, mileageKm: 66800, engineCc: 2188, grade: "4B", hammerJpy: 655000 },
    orgName: "Yokohama Direct Trading",
    buyerName: "S. Islam",
    rating: { communication: 4, gradingAccuracy: 4, timeliness: 4, overallValue: 4, comment: "Good value agent, communicative throughout." },
  },
  {
    lot: { lotNumber: "H-7704", make: "Toyota", model: "Premio 1.5F", chassisCode: "NZT260", agedBy: 4, mileageKm: 44300, engineCc: 1496, grade: "4.5B", hammerJpy: 498000 },
    orgName: "TokyoLine Motors BD",
    buyerName: "A. Karim",
    rating: { communication: 4, gradingAccuracy: 5, timeliness: 3, overallValue: 4, comment: "Flat fee saved me money on a higher-bid lot." },
  },
  {
    lot: { lotNumber: "H-7705", make: "Nissan", model: "X-Trail 20X", chassisCode: "T32", agedBy: 5, mileageKm: 62400, engineCc: 1997, grade: "4B", hammerJpy: 505000 },
    orgName: "Nagoya Fleet Partners",
    buyerName: "Rafiul Hasan",
    rating: { communication: 5, gradingAccuracy: 4, timeliness: 4, overallValue: 4, comment: "Smaller agent, but very responsive for a first-timer like me." },
  },
];

async function seedHistory(
  adminId: string,
  orgs: { id: string; companyName: string }[],
  buyers: { id: string; fullName: string }[],
) {
  const orgByName = (n: string) => orgs.find((o) => o.companyName === n)!.id;
  const buyerByName = (n: string) => buyers.find((b) => b.fullName === n)!.id;

  const now = Date.now();
  const past = await prisma.auction.create({
    data: {
      house: "USS Yokohama",
      location: "Yokohama, Kanagawa",
      startsAt: new Date(now - 45 * 864e5),
      status: AuctionStatus.ENDED,
      createdByAdminId: adminId,
    },
  });

  for (const h of HISTORY) {
    const { agedBy, hammerJpy, ...lot } = h.lot;
    const buyerId = buyerByName(h.buyerName);

    const car = await prisma.auctionCar.create({
      data: {
        ...lot,
        auctionId: past.id,
        manufactureYear: eligibleYear(agedBy),
        startingPriceJpy: hammerJpy - 60000,
        reservePriceJpy: hammerJpy - 20000,
        durationSeconds: 300,
        startedAt: new Date(now - 45 * 864e5),
        endsAt: new Date(now - 45 * 864e5 + 300_000),
        status: LotStatus.SOLD,
      },
    });

    // A real winning Bid row, so the lot's price came from a bid like any other.
    const bid = await prisma.bid.create({
      data: { auctionCarId: car.id, bidderId: buyerId, amountJpy: hammerJpy },
    });
    await prisma.auctionCar.update({
      where: { id: car.id },
      data: { winningBidId: bid.id },
    });

    // The engagement is what records "this org bid on this lot for this buyer";
    // the admin revenue panel derives agent commission from it.
    await prisma.engagement.create({
      data: {
        buyerId,
        organizationId: orgByName(h.orgName),
        auctionCarId: car.id,
        targetCar: `${lot.make} ${lot.model}`,
        budgetCeilingBdt: Math.round(hammerJpy * 0.76 * 1.9),
        status: EngagementStatus.COMPLETED,
      },
    });

    await prisma.rating.create({
      data: {
        ...h.rating,
        buyerId,
        organizationId: orgByName(h.orgName),
        auctionCarId: car.id,
        createdAt: new Date(now - (30 - HISTORY.indexOf(h)) * 864e5),
      },
    });
  }
  return past;
}

/**
 * Current engagements — the organization dashboard's "who is hiring you" list.
 * Mirrors the prototype's ORG_HIRES, but as real rows against real lots.
 */
const HIRES = [
  { buyerName: "Rafiul Hasan", orgName: "Osaka Bridge Auto", lotNumber: "A-8842", targetCar: "Toyota Harrier Hybrid · 2018–2020", budgetCeilingBdt: 5500000, status: EngagementStatus.REQUESTED },
  { buyerName: "Nusrat Jahan", orgName: "Osaka Bridge Auto", lotNumber: "A-8851", targetCar: "Honda Vezel · 2019+, ≤ 40k km", budgetCeilingBdt: 4500000, status: EngagementStatus.ACTIVE },
  { buyerName: "Tanvir Ahmed", orgName: "Osaka Bridge Auto", lotNumber: "A-8863", targetCar: "Mazda CX-5 diesel · grade 4+", budgetCeilingBdt: 6000000, status: EngagementStatus.REQUESTED },
  { buyerName: "Rafiul Hasan", orgName: "Yokohama Direct Trading", lotNumber: "A-8894", targetCar: "Toyota Premio · low mileage", budgetCeilingBdt: 3800000, status: EngagementStatus.ACTIVE },
];

async function seedEngagements(
  orgs: { id: string; companyName: string }[],
  buyers: { id: string; fullName: string }[],
) {
  const orgByName = (n: string) => orgs.find((o) => o.companyName === n)!.id;
  const buyerByName = (n: string) => buyers.find((b) => b.fullName === n)!.id;

  for (const h of HIRES) {
    const lot = await prisma.auctionCar.findFirst({
      where: { lotNumber: h.lotNumber, status: { in: [LotStatus.PENDING, LotStatus.LIVE] } },
    });
    if (!lot) continue;

    await prisma.engagement.create({
      data: {
        buyerId: buyerByName(h.buyerName),
        organizationId: orgByName(h.orgName),
        auctionCarId: lot.id,
        targetCar: h.targetCar,
        budgetCeilingBdt: h.budgetCeilingBdt,
        status: h.status,
      },
    });
  }
}

/** ratingAvg/ratingCount are denormalised aggregates — derive, never invent. */
async function recomputeOrgRatings() {
  const grouped = await prisma.rating.groupBy({
    by: ["organizationId"],
    _avg: { overallValue: true },
    _count: { _all: true },
  });

  for (const org of await prisma.organization.findMany({ select: { id: true } })) {
    const row = grouped.find((g) => g.organizationId === org.id);
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        ratingAvg: row?._avg.overallValue ?? null,
        ratingCount: row?._count._all ?? 0,
      },
    });
  }
}

// ------------------------------------------------------------ containers

async function seedContainers() {
  await prisma.containerBooking.deleteMany();
  await prisma.container.deleteMany();
  const now = Date.now();
  await prisma.container.createMany({
    data: [
      { originPort: "Yokohama", destinationPort: "Chattogram", departureDate: new Date(now + 11 * 864e5), capacity: 10, sizeClass: "40ft" },
      { originPort: "Nagoya", destinationPort: "Chattogram", departureDate: new Date(now + 19 * 864e5), capacity: 10, sizeClass: "40ft" },
    ],
  });
}

// ------------------------------------------------------------------ main

async function main() {
  await seedSettings();
  const admin = await seedAdmin();
  const orgs = await seedOrgs();
  const buyers = await seedBuyers();
  await seedNewCars();
  await seedUsedCars(buyers);
  const liveAuction = await seedAuctions(admin.id);
  await seedHistory(admin.id, orgs, buyers);
  await seedEngagements(orgs, buyers);
  await recomputeOrgRatings();
  await seedModification();
  await seedResearch();
  await seedContainers();

  const lots = await prisma.auctionCar.count();
  const ratings = await prisma.rating.count();
  const listings = await prisma.usedCarListing.count();
  const newCarModels = BRANDS.reduce((n, b) => n + b.cars.length, 0);
  const dealerCount = BRANDS.reduce((n, b) => n + b.dealers.length, 0);
  console.log(
    [
      `settings: ${Object.keys(SETTINGS).length}, duty bands: ${DUTY_BANDS.length}`,
      `admin: ${ADMIN_EMAIL}`,
      `orgs: ${orgs.length} (approved), buyers: ${buyers.length}`,
      `brands: ${BRANDS.length}, new car models: ${newCarModels}, dealers: ${dealerCount}, used listings: ${listings}, research models: ${RESEARCH.length}`,
      `auctions: ${AUCTIONS.length} live/scheduled (current: ${liveAuction.house}) + 1 ended, lots: ${lots}`,
      `import history: ${HISTORY.length} sold lots, ${ratings} ratings (org star ratings derived from these)`,
    ].join("\n"),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
