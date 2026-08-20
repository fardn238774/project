// Research Hub models — the brand list is derived from the "Make Model" name
// (see src/lib/research.ts brandOf), so adding a model here also fills its brand.
// Shared by the seed and the sync script. Live prices come from the scraper;
// specs, reliability and TCO inputs are curated for the Bangladesh market.

export type ResearchSeed = {
  slug: string;
  name: string;
  tagline: string;
  specs: string;
  regTaxBdt: number;
  tokenTaxBdt: number;
  insuranceBdt: number;
  fuelPricePerL: number;
  kmPerL: number;
  issues: string[];
};

export const RESEARCH: ResearchSeed[] = [
  // ---------------------------------------------------------------- Toyota
  {
    slug: "harrier",
    name: "Toyota Harrier",
    tagline: "60/80 series, hybrid & petrol SUV",
    specs:
      "60-series (2013–2020): 2.0L petrol / 2.0L hybrid, FWD/AWD. 80-series (2020–): redesigned platform, 2.0L hybrid standard, more advanced safety suite.",
    regTaxBdt: 85000, tokenTaxBdt: 12000, insuranceBdt: 28000, fuelPricePerL: 125, kmPerL: 14,
    issues: [
      "CVT judder reported on early 60-series petrol variants",
      "Hybrid battery degradation after 120,000km on high-mileage imports",
      "Panel gaps on aftermarket bumper replacements",
    ],
  },
  {
    slug: "premio",
    name: "Toyota Premio",
    tagline: "Sedan, strong resale value",
    specs:
      "T260 generation (2007–2021), 1.5L/1.8L petrol. Long production run means excellent parts availability in BD.",
    regTaxBdt: 58000, tokenTaxBdt: 8000, insuranceBdt: 19000, fuelPricePerL: 125, kmPerL: 16,
    issues: [
      "Oil consumption on high-mileage 1.8L units",
      "Power window regulator wear",
      "AC compressor clutch failure common past 100,000km",
    ],
  },
  {
    slug: "axio",
    name: "Toyota Axio",
    tagline: "The default family sedan",
    specs:
      "E160/E170 (2012–): 1.5L petrol and 1.5L hybrid, CVT. Cheap parts and easy resale make it the most common used sedan in Bangladesh.",
    regTaxBdt: 55000, tokenTaxBdt: 8000, insuranceBdt: 18000, fuelPricePerL: 125, kmPerL: 20,
    issues: [
      "CVT belt wear on very high-mileage units",
      "Hybrid battery aging on early imports",
      "Dashboard/interior rattles are common",
    ],
  },
  {
    slug: "aqua",
    name: "Toyota Aqua",
    tagline: "Ultra-efficient hybrid hatch",
    specs:
      "NHP10 (2011–): 1.5L hybrid, among the most fuel-efficient cars on BD roads. Very popular for ride-sharing.",
    regTaxBdt: 48000, tokenTaxBdt: 7000, insuranceBdt: 16000, fuelPricePerL: 125, kmPerL: 26,
    issues: [
      "Hybrid battery degradation past ~150,000km",
      "Weak AC cooling in heavy traffic",
      "Noticeable road noise at highway speed",
    ],
  },
  {
    slug: "corolla-cross",
    name: "Toyota Corolla Cross",
    tagline: "Modern compact SUV",
    specs:
      "2020–: 1.8L petrol and hybrid, high ground clearance for BD roads. Newer imports are often still under warranty.",
    regTaxBdt: 130000, tokenTaxBdt: 18000, insuranceBdt: 42000, fuelPricePerL: 125, kmPerL: 16,
    issues: [
      "Independent parts still limited (recent model)",
      "Firm ride over rough roads",
      "Infotainment lag on early units",
    ],
  },
  {
    slug: "noah",
    name: "Toyota Noah",
    tagline: "7-seat family / hybrid MPV",
    specs:
      "R80 (2014–): 2.0L petrol and 1.8L hybrid, 7–8 seats. The go-to family van and tour vehicle in Bangladesh.",
    regTaxBdt: 95000, tokenTaxBdt: 14000, insuranceBdt: 30000, fuelPricePerL: 125, kmPerL: 13,
    issues: [
      "Sliding-door motor wear over time",
      "Suspension sag when regularly overloaded",
      "Hybrid battery replacement cost on high-mileage units",
    ],
  },
  // ----------------------------------------------------------------- Honda
  {
    slug: "vezel",
    name: "Honda Vezel",
    tagline: "Compact hybrid crossover",
    specs:
      "Gen 1 (2013–2018): 1.5L hybrid, well-suited to city driving. Gen 2 (2021–): larger footprint, upgraded hybrid system, more BD imports arriving.",
    regTaxBdt: 62000, tokenTaxBdt: 9000, insuranceBdt: 21000, fuelPricePerL: 125, kmPerL: 18,
    issues: [
      "Gen 1 hybrid IPU cooling fan wear",
      "Squeaky rear suspension on high-mileage units",
      "Infotainment unit failures in humid climates",
    ],
  },
  {
    slug: "fit",
    name: "Honda Fit",
    tagline: "Roomy, efficient hatchback",
    specs:
      "GK/GP (2013–): 1.3/1.5L petrol and hybrid, class-leading cabin space for its size. A long-time city favourite.",
    regTaxBdt: 52000, tokenTaxBdt: 8000, insuranceBdt: 17000, fuelPricePerL: 125, kmPerL: 19,
    issues: [
      "Early DCT hybrid judder (largely recalled/fixed)",
      "Thin paint on some imports",
      "Infotainment faults in humidity",
    ],
  },
  {
    slug: "grace",
    name: "Honda Grace",
    tagline: "Hybrid compact sedan",
    specs:
      "GM (2014–): 1.5L hybrid sedan, the Honda City's sibling. Efficient with a roomy boot.",
    regTaxBdt: 55000, tokenTaxBdt: 8000, insuranceBdt: 18000, fuelPricePerL: 125, kmPerL: 21,
    issues: [
      "Hybrid clutch-pack wear over time",
      "Suspension bushing noise",
      "AC compressor wear past ~100,000km",
    ],
  },
  // ----------------------------------------------------------------- Nissan
  {
    slug: "x-trail",
    name: "Nissan X-Trail",
    tagline: "Practical 5/7-seat SUV",
    specs:
      "T32 (2013–): 2.0L petrol and hybrid, optional 7 seats. A comfortable, spacious highway cruiser.",
    regTaxBdt: 98000, tokenTaxBdt: 14000, insuranceBdt: 31000, fuelPricePerL: 125, kmPerL: 12,
    issues: [
      "CVT overheating on long hill climbs",
      "Hybrid-system quirks on early units",
      "Boot/tailgate electronics faults",
    ],
  },
  {
    slug: "note",
    name: "Nissan Note",
    tagline: "e-POWER efficient hatch",
    specs:
      "E12 (2012–): 1.2L petrol and e-POWER hybrid. e-POWER drives like an EV and is very economical in the city.",
    regTaxBdt: 46000, tokenTaxBdt: 7000, insuranceBdt: 16000, fuelPricePerL: 125, kmPerL: 23,
    issues: [
      "e-POWER inverter faults (rare)",
      "Weak factory brakes",
      "Interior plastics scratch easily",
    ],
  },
  // ------------------------------------------------------------------ Mazda
  {
    slug: "cx5",
    name: "Mazda CX-5",
    tagline: "Petrol/diesel mid-size SUV",
    specs:
      "KE (2012–2016) and KF (2017–) generations. SkyActiv petrol dominant in BD imports; diesel rare due to parts availability.",
    regTaxBdt: 95000, tokenTaxBdt: 14000, insuranceBdt: 31000, fuelPricePerL: 125, kmPerL: 12,
    issues: [
      "Timing chain rattle on early SkyActiv-G engines",
      "Infotainment dial (Mazda Connect) failures",
      "Rust on rear wheel arches in coastal-import units",
    ],
  },
  // ----------------------------------------------------------------- Suzuki
  {
    slug: "swift",
    name: "Suzuki Swift",
    tagline: "Nimble, cheap-to-run hatch",
    specs:
      "2011–: 1.2L petrol, light and frugal. About the cheapest car to maintain in its class in Bangladesh.",
    regTaxBdt: 42000, tokenTaxBdt: 6000, insuranceBdt: 14000, fuelPricePerL: 125, kmPerL: 18,
    issues: [
      "Thin paint and light panels dent easily",
      "Road and engine noise at speed",
      "Clutch wear on manual units",
    ],
  },
  // ------------------------------------------------------------- Mitsubishi
  {
    slug: "outlander",
    name: "Mitsubishi Outlander",
    tagline: "Value 7-seat SUV / PHEV",
    specs:
      "2013–: 2.0/2.4L petrol and PHEV plug-in hybrid, 7 seats. A lot of space and equipment for the money.",
    regTaxBdt: 110000, tokenTaxBdt: 15000, insuranceBdt: 33000, fuelPricePerL: 125, kmPerL: 11,
    issues: [
      "PHEV battery replacement cost on plug-in units",
      "CVT hesitation from a standstill",
      "Dated infotainment on early units",
    ],
  },
];
