# Data fixes — 3 Nov 2026 (see data-fixes.json)
1. **lnp.nuclear** — keep OUT of Coalition budget subtotal. PBO ECR-2025-2009: govt equity $36.4bn to 2035, $118.2bn to 2050 (Coalition figure, not PBO-costed); equity hits headline cash/debt, not underlying deficit. Show separately: "System cost 2025-50: Frontier $331bn / $446bn (Coalition-requested) vs Climate Council $775-821bn (advocacy)".
2. **Sources** — defence: SMH 21 Jun 2026 (PBO: +$225bn/10 yrs). Migration: The Age 18 Oct 2026 (PBO Build-your-own-Budget tool; +$275bn debt, $391bn vs $108bn cumulative deficits, -$212bn output). Both load.
3. **Agriculture US jobs** — QCEW 2025 NAICS 11 private 1,230,725 (annual avg, UI-covered; excl. self-employed). Not CES. Label "QCEW". ERS: 1.18m (2024).
4. **Estimates** — defence (22.5bn/yr) and migration (28.3bn/yr) verified; rent freeze re-based on ABS rents +3.6% (Sep qtr 2026); carbon levy PBO figure still unretrievable (very low); retiree threshold & duplication: no costing exists anywhere (placeholders, very low).
5. **Tariffs** — SCOTUS 20 Feb 2026 IEEPA ruling CONFIRMED. s122 10% surcharge expired 24 Jul 2026, replaced by s301 forced-labor tariffs (10%/12.5%, 60 economies; 91 FR 47318). s232 product tariffs remain. Rate: Yale statutory 11.1% (24 Jul), effective 10.85% pre / 9.05% post-substitution; Tax Foundation 7.2% (2026, collected); PWBM 7.1% (Aug). **Conflict:** Democrat preset -10 pts exceeds the whole post-2024 increase (~7-9 pts) → suggest -7 (range -5 to -8.5). Check Republican $1.2tn tariff-dividend source predates IEEPA ruling.


## Round 2 (2026-11-03)

- **onp.end-health-and-education-duplication**: Replace SMH defence link with https://www.onenation.org.au/slash-waste (fetched 200). Policy = review of federal Education and Housing departments to eliminate duplication; no costing. Supporting: https://www.onenation.org.au/failing-education-australia
- **policy_sources**: policy_source_url added in estimates.json for rep.deregulation, rep.energy-supply-plans, dem.grocery-pricing-bills, lnp.spending-cap, lnp.surplus-target, grn.rent-controls, lnp.gas-reservation; state.policies left null (no single source). Method notes unchanged.
- **program_sizes**: 2026-27, $bn: Age Pension 68.670 (DSS PBS Prog 1.3); NDIS 56.124 (BP1 St6 Table 6.1.3); CCS 16.917 (Education PBS Prog 1.2); FTB 18.150 (DSS PBS Prog 1.1, A 14.119 + B 4.031). BP1: https://budget.gov.au/content/bp1/download/bp1_bs-6.pdf. checkrate/datawithoutguessing/advocacyforinclusion removed.
- **learn_more_links**: {"Grattan Institute": "https://grattan.edu.au/report/budget-reboot-how-to-fund-australias-future/", "e61 Institute": "https://e61.in/wp-content/uploads/2026/09/How-many-housing-investors-pay-more-tax-under-the-reforms.pdf", "Productivity Commission": "https://www.pc.gov.au/inquiries-and-research/", "ANU TTPI": "https://crawford.anu.edu.au/ttpi/research (box curl to taxpolicy.crawford.anu.edu.au timed out; page confirmed in search index, not load-checked from box)", "RBA education": "https://www.rba.gov.au/education/resources/explainers/"}
- **grn.carbon-price**: Keep placeholder. PBO page found: https://www.pbo.gov.au/elections/2025-general-election/2025-election-commitments-costings/powering-past-coal-and-gas-make-polluters-pay-damage-they-are-doing (ECR-2025-3365, $100/t on emitters ≥25kt, from 1 Jul 2025) but the figure is in a PDF the box can't fetch; ~$10.8bn/decade snippet still unconfirmed. Interacts with 12 other Greens measures (ECR-2025-3901).
- **grn.rent-freeze**: Median rent $713/wk, Sep qtr 2026, Cotality (published 2026-10-09) https://www.cotality.com/au/insights/articles/rental-growth-loses-momentum-as-vacancy-rates-rise; +5.5% y/y. Alt: REA $675/wk.
- **sector.agri.usJobs**: 1,231,078 private (total 1,235,695) NAICS 11, US, 2025 annual average, BLS QCEW API https://data.bls.gov/cew/data/api/2025/a/industry/11.csv
- **us.tariffs.regime.republican**: Party leaders back keeping current tariffs: Section 232 product tariffs and the Section 301 forced-labour tariffs that replaced the expired Section 122 surcharge (IEEPA tariffs struck down 20 Feb 2026). No new across-the-board rate stated.
- **logic_check**: All 3 approved explorer fixes present in merged canvas: (1) labour-income gating line 1426-1427 (retiree/student/smb default labour 0), WATO/deduction use labour; (2) Coalition window sums coalitionUCB.slice(1) from 2026-27 (line 1455, text 1533); (3) Greens childcare note line 1495. Minor: chart at line 1535 still shows the 2025-26 bar. Spec for developer (optional): drop index 0 from labels and data in that chart, or label it '2025–26 (outside window)'.


## Review9 (2026-11-09): Economist accuracy review, round 3

Applied to the page source (`src/simulator.tsx`) and data (`data/*.json`). Party presets are unchanged (lever values and costing tables); the engine gives identical output for every preset and party except AUD/USD, which rescales to the new spot (see `tests/engine_r9.js`).

- **ECN-01 baseline refresh**: AUD/USD 0.6894 (9 Nov 2026, RBA F11.1; was 0.7038); US unemployment 4.1% Oct 2026 (BLS, 6 Nov, preliminary; payrolls +165k); Brent January futures $98.32 (6 Nov 2026, Reuters/Euronext; CNBC), stored once as `BRENT` and used by the oil hint, Data & sources and the Mix scorecard; "What changed" rewritten for 9 Nov (midterm results, RBA, Fed, CPI).
- **ECN-06 / ECN-26**: US base labelled "CBO Feb 2026, pre-IEEPA ruling"; Aug 2026 update (+$0.9tn over 2027-36) and FY2026 actual deficit ($1.993tn, about 6.2% of GDP) noted as secondary-source figures. B.def not moved.
- **ECN-07**: AU household cover note rewritten (2026 proposals: Coalition 26 Oct, Greens 27-28 Oct); proposal rows added (Greens threshold to $26,000, up to $1,092 a year; Coalition Tax Back Guarantee replaces WATO from 2029-30). Not in totals.
- **ECN-08**: caveat only (tax term uses the whole tax lever). Personal vs company split needs data.
- **ECN-09 / ECN-12 / ECN-20**: on-screen explanations (early debt dip; yen carry-trade channel; oil volatility penalty) plus rules-of-thumb text.
- **ECN-10**: disclosure that the engine's migration budget effect (about A$16bn a year) is not yet reconciled with $28.3bn a year / $275bn.
- **ECN-11**: Budget and debt table uses + = cost throughout; Coalition chart shown as + = cost (PBO data kept in UCB sign).
- **ECN-13**: HELP 2026-27: $69,528 / 15% to $129,717 / then 17% / 10% of total income from $186,051 (ATO).
- **ECN-14**: Medicare levy 2025-26: $28,011 to $35,013 phase-in at 10%; SAPTO $44,268 / $55,335 for the retiree profile (ATO).
- **ECN-15**: Labor low range now includes WATO.
- **ECN-16**: A$31bn and US$0.319tn per 1% of GDP, stored once (`AU_BN_PER_PCT`, `US_TN_PER_PCT`). estimates.json keeps its own A$3,020bn denominator.
- **ECN-17**: both US gross debt figures labelled with source and period (CBO FY2026 est. 123.6%; FRED Q2 2026 121%).
- **ECN-18**: yields text matches the code (0.02 points per point of debt; no deficit term).
- **ECN-19**: every low-to-high range now spans the low, middle and high runs.
- **ECN-21**: superlatives softened; RBA cash-rate row labelled a market-path assumption. AEC window not changed (not verified).
- **ECN-22**: Aus CPI headline 4.3% y/y (Sep 2026, ABS monthly) with trimmed mean 3.6%; 3.9% kept and labelled quarterly.
- **ECN-23**: grn.dental-medicare hidden from the uncosted estimates block (`pbo_costed: true`).
- **ECN-24**: Republican tariff note now says the party position is unsourced (CNBC guide has no tariff section).
- **ECN-25**: long-run charts mark 2056 (end of CBO's window; extrapolation after).
- **ECN-28 (non-preset part)**: grn.carbon-price now PBO ECR-2025-3365: low -17.5 / central -17.2 / high -15.0 A$bn a year (confidence medium). Added to the Greens preset in review10 (below).
- **ECN-29**: grn.rent-freeze 1,100 / 2,000 / 3,100 a household a year.
- **ECN-P1/P2/P3**: ANU link https://crawford.anu.edu.au/ttpi/research; sectors footnote "agriculture from QCEW"; jump anchor clears the pinned Go to box at 390px.
- **ECN-05**: the review9 `ends` hook was replaced in review10 by fixed per-lever timing (`sched`, below).

### Review9 UI fixes (Study Bot usability review, 2026-11-09)
- **SB-01**: at phone width (under 600px) the Go to menu sits at the top of the page instead of floating over the warning; desktop keeps the pinned bar.
- **SB-02**: "What changed" is stored once as dated data (`CHANGES`). The heading shows "as of <date>", never "today", and each "coming up" item moves to the past list once its date passes on the reader's clock. Content stays Economist's.
- **SB-03**: one-line definition of r − g on Road to Surplus.
- **SB-04**: CBO AI report link (https://www.cbo.gov/publication/61147) kept: it matches the report in a search index, but cbo.gov returns 403 to scripted requests, so the empty "cbo.gov" page is CBO's bot block. Not load-verified from the box.
- "Include every policy again" now shows only when something is excluded or isolated (it was a no-op otherwise).

## Review10 (2026-11-09): approved party preset changes
Economist review9 items ECN-02, ECN-03, ECN-04, ECN-05 and ECN-28 (Greens preset), approved by the owner. Party presets live only in `src/simulator.tsx` (`PARTIES`, `COSTING`).
- **ECN-02, US Republicans**: tariff dividend 0.74% of GDP a year in 2027-2031 only (5-year hard cap; the duration setting does not apply), from +0.8 for the duration setting. Status "published (CRFB)", not official, so the Parties table shows 0 of 4 officially costed. "Pre-ruling figure" and "CBO-based reporting" removed; note added: "Conditional on GOP control; condition not met (Nov 2026)", moot from Jan 2027, kept as a historical scenario. The review offered a one-off 3.7% in 2027 or 0.74 x 5 capped; the second is used because 3.7 is outside the spending lever range (-3 to +3).
- **ECN-03, Coalition**: spending -0.19 / -0.27 / -0.27 / -0.29% of GDP in 2028-29 to 2031-32 and 0 outside; tax 0 / 0 / -0.10 / -0.21 (net of WATO repeal; starts 2030-31), 0 after 2031-32 because the party costing stops there. A financial year sits in the calendar year it ends (2028-29 = engine year 2029; year 1 = 2027). The levers show the averages: spending -0.25, tax -0.08 (was -0.17).
- **ECN-04, Greens**: new revenue +0.9% of GDP, range +0.55 (gas only) to +1.5, from +1.5. Note: "royalties figure is a state-level estimate; federal mechanism not specified".
- **ECN-28, Greens**: carbon levy (PBO ECR-2025-3365, central A$17.2bn a year) added as +0.55% of GDP on the tax lever (A$31bn per 1% of GDP). Greens tax lever 1.13 -> 1.08 (-0.37 + 0.9 + 0.55). Parties costing: "Carbon price (PBO 2025, 2025 platform)", official.
- **ECN-05, fixed timing**: `Party.sched` gives a lever a path by calendar year that overrides the duration setting. In `run()` the lever is split into the scheduled part and any rest (which follows the duration setting); with no schedule the engine is unchanged (tests/engine_r10.js). Used by the Republican dividend and the Coalition savings and tax on the Parties tab and Mix & match, and in the Simulator after "Run <party> in the Simulator" while the lever still equals the party value (a note shows the fixed years).
- **ECN-05 One Nation fuel excise (applied 9 Nov 2026, owner approval)**: fuel excise halving -0.28% of GDP (A$8.6bn a year, range A$6.0bn to A$13.9bn; half of Budget 2026-27 fuel excise net of fuel tax credits) in FY2027-28 to FY2029-30 only, calendar 2028 to 2030 in the model. Start year: our assumption; One Nation states no start date. Its wording: "Halve the fuel excise to 26 cents per liter for 3 years with a review after 12 months, with the option to extend further." The lever total is a single value (`ONP_TAX.total`), set to -0.74% of GDP on 9 Nov 2026 with owner approval (was -0.6): about A$22.9bn a year, the sum of our item central estimates (fuel excise A$6.0bn, income splitting A$12.4bn, no GST on insurance A$3.0bn, retiree threshold A$1.5bn; A$31bn per 1% of GDP). The other tax items (-0.46) follow the duration setting, so the lever is -0.74 while the fuel cut is on and -0.46 from FY2030-31. The fuel estimate in `estimates.json` moves from 5.5 / 6.0 / 6.5 to 6.0 / 8.6 / 13.9.

## Data refresh (2026-11-09, Economist; verified rows only)
- **Constants**: US 10-year yield `B.y10` 4.91 -> 4.88 (US Treasury, 9 Nov; the old 4.91% was the 2 Nov reading). `BRENT` futures $98.32 (6 Nov) -> $92.57 (9 Nov settle, January contract; Dow Jones Market Data via Morningstar; Reuters). EIA Brent daily spot $123.10 (27 Oct) -> $107.03 (3 Nov; released 4 Nov; next 12 Nov), now stored once in `BRENT.spot`.
- **Data rows**: iron ore US$92.9/dmt (Mysteel SEADEX, 9 Nov; SGX figure dropped); ECB deposit rate 2.50% with source ECB Data Portal; UK Bank Rate 4.00% (5 Nov, 8-1; BoE lever hint too); euro-area HICP 4.0% (Oct flash, 4 Nov); China CPI 0.7% (Oct), PPI +5.7%; "Checked" now "9 Nov 2026 (refreshed rows only)". Re-checked and unchanged: RBA 4.85%, AUD 0.6894, US unemployment 4.1% and payrolls +165k, Fed 3.75-4.00%. MPs owning investment properties stays UNVERIFIED.
- **What changed**: as of "9 Nov 2026 (US close)". Items replaced with the refresh items (midterms House 254-163 with 18 uncalled, Senate 54-44; RBA and Fed; euro-area 4.0%; BoE 4.00% and Norges 4.50%; payrolls; Brent; China; AUD and ASX; 10-year yield; Australian CPI kept). The RBA "18-year high" is kept at the owner's instruction. Upcoming list replaced with 13 dated items (10 Nov to 10 Dec, including ABS Labour Force on 19 Nov). Items render as "<date>: <text>" and move to the past list on their date.
- **GDP re-base**: estimates.json % of GDP now uses AU A$3,095bn and US $31,902bn (was A$3,020bn and $33,010bn), matching the page's A$31bn and US$0.319tn per 1%. Values recomputed from each item's bn figures (AU shares about 2.4% smaller, US shares about 3.5% larger). Estimates are display-only, so the engine does not move because of the re-base.
- **Resolved**: `B.euPi` and `B.cnPi` now match the Data rows (see the next section).

## Model inputs matched to the Data rows (2026-11-09, Economist confirmed)

Every model starting value that has a "Data & sources" row now uses that row's value. The input matching does not touch party presets (One Nation ECN-05 is applied separately in the same release, above).

| Input | Before | After | Data row |
|---|---|---|---|
| `B.euPi` euro-area inflation | 3.8 | 4.0 | Euro area GDP / HICP: 4.0% (Oct flash, Eurostat) |
| `B.cnPi` China CPI | 0.9 | 0.7 | China GDP / CPI: 0.7% (Oct, NBS) |
| `B.ukG` UK growth | 1.0 | 1.2 | UK GDP growth: 1.2% y/y (ONS; the Europe table already used 1.2) |
| `EU uk.rate` (now `B.boe`) | 3.75 | 4.00 | UK CPI / Bank Rate: 4.00% (5 Nov 2026) |
| `EU is.def` Iceland balance | 0.0 | -0.1 | Iceland budget 2027: surplus ISK 5bn (0.1% GDP) |

- **Brent futures $92.57 and iron ore US$92.9**: no level enters the engine (the oil and China levers are % shocks). Brent is stored once in `BRENT` (already wired); iron ore is now stored once in `IRON` and read by its Data row, the China lever hint and the source link.
- **Norway**: the budget row is the structural non-oil deficit, a different measure from the engine's overall balance; not compared.
- **Wiring**: Data rows, slider hints, central-bank cards, the yen scoreboard note and US gross debt are written from `B`, `EU`, `BRENT` and `IRON` in code (new `B` keys: `boe`, `ecb`, `boj`, `usGross`). `tests/inputs_match.js` fails if a row and its input disagree, a row is typed back in as a fixed string, an input has no row, or Road to Surplus starting debt differs from `B`.
- **Effect on the no-change baseline (middle setting)**: China inflation -0.20 pts in year 1, -0.14 in year 2, about 0 by year 10; euro-area inflation +0.20 / +0.12 / about 0; UK growth +0.20 / +0.14 / about 0. US and Australian outputs and every party preset result are unchanged. Europe table: UK policy rate 3.75 -> 4.00 in year 1, deficit +0.04 to +0.05 pts, net debt +0.3 pts by year 10; Iceland deficit -0.10 in year 1, debt -0.6 pts by year 10.

## Start screen: choose a country (2026-11-09)

The page opens on a country choice: United States, Australia, or Both: compare. Picking one opens the Simulator set to that country (its lever group first, its scoreboard figures and charts, its Parties comparison and its Road to Surplus country). A Country row at the top of every tab switches later or returns to the start screen. Links with `?country=us|au|both`, `#us`, `#au`, `#both` or `?tab=...` skip the start screen when the address reaches the app; the published host currently runs the app in a frame and does not pass the address on, so on the published page every visit starts at the choice.
