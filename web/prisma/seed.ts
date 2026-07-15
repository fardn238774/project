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
} from "../src/generated/prisma/client";

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
    ratingAvg: 4.9,
    ratingCount: 521,
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
    ratingAvg: 4.8,
    ratingCount: 312,
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
    ratingAvg: 4.6,
    ratingCount: 198,
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
    ratingAvg: 4.4,
    ratingCount: 97,
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

const NEW_CARS = [
  {
    brand: "Toyota",
    model: "Corolla Cross Hybrid",
    priceMinBdt: 4800000,
    priceMaxBdt: 5800000,
    warrantyYears: 5,
    warrantyKm: 100000,
    variants: [
      { name: "X", priceBdt: 4800000, engine: "1.8L Hybrid", transmission: "CVT", economyKmPerL: 23 },
      { name: "G", priceBdt: 5300000, engine: "1.8L Hybrid", transmission: "CVT", economyKmPerL: 22 },
      { name: "Z", priceBdt: 5800000, engine: "1.8L Hybrid", transmission: "CVT", economyKmPerL: 21 },
    ],
  },
  {
    brand: "Honda",
    model: "City e:HEV",
    priceMinBdt: 4200000,
    priceMaxBdt: 4600000,
    warrantyYears: 3,
    warrantyKm: 100000,
    variants: [
      { name: "EL", priceBdt: 4200000, engine: "1.5L e:HEV", transmission: "e-CVT", economyKmPerL: 27 },
      { name: "SV", priceBdt: 4600000, engine: "1.5L e:HEV", transmission: "e-CVT", economyKmPerL: 26 },
    ],
  },
  {
    brand: "Mitsubishi",
    model: "Xpander",
    priceMinBdt: 3800000,
    priceMaxBdt: 4300000,
    warrantyYears: 5,
    warrantyKm: 100000,
    variants: [
      { name: "GLS", priceBdt: 3800000, engine: "1.5L Petrol", transmission: "4AT", economyKmPerL: 14 },
      { name: "Ultimate", priceBdt: 4300000, engine: "1.5L Petrol", transmission: "4AT", economyKmPerL: 14 },
    ],
  },
  {
    brand: "Suzuki",
    model: "Swift",
    priceMinBdt: 2900000,
    priceMaxBdt: 3300000,
    warrantyYears: 3,
    warrantyKm: 100000,
    variants: [
      { name: "GL", priceBdt: 2900000, engine: "1.2L Petrol", transmission: "5MT", economyKmPerL: 20 },
      { name: "GLX", priceBdt: 3300000, engine: "1.2L Petrol", transmission: "CVT", economyKmPerL: 19 },
    ],
  },
];

async function seedNewCars() {
  await prisma.dealerInquiry.deleteMany();
  await prisma.newCarVariant.deleteMany();
  await prisma.newCar.deleteMany();
  for (const c of NEW_CARS) {
    const { variants, ...car } = c;
    await prisma.newCar.create({ data: { ...car, variants: { create: variants } } });
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
        conditionNotes: "Seller-reported good condition. Ownership documents under BRTA verification review.",
        inspectionNotes: "Not yet requested by buyer.",
        ownershipVerified: false,
        accidentStatus: AccidentStatus.NOT_CHECKED,
        status: ListingStatus.PENDING_VERIFICATION,
      },
    ],
  });
}

// -------------------------------------------------------------- auctions

const AUCTIONS = [
  { house: "USS Yokohama", location: "Yokohama, Kanagawa", inHours: 3 },
  { house: "TAA Kanto", location: "Sagamihara, Kanagawa", inHours: 27 },
  { house: "USS Nagoya", location: "Toyoake, Aichi", inHours: 75 },
  { house: "Arai Bay Auction", location: "Kisarazu, Chiba", inHours: 99 },
  { house: "JU Gifu", location: "Gifu", inHours: 123 },
];

/// Model years are expressed as "age in years" so every lot stays inside the
/// import-eligibility window no matter when the seed runs.
const LOTS = [
  { lotNumber: "A-8842", make: "Toyota", model: "Harrier Hybrid", agedBy: 4, mileageKm: 32400, engineCc: 1986, grade: "4.5B", startingPriceJpy: 620000, reservePriceJpy: 680000 },
  { lotNumber: "A-8851", make: "Honda", model: "Vezel Hybrid Z", agedBy: 4, mileageKm: 48900, engineCc: 1496, grade: "4B", startingPriceJpy: 460000, reservePriceJpy: 510000 },
  { lotNumber: "A-8863", make: "Mazda", model: "CX-5 XD", agedBy: 5, mileageKm: 61200, engineCc: 2188, grade: "4B", startingPriceJpy: 560000, reservePriceJpy: 620000 },
  { lotNumber: "A-8870", make: "Toyota", model: "Corolla Axio", agedBy: 3, mileageKm: 75500, engineCc: 1496, grade: "3.5C", startingPriceJpy: 300000, reservePriceJpy: 330000 },
  { lotNumber: "A-8881", make: "Nissan", model: "X-Trail 20X", agedBy: 5, mileageKm: 58100, engineCc: 1997, grade: "4B", startingPriceJpy: 430000, reservePriceJpy: 480000 },
  { lotNumber: "A-8894", make: "Toyota", model: "Premio 1.5F", agedBy: 4, mileageKm: 41700, engineCc: 1496, grade: "4.5B", startingPriceJpy: 420000, reservePriceJpy: 470000 },
];

async function seedAuctions(adminId: string) {
  await prisma.bid.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.auctionCar.deleteMany();
  await prisma.broadcast.deleteMany();
  await prisma.auction.deleteMany();

  const now = Date.now();
  const first = AUCTIONS[0];
  const rest = AUCTIONS.slice(1);

  // The nearest session is live and owns the seeded lots.
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
          return {
            ...lot,
            manufactureYear: eligibleYear(agedBy),
            durationSeconds: 300,
            // First lot is on the block; the rest are queued.
            status: i === 0 ? LotStatus.LIVE : LotStatus.PENDING,
            startedAt: i === 0 ? new Date(now) : null,
            endsAt: i === 0 ? new Date(now + 300 * 1000) : null,
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
        startsAt: new Date(now + a.inHours * 3600 * 1000),
        status: AuctionStatus.SCHEDULED,
        createdByAdminId: adminId,
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

  const parts = [
    { name: 'Rays TE37 18"', brand: "Rays", category: PartCategory.WHEELS, priceBdt: 185000, boltPattern: "5x114.3", offsetMm: 40, fits: ["AVU65", "RU3"] },
    { name: "Rocket Bunny Body Kit", brand: "Rocket Bunny", category: PartCategory.BODY_KIT, priceBdt: 320000, fits: ["AVU65"] },
    { name: "LED Headlight Kit", brand: "Generic", category: PartCategory.LIGHTING, priceBdt: 45000, fits: ["AVU65", "RU3", "KF2P"] },
    { name: 'BBS LM 19"', brand: "BBS", category: PartCategory.WHEELS, priceBdt: 240000, boltPattern: "5x120", offsetMm: 35, fits: ["KF2P"] },
    { name: "Kuhl Racing Kit", brand: "Kuhl Racing", category: PartCategory.BODY_KIT, priceBdt: 410000, fits: ["KF2P"] },
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

const RESEARCH = [
  {
    slug: "harrier",
    name: "Toyota Harrier",
    tagline: "60/80 series, hybrid & petrol",
    specs:
      "60-series (2013–2020): 2.0L petrol / 2.0L hybrid, FWD/AWD. 80-series (2020–): redesigned platform, 2.0L hybrid standard, more advanced safety suite.",
    regTaxBdt: 85000,
    tokenTaxBdt: 12000,
    insuranceBdt: 28000,
    fuelPricePerL: 125,
    kmPerL: 14,
    issues: [
      "CVT judder reported on early 60-series petrol variants",
      "Hybrid battery degradation after 120,000km on high-mileage imports",
      "Panel gaps on aftermarket bumper replacements",
    ],
  },
  {
    slug: "vezel",
    name: "Honda Vezel",
    tagline: "Compact hybrid crossover",
    specs:
      "Gen 1 (2013–2018): 1.5L hybrid, well-suited to city driving. Gen 2 (2021–): larger footprint, upgraded hybrid system, more BD imports arriving.",
    regTaxBdt: 62000,
    tokenTaxBdt: 9000,
    insuranceBdt: 21000,
    fuelPricePerL: 125,
    kmPerL: 18,
    issues: [
      "Gen 1 hybrid IPU cooling fan wear",
      "Squeaky rear suspension on high-mileage units",
      "Infotainment unit failures in humid climates",
    ],
  },
  {
    slug: "cx5",
    name: "Mazda CX-5",
    tagline: "Petrol/diesel mid-size SUV",
    specs:
      "KE (2012–2016) and KF (2017–) generations. SkyActiv petrol dominant in BD imports; diesel rare due to parts availability.",
    regTaxBdt: 95000,
    tokenTaxBdt: 14000,
    insuranceBdt: 31000,
    fuelPricePerL: 125,
    kmPerL: 12,
    issues: [
      "Timing chain rattle on early SkyActiv-G engines",
      "Infotainment dial (Mazda Connect) failures",
      "Rust on rear wheel arches in coastal-import units",
    ],
  },
  {
    slug: "premio",
    name: "Toyota Premio",
    tagline: "Sedan, strong resale value",
    specs:
      "T260 generation (2007–2021), 1.5L/1.8L petrol. Long production run means excellent parts availability in BD.",
    regTaxBdt: 58000,
    tokenTaxBdt: 8000,
    insuranceBdt: 19000,
    fuelPricePerL: 125,
    kmPerL: 16,
    issues: [
      "Oil consumption on high-mileage 1.8L units",
      "Power window regulator wear",
      "AC compressor clutch failure common past 100,000km",
    ],
  },
];

async function seedResearch() {
  await prisma.researchIssue.deleteMany();
  await prisma.researchModel.deleteMany();
  for (const r of RESEARCH) {
    const { issues, ...model } = r;
    await prisma.researchModel.create({
      data: { ...model, issues: { create: issues.map((text) => ({ text })) } },
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
  await seedModification();
  await seedResearch();
  await seedContainers();

  const lots = await prisma.auctionCar.count();
  console.log(
    [
      `settings: ${Object.keys(SETTINGS).length}, duty bands: ${DUTY_BANDS.length}`,
      `admin: ${ADMIN_EMAIL}`,
      `orgs: ${orgs.length} (approved), buyers: ${buyers.length}`,
      `new cars: ${NEW_CARS.length}, used listings: 3, research models: ${RESEARCH.length}`,
      `auctions: ${AUCTIONS.length} (live: ${liveAuction.house}), lots: ${lots} (years ${eligibleYear(5)}-${eligibleYear(3)}, all import-eligible)`,
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
