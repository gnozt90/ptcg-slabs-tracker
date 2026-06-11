# PTCG Slabs Tracker

A static GitHub Pages tracker for Pokemon TCG graded slabs.

## Fields

The table shows:

| Card | Cert | Grade | Paid SGD | Market SGD | Gain/Loss SGD | Gain/Loss % | Delivered/Vaulted |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |

## Updating slabs

When a new invoice is provided, add an entry to `data/slabs.json`:

```json
{
  "card": "Card name and variant",
  "set": "Set name / card number",
  "cert": "PSA/CGC/BGS cert number",
  "grade": "PSA 10",
  "paidSGD": 100,
  "marketSGD": 120,
  "status": "Delivered",
  "purchaseDate": "2026-06-11",
  "marketDate": "2026-06-11",
  "marketSourceName": "eBay sold listing",
  "marketSourceUrl": "https://example.com"
}
```

Supported statuses are `Already Shipped`, `Delivered`, `Vaulted`, and `In transit`.

## GitHub Pages

This site is designed to be served directly from the repository root using GitHub Pages.
