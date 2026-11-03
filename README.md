# US + Australia Policy Simulator

An interactive, illustrative model of how US and Australian party policies might move growth, inflation, unemployment, deficits, debt and household budgets, plus an "Australian household by party" explorer.

**Live:** https://us-plus-australia-policy-simulator-bm2t.pages.grok.bot/

## Layout
- `src/simulator.tsx` – the full page (all tabs, model, data tables, estimates display).
- `src/kit-mock.tsx` – a minimal local stand-in for the page UI kit, used to bundle and test offline.
- `tests/` – Puppeteer tests: tap tests at 390px (touch) and click tests at 1280px (mouse) for every control, presets, estimate switchers, NaN checks and console errors.
- `data/estimates.json` – estimates for uncosted items, with source, confidence and orientation.
- `data/data-fixes.json`, `docs/data-fixes.md` – data corrections applied, with sources.
- `data/uncosted_items.json` – which policies lack an official costing.

## Running tests
```
npm install
CHROME=/path/to/chrome npm test     # touch.js, every tab at 390px and 1280px
npm run test:presets
npm run test:merged
```

## Data sources
Official baselines and costings come from the CBO, PBO, Treasury, RBA, ABS, BLS (QCEW), USDA ERS, ONS and the Federal Register. US tariff baselines come from the Yale Budget Lab, the Tax Foundation, the Penn Wharton Budget Model and CRS. Party policies come from published platforms and reporting (for example the SMH and The Age). Every figure on the page links to its source; see the "Data & sources" tab.

## Estimate rules
- Estimates are labelled **Estimate** and shown apart from costed totals (dashed band). They are never mixed into official figures.
- Each one shows its confidence and source. Unverified ones are labelled **Unverified projection**.
- Program-size and per-household entries are never summed.
- Partisan or advocacy sources are labelled as such.

## Disclaimer
**Estimates are not party figures.** This is an illustrative model, not a forecast or an official costing, and it is not financial advice.

## License
MIT
