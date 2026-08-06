# Car photos

Drop a car photo here and it appears automatically on that car's listing card
and detail page. No code or database changes needed.

## How

1. Save the photo into **this folder** (`web/public/cars/`).
2. Name the file `<brand>-<model>.jpg` exactly as listed below (`.png` /
   `.webp` also work).
3. Refresh — the photo replaces the hatched placeholder.

## Exact filenames expected

### Toyota
- `toyota-corolla-cross-hybrid.jpg`
- `toyota-corolla-altis.jpg`
- `toyota-yaris.jpg`
- `toyota-raize.jpg`

### Honda
- `honda-city-e-hev.jpg`
- `honda-civic.jpg`
- `honda-hr-v.jpg`

### Mitsubishi
- `mitsubishi-xpander.jpg`
- `mitsubishi-outlander.jpg`
- `mitsubishi-attrage.jpg`

### Suzuki
- `suzuki-swift.jpg`
- `suzuki-ciaz.jpg`
- `suzuki-vitara-brezza.jpg`

Landscape photos (roughly 3:2 or 16:9) look best — they're shown cropped to fill
the card. If a file is missing, the placeholder shows instead — nothing breaks.

## If you add a new car later

The filename is `<brand-slug>-<model>` lowercased, with every non-letter/number
turned into a hyphen. E.g. brand "Toyota" + model "Land Cruiser" →
`toyota-land-cruiser.jpg`.
