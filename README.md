# US + Australia Policy Simulator

An interactive, illustrative model of how US and Australian party policies might move growth, inflation, unemployment, deficits, debt and household budgets, plus an "Australian household by party" explorer.

**Live:** https://us-plus-australia-policy-simulator-bm2t.pages.grok.bot/

## Layout
- `src/simulator.tsx` – the full page (all tabs, model, data tables, estimates display).
- `src/kit-mock.tsx` – a minimal local stand-in for the page UI kit, used to bundle and test offline.
- `tests/` – Puppeteer tests: tap tests at 390px (touch) and click tests at 1280px (mouse) for every control, presets, estimate switchers, NaN checks and console errors.
  - `tests/touch.js` – strict real-input test of every control on every tab (target size, not covered, output must change).
  - `tests/round2.js` – checks for the round-2 data fixes (tariff wording, QCEW farm jobs, outside-window label, links).
  - `tests/round3.js` – checks for the review9 fixes (Economist round 3 and Study Bot usability): dated "What changed", refreshed data, household rules, estimates, phone layout, r − g definition, no NaN, no console errors.
  - `tests/round4.js` – checks for the review10 party preset changes (Republican dividend timing and CRFB label, Coalition timing net of WATO, Greens revenue range and carbon levy, fixed timing in the Simulator), no NaN, no console errors; 390px touch and 1280px click.
  - `tests/engine_r11.js` – engine regression against the review9 engine (BASE_REF, default b697469, given the same new starting values: 10-year yield, China CPI, euro-area HICP, UK growth): scenario presets, unchanged parties and the engine with no schedule match exactly; lists what moved for the changed parties, checks the fixed timing (including One Nation's fuel excise part, 2028 to 2030) and reports the effect of the new starting values on the baseline, including the Europe table against PREV_REF (default c54b052). Replaces `engine_r9.js` and `engine_r10.js` (in git history).
  - `tests/landing.js` – the start screen (country choice): it shows first, each choice is a 44px+ target that opens the Simulator set to that country, the Country row switches later and returns to the start screen, and (local build) links with `?country=`, `#us`/`#au`/`#both` or `?tab=` skip it; 390px touch and 1280px click, no NaN, no console errors. Other tests pick "Both" on the start screen automatically (`tests/lib.js`).
  - `tests/inputs_match.js` – every model starting value with a Data & sources row must show the same number in that row; fails on a mismatch, a missing row, a row typed in as a fixed string or a new input without a row.
- `data/estimates.json` – estimates for uncosted items, with source, confidence and orientation.
- `data/data-fixes.json`, `docs/data-fixes.md` – data corrections applied, with sources.
- `data/uncosted_items.json` – which policies lack an official costing.

## Running tests
```
npm install
CHROME=/path/to/chrome npm test     # touch.js, every tab at 390px and 1280px
npm run test:presets
npm run test:merged
npm run test:round2
npm run test:round3      # URL=file:///path/to/local/index.html for a local build
npm run test:round4
npm run test:engine
npm run test:inputs
npm run test:landing
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
