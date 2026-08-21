/**
 * Static fitment catalog for the Modification Studio's parts checker.
 *
 * Parts fit by JDM chassis code (see PartFitment). This table maps the friendly
 * brand → model → year → version a buyer knows onto the chassis code the catalog
 * matches against — so the checker can offer a modern cascading picker instead of
 * asking for a raw chassis code. Chassis↔model mappings are factual and stable,
 * so this lives in code (no DB table / reseed needed). Extend it as parts for new
 * chassis codes are added.
 *
 * Pure data — no prisma / server-only — so client components can import it.
 */
export type VehicleEntry = {
  brand: string;
  model: string;
  year: number;
  version: string;
  chassisCode: string;
};

export const VEHICLES: VehicleEntry[] = [
  // Toyota Harrier — AVU65
  { brand: "Toyota", model: "Harrier", year: 2017, version: "Elegance", chassisCode: "AVU65" },
  { brand: "Toyota", model: "Harrier", year: 2018, version: "Premium", chassisCode: "AVU65" },
  { brand: "Toyota", model: "Harrier", year: 2019, version: "Premium", chassisCode: "AVU65" },
  { brand: "Toyota", model: "Harrier", year: 2020, version: "Progress", chassisCode: "AVU65" },
  // Toyota Corolla Axio — NZE161
  { brand: "Toyota", model: "Corolla Axio", year: 2016, version: "1.5X", chassisCode: "NZE161" },
  { brand: "Toyota", model: "Corolla Axio", year: 2018, version: "1.5G", chassisCode: "NZE161" },
  { brand: "Toyota", model: "Corolla Axio", year: 2019, version: "1.5G", chassisCode: "NZE161" },
  // Toyota Premio — NZT260
  { brand: "Toyota", model: "Premio", year: 2016, version: "1.5F", chassisCode: "NZT260" },
  { brand: "Toyota", model: "Premio", year: 2018, version: "1.5X", chassisCode: "NZT260" },
  { brand: "Toyota", model: "Premio", year: 2019, version: "2.0G", chassisCode: "NZT260" },
  // Honda Vezel — RU3
  { brand: "Honda", model: "Vezel", year: 2017, version: "Hybrid X", chassisCode: "RU3" },
  { brand: "Honda", model: "Vezel", year: 2018, version: "Hybrid Z", chassisCode: "RU3" },
  { brand: "Honda", model: "Vezel", year: 2020, version: "Hybrid RS", chassisCode: "RU3" },
  // Mazda CX-5 — KF2P
  { brand: "Mazda", model: "CX-5", year: 2017, version: "XD", chassisCode: "KF2P" },
  { brand: "Mazda", model: "CX-5", year: 2019, version: "XD L Package", chassisCode: "KF2P" },
  { brand: "Mazda", model: "CX-5", year: 2021, version: "XD Exclusive", chassisCode: "KF2P" },
  // Nissan X-Trail — T32
  { brand: "Nissan", model: "X-Trail", year: 2016, version: "20S", chassisCode: "T32" },
  { brand: "Nissan", model: "X-Trail", year: 2018, version: "20X", chassisCode: "T32" },
  { brand: "Nissan", model: "X-Trail", year: 2020, version: "20Xi", chassisCode: "T32" },
];

const uniqSorted = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));

export function vehicleBrands(): string[] {
  return uniqSorted(VEHICLES.map((v) => v.brand));
}
export function vehicleModels(brand: string): string[] {
  return uniqSorted(VEHICLES.filter((v) => v.brand === brand).map((v) => v.model));
}
export function vehicleYears(brand: string, model: string): number[] {
  return [
    ...new Set(VEHICLES.filter((v) => v.brand === brand && v.model === model).map((v) => v.year)),
  ].sort((a, b) => b - a);
}
export function vehicleVersions(brand: string, model: string, year: number): string[] {
  return uniqSorted(
    VEHICLES.filter((v) => v.brand === brand && v.model === model && v.year === year).map(
      (v) => v.version,
    ),
  );
}
export function resolveChassis(
  brand: string,
  model: string,
  year: number,
  version: string,
): string | null {
  return (
    VEHICLES.find(
      (v) => v.brand === brand && v.model === model && v.year === year && v.version === version,
    )?.chassisCode ?? null
  );
}

/** Every chassis code the catalog knows, with a friendly label for the admin UI. */
export function chassisOptions(): { chassisCode: string; label: string }[] {
  const byChassis = new Map<string, string>();
  for (const v of VEHICLES) {
    if (!byChassis.has(v.chassisCode)) byChassis.set(v.chassisCode, `${v.brand} ${v.model}`);
  }
  return [...byChassis.entries()]
    .map(([chassisCode, name]) => ({ chassisCode, label: `${chassisCode} — ${name}` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
