# CatalogPatch

CatalogPatch is a local-browser product CSV transformer for controlled Shopify migrations.

It converts known WooCommerce, Squarespace, Square, Shopify, and generic product exports into a conservative Shopify product worksheet after the user approves the field map and reviews row-level findings.

## Why this product exists

Commerce platforms disagree about product headers, variant grouping, money formats, booleans, weights, images, and publication state. Spreadsheet edits are slow and can silently create duplicate products, broken variants, or incorrect prices.

CatalogPatch provides a reviewable transformation instead of direct store access.

## Current capabilities

- CSV, semicolon, and TSV parsing
- Quoted multiline values and escaped quotes
- UTF-8 with browser-side Windows-1252 fallback
- Source-profile detection
- Mapping across 29 source concepts
- WooCommerce parent/variation grouping
- Currency and weight normalization
- Sale-price to compare-at-price conversion
- Multi-image row expansion
- Critical and warning finding register
- Shopify worksheet, audit CSV, and mapping recipe downloads
- Responsive, offline-capable static application
- No account, analytics SDK, catalog server, or Shopify permission request

## Run locally

```bash
python3 -m http.server 4174
```

Open `http://127.0.0.1:4174/`.

## Test

```bash
node test.mjs
```

Browser QA uses Playwright:

```bash
python3 -m http.server 4174 &
node qa-app.mjs
```

## Product boundary

CatalogPatch creates a worksheet; it does not import to Shopify. Shopify's current upload preview and documentation remain authoritative. Store-specific taxonomy, metafields, market columns, locations, remote image availability, and platform changes require separate verification.

CatalogPatch is independent and is not affiliated with or endorsed by Shopify, WooCommerce, Squarespace, or Square.

## Commercial status

The beta is free. The proposed launch test is a $29 one-time founding licence; checkout is deliberately not enabled in the repository.
