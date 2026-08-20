// Extra auction catalogs, so every scheduled session has cars ready to run — the
// admin can start any of them and buyers can bid. Keyed by auction house.
//
// This file has NO side effects (pure data), so it is the single source of truth
// shared by both the seed (prisma/seed.ts) and the one-off backfill script.
// `agedBy` keeps model years inside the import-eligibility window: the actual
// year is derived as (current year − agedBy) wherever the data is used.

export type CatalogLot = {
  lotNumber: string;
  make: string;
  model: string;
  chassisCode: string;
  agedBy: number;
  mileageKm: number;
  engineCc: number;
  grade: string;
  startingPriceJpy: number;
  reservePriceJpy: number;
};

export const EXTRA_CATALOGS: Record<string, CatalogLot[]> = {
  "TAA Kanto": [
    { lotNumber: "K-3301", make: "Toyota", model: "Aqua G", chassisCode: "NHP10", agedBy: 4, mileageKm: 39000, engineCc: 1496, grade: "4B", startingPriceJpy: 350000, reservePriceJpy: 390000 },
    { lotNumber: "K-3312", make: "Honda", model: "Fit Hybrid", chassisCode: "GP5", agedBy: 4, mileageKm: 44000, engineCc: 1496, grade: "4B", startingPriceJpy: 320000, reservePriceJpy: 360000 },
    { lotNumber: "K-3320", make: "Toyota", model: "Prius A", chassisCode: "ZVW50", agedBy: 5, mileageKm: 58000, engineCc: 1797, grade: "3.5C", startingPriceJpy: 480000, reservePriceJpy: 520000 },
    { lotNumber: "K-3335", make: "Nissan", model: "Note e-POWER", chassisCode: "HE12", agedBy: 3, mileageKm: 28000, engineCc: 1198, grade: "4.5B", startingPriceJpy: 410000, reservePriceJpy: 450000 },
    { lotNumber: "K-3347", make: "Toyota", model: "Corolla Fielder", chassisCode: "NKE165", agedBy: 5, mileageKm: 71000, engineCc: 1496, grade: "4B", startingPriceJpy: 300000, reservePriceJpy: 340000 },
  ],
  "USS Nagoya": [
    { lotNumber: "N-5501", make: "Mazda", model: "Demio XD", chassisCode: "DJ5FS", agedBy: 5, mileageKm: 63000, engineCc: 1498, grade: "4B", startingPriceJpy: 330000, reservePriceJpy: 370000 },
    { lotNumber: "N-5510", make: "Toyota", model: "C-HR G", chassisCode: "ZYX10", agedBy: 4, mileageKm: 41000, engineCc: 1797, grade: "4.5B", startingPriceJpy: 590000, reservePriceJpy: 650000 },
    { lotNumber: "N-5523", make: "Subaru", model: "Impreza Sport", chassisCode: "GT7", agedBy: 4, mileageKm: 47000, engineCc: 1995, grade: "4B", startingPriceJpy: 520000, reservePriceJpy: 580000 },
    { lotNumber: "N-5534", make: "Honda", model: "Shuttle Hybrid", chassisCode: "GP7", agedBy: 5, mileageKm: 69000, engineCc: 1496, grade: "3.5C", startingPriceJpy: 360000, reservePriceJpy: 400000 },
    { lotNumber: "N-5546", make: "Toyota", model: "Roomy", chassisCode: "M900A", agedBy: 3, mileageKm: 22000, engineCc: 996, grade: "4.5B", startingPriceJpy: 470000, reservePriceJpy: 510000 },
  ],
  "Arai Bay Auction": [
    { lotNumber: "B-7702", make: "Nissan", model: "Serena Highway Star", chassisCode: "C27", agedBy: 4, mileageKm: 52000, engineCc: 1997, grade: "4B", startingPriceJpy: 610000, reservePriceJpy: 670000 },
    { lotNumber: "B-7711", make: "Toyota", model: "Voxy Hybrid", chassisCode: "ZWR80", agedBy: 5, mileageKm: 74000, engineCc: 1797, grade: "4B", startingPriceJpy: 720000, reservePriceJpy: 790000 },
    { lotNumber: "B-7725", make: "Honda", model: "Freed Hybrid", chassisCode: "GB7", agedBy: 4, mileageKm: 45000, engineCc: 1496, grade: "4.5B", startingPriceJpy: 560000, reservePriceJpy: 620000 },
    { lotNumber: "B-7738", make: "Toyota", model: "Sienta G", chassisCode: "NHP170G", agedBy: 5, mileageKm: 66000, engineCc: 1496, grade: "4B", startingPriceJpy: 440000, reservePriceJpy: 480000 },
  ],
  "JU Gifu": [
    { lotNumber: "G-9901", make: "Suzuki", model: "Swift Sport", chassisCode: "ZC33S", agedBy: 3, mileageKm: 31000, engineCc: 1371, grade: "4.5B", startingPriceJpy: 540000, reservePriceJpy: 600000 },
    { lotNumber: "G-9913", make: "Toyota", model: "Vitz RS", chassisCode: "NSP130", agedBy: 5, mileageKm: 59000, engineCc: 1496, grade: "4B", startingPriceJpy: 290000, reservePriceJpy: 330000 },
    { lotNumber: "G-9924", make: "Daihatsu", model: "Rocky Premium", chassisCode: "A200S", agedBy: 3, mileageKm: 24000, engineCc: 996, grade: "4.5B", startingPriceJpy: 500000, reservePriceJpy: 550000 },
    { lotNumber: "G-9936", make: "Mazda", model: "CX-3 XD", chassisCode: "DK5FW", agedBy: 5, mileageKm: 61000, engineCc: 1498, grade: "4B", startingPriceJpy: 470000, reservePriceJpy: 520000 },
  ],
};
