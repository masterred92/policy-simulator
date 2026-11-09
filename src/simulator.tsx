import { Page, Section, Text, Callout, Grid, LineChart, Table, Button, Toggle, Segmented, Select, Input, LinkCards, BulletList, NumberedList, BackToTop, Metrics, Floating, Rows, Properties, TableOfContents, ColumnSeries, useState, useMemo, useEffect, useRef, useGrokTheme, ChangeEvent } from "grok/canvas";

type Lv = { tariff: number; usTax: number; usSpend: number; fed: number; rba: number; auSpend: number; auTax: number; china: number; pboc: number; boj: number; ecb: number; boe: number; oil: number; euShock: number; aiProd: number; aiJobs: number; auPop: number };
const ZERO: Lv = { auPop: 0, aiProd: 0, aiJobs: 0, tariff: 0, usTax: 0, usSpend: 0, fed: 0, rba: 0, auSpend: 0, auTax: 0, china: 0, pboc: 0, boj: 0, ecb: 0, boe: 0, oil: 0, euShock: 0 };
const PRESETS: { name: string; lv: Lv }[] = [
  { name: "Trade war", lv: { ...ZERO, tariff: 25, china: -15 } },
  { name: "Fed cuts hard", lv: { ...ZERO, fed: -3 } },
  { name: "China slowdown", lv: { ...ZERO, china: -30, rba: -1 } },
  { name: "China stimulus", lv: { ...ZERO, pboc: 3, china: 15 } },
  { name: "Big stimulus", lv: { ...ZERO, usSpend: 2, usTax: -1, auSpend: 1 } },
  { name: "Oil shock", lv: { ...ZERO, oil: 50 } },
  { name: "Oil collapse", lv: { ...ZERO, oil: -40 } },
  { name: "Yen carry unwind", lv: { ...ZERO, boj: 1.5, fed: -0.5 } },
  { name: "Europe recession", lv: { ...ZERO, euShock: -3, ecb: -1.5, boe: -1 } },
  { name: "Slow AI", lv: { ...ZERO, aiProd: 0.07 } },
  { name: "Middle AI", lv: { ...ZERO, aiProd: 0.4 } },
  { name: "AI boom", lv: { ...ZERO, aiProd: 1.5 } },
  { name: "AI boom + job disruption", lv: { ...ZERO, aiProd: 1.5, aiJobs: 2.5 } },
  { name: "US surplus: balanced", lv: { ...ZERO, usSpend: -1.4, usTax: 1.4 } },
  { name: "AU surplus: balanced", lv: { ...ZERO, auSpend: -0.8, auTax: 0.8 } },
];

// ---------- Party presets: built only from each party's own stated proposals ----------
type Party = { id: string; name: string; country: "US" | "AU"; color: string; lv: Lv; notes: [string, string, string][]; sched?: Partial<Record<keyof Lv, Record<number, number>>> }; // sched: fixed timing for a lever (ECN-05): value in % of GDP by calendar year (year 1 = 2027; a financial year sits in the calendar year it ends); unlisted years 0. Overrides the duration setting for that lever.
// Engine form of a schedule: s = the lever amount the path replaces, p = the path
type Sch = Partial<Record<keyof Lv, { s: number; p: Record<number, number> }>>;
// Costing status of each stated item: official = CBO/PBO-based; published = outside estimate; party = the party's own figure; page = this Page's estimate; unsized = no figure found (left at baseline)
type CItem = [string, "official" | "published" | "party" | "page" | "unsized"];
const COSTING: Record<string, { items: CItem[]; off: Partial<Lv> }> = {
  rep: { off: {}, items: [["$5,000 tariff dividend (CRFB)", "published"], ["Further tax cuts", "unsized"], ["Deregulation", "unsized"], ["Energy-supply plans", "unsized"]] },
  dem: { off: { usSpend: 0.3 }, items: [["End specified tariffs", "page"], ["Reverse 2025 Medicaid and Medicare cuts", "official"], ["Drug-price bills", "unsized"], ["Grocery-pricing bills", "unsized"]] },
  alp: { off: {}, items: [["2026-27 Budget (the baseline)", "official"]] },
  lnp: { off: {}, items: [["$31bn of savings", "party"], ["Tax Back Guarantee", "party"], ["Repeal capital gains, trust and negative gearing changes", "unsized"], ["Spending cap", "unsized"], ["Surplus target", "unsized"]] },
  grn: { off: { auSpend: 0.37, auTax: 0.18 }, items: [["Tax-free threshold and payment boost", "official"], ["Gas export tax", "published"], ["Mining royalties", "published"], ["Carbon price (PBO 2025, 2025 platform)", "official"], ["Public housing", "unsized"], ["Rent controls", "unsized"]] },
  onp: { off: { auSpend: 0.5 }, items: [["Tax package", "published"], ["Defence to 3.5% of GDP", "official"], ["Medicare and pension support", "page"], ["Migration cut", "published"], ["Abolish climate department", "unsized"], ["Scrap SBS", "unsized"], ["Cut ABC funding", "unsized"], ["Cut some Indigenous program funding", "unsized"], ["End health and education duplication", "unsized"]] },
};
const AI_SC: { name: string; lv: Lv; basis: string }[] = [
  { name: "Slow AI", lv: { ...ZERO, aiProd: 0.07 }, basis: "Acemoglu (2024): about 0.7% more productivity over 10 years in total" },
  { name: "Middle AI", lv: { ...ZERO, aiProd: 0.4 }, basis: "McKinsey (2023) generative-AI range 0.1 to 0.6 pts a year; Penn Wharton: GDP 1.5% higher by 2035" },
  { name: "AI boom", lv: { ...ZERO, aiProd: 1.5 }, basis: "Among the higher published estimates: Goldman Sachs (Briggs & Kodnani, Mar 2023), about 1.5 pts a year of labour productivity over about 10 years, starting gradually" },
  { name: "AI boom + job disruption", lv: { ...ZERO, aiProd: 1.5, aiJobs: 2.5 }, basis: "Same boom, plus a 2.5-pt temporary jobless rise. The jobless size is illustrative: no published estimate found (IMF SDN/2024/001 reports exposure, about 60% of jobs in advanced economies, not job losses)" },
];

// Published AI estimates, each with its own measure and horizon (checked 3 Nov 2026)
const AI_LIT: [string, string, string, string][] = [
  ["Acemoglu, NBER WP 32487 (2024)", "Total factor productivity, about 0.7% in total", "10 years", "under 0.1 pts a year (lowest)"],
  ["Penn Wharton Budget Model (Sep 2025)", "GDP level about 1.5% higher by 2035", "about 10 years", "about 0.15 pts a year"],
  ["McKinsey (Jun 2023)", "Labour productivity from generative AI", "to 2040", "0.1 to 0.6 pts a year"],
  ["Goldman Sachs, Briggs & Kodnani (Mar 2023)", "Labour productivity with wide adoption", "about 10 years, starting gradually", "about 1.5 pts a year (among the higher published estimates)"],
  ["IMF SDN/2024/001 (Jan 2024)", "Share of jobs exposed (not a growth figure)", "n/a", "about 40% of jobs worldwide, 60% in advanced economies"],
  ["CBO (Dec 2024)", "Not in the budget baseline", "n/a", "No number: size judged too uncertain"],
];

// Debt payoff: constant primary surplus needed to reach zero debt in N years
const DEBTS = [
  { id: "usp", name: "US debt held by public", d: 101, r: 3.4, g: 4.0, prim: -2.6 },
  { id: "usg", name: "US gross debt (CBO FY2026 est. 123.6%)", d: 124, r: 3.4, g: 4.0, prim: -2.6 },
  { id: "aun", name: "Australia net debt", d: 19.9, r: 4.0, g: 4.75, prim: -0.6 },
  { id: "aug", name: "Australia gross debt", d: 34, r: 4.0, g: 4.75, prim: -0.6 },
];

const LIFE: { name: string; what: string; evidence: string; cost: string; fit: string; left: string; right: string; grade?: string; basis?: string }[] = [
  { name: "Build more homes (zoning reform)", what: "Let more homes be built near jobs: fewer height, lot-size and parking rules, faster approvals. More supply lowers rents and prices over time.", evidence: "Strong", cost: "Low for budgets", fit: "Helps: little spending, more tax base", grade: "A", basis: "Many quasi-experimental studies on supply limits and prices (Glaeser & Gyourko, JEP 32(1), 2018)", left: "Developers gain; needs affordable-housing and tenant protections.", right: "Overrides local control; prefers state incentives to mandates." },
  { name: "Healthcare prices (site-neutral pay, transparency, drug negotiation)", what: "Pay the same price for the same care wherever it is done, publish prices, negotiate some drug prices. Budget and supply effects could be large either way depending on how it is done.", evidence: "Moderate to strong", cost: "Saves money (CBO scores site-neutral savings in the $100bn+ range over 10 yrs)", grade: "B", basis: "Strong evidence that prices drive spending (Cooper et al., QJE 2019); fiscal and supply effects depend heavily on design", fit: "Helps directly", left: "Does not go far enough on coverage.", right: "Negotiation may slow new drug development." },
  { name: "Competition policy and licensing reform", what: "Block mergers that raise prices, cut needless job licences, open up concentrated markets (groceries, banking, airlines).", evidence: "Moderate to strong", cost: "Low", grade: "B", basis: "Good evidence licensing raises prices and limits mobility (Kleiner, Hamilton Project 2015); merger effects vary by market", fit: "Neutral to helps", left: "Enforcement agencies need funding.", right: "Risk of overreach against firms that are big because they are good." },
  { name: "Lower energy costs (permitting and grid reform)", what: "Speed up approvals for transmission lines and new generation of all kinds so supply grows and bills fall.", evidence: "Moderate", cost: "Low for budgets", fit: "Neutral", grade: "C", basis: "Mostly engineering and modelling studies; few causal studies of bill effects", left: "Must keep environmental review meaningful.", right: "Should not favour particular energy sources." },
  { name: "Skills: sector training and apprenticeships", what: "Short employer-linked training (e.g. Year Up, Project QUEST) for in-demand jobs; useful for AI-affected workers.", evidence: "Mixed overall; strong for the best sectoral programs (trials show 15 to 40% earnings gains)", grade: "B", basis: "Mixed overall: small short-run, larger long-run effects (Card, Kluve & Weber, JEEA 16(3), 2018); strong for the best sectoral programs", cost: "Moderate", fit: "Small cost, can pay back via tax", left: "Not a substitute for a safety net.", right: "Government programs are often poorly run; favours employer-led schemes." },
  { name: "Childcare and early education", what: "Make quality childcare affordable so parents can work and children start school ready.", evidence: "Strong for child outcomes, moderate for parent work hours", grade: "B", basis: "Strong long-run child outcomes from high-quality programmes; mixed for large universal schemes", cost: "High (about 0.3 to 0.5% of GDP)", fit: "Harder: needs funding", left: "Wants universal access.", right: "Prefers parental choice and tax credits over government-run care." },
  { name: "Earned income tax credit (EITC-style in-work payment)", what: "A refundable tax credit for low and middle earners that rises with work, as the US EITC does.", evidence: "Strong", cost: "Moderate to high (US EITC about 0.3% of GDP)", fit: "Harder: needs funding", left: "Leaves out people who cannot work.", right: "Prone to overpayment errors; prefers lower tax rates.", grade: "A", basis: "Many quasi-experimental studies on work, income and child health (Hoynes & Patel, J. Human Resources 2018)" },
  { name: "Simpler taxes (broader base, pre-filled returns)", what: "Remove narrow breaks and lower rates; pre-fill returns as Australia's ATO already does.", evidence: "Moderate", cost: "Revenue-neutral if designed so", grade: "C", basis: "Mostly modelling; effects depend on design", fit: "Helps if base-broadening", left: "Watch that cuts do not tilt to the top.", right: "Breaks for families and savings should stay." },
];

const PARTIES: Party[] = [
  { id: "rep", name: "US Republicans", country: "US", color: "#D62828", lv: { ...ZERO, usSpend: 0.74 }, sched: { usSpend: { 2027: 0.74, 2028: 0.74, 2029: 0.74, 2030: 0.74, 2031: 0.74 } }, notes: [
    ["Tariffs", "No change (0)", "Party leaders back keeping current tariffs: Section 232 product tariffs and the Section 301 forced-labour tariffs that replaced the expired Section 122 surcharge (IEEPA tariffs struck down 20 Feb 2026). No new across-the-board rate stated. Party position unsourced: the CNBC midterm guide (updated 27 Oct 2026) has no tariff section."],
    ["Taxes", "No change (0)", "Main tax plan (One Big Beautiful Bill Act, 2025) is already law, so it is in CBO's baseline; further cuts mentioned without a size."],
    ["Spending", "+0.74% GDP/yr, 2027 to 2031 only", "Proposed $5,000 adult tariff dividend (9 Sep 2026), about $1.2 trillion once (about 3.7% of GDP). Source: Committee for a Responsible Federal Budget (CRFB, 10 Sep 2026), a published outside estimate, not a CBO score. CRFB costs it as a one-off payment in 2027; here it is spread as 0.74% of GDP a year over 5 years and then stops, whatever the duration setting. Conditional on GOP control; condition not met (Nov 2026): Democrats won both chambers, so the offer is moot from Jan 2027 and this preset is a historical scenario."],
    ["Fed / other", "Not set", "Deregulation and energy-supply plans have no costed size; central bank is independent."]] },
  { id: "dem", name: "US Democrats", country: "US", color: "#1F5FBF", lv: { ...ZERO, tariff: -7, usSpend: 0.3 }, notes: [
    ["Tariffs", "-7 pts (estimate: range -5 to -8.5)", "End Trump's Tariff Tax Act (Schumer, Wyden, Kaine, 2026) would end specified duties. Estimate, not a party figure: the average tariff rose about 7-9 points since 2024 (Penn Wharton, Tax Foundation, Yale Budget Lab), so the cut is set at -7, range -5 to -8.5, depending on which duties end. Refunds not modelled."],
    ["Spending", "+0.3% GDP/yr", "House leaders plan to reverse the 2025 Medicaid and Medicare cuts, which CBO scored at roughly $1 trillion over 10 years."],
    ["Taxes", "No change (0)", "No sized tax plan in the stated first-100-hours agenda."],
    ["Fed / other", "Not set", "Drug-price and grocery-pricing bills have no CBO macro score; central bank is independent."]] },
  { id: "alp", name: "Labor (ALP)", country: "AU", color: "#E13940", lv: { ...ZERO }, notes: [
    ["All levers", "No change (0)", "Labor is in government, so its 2026-27 Budget ($31.5bn deficit, $63.8bn of savings) is the baseline itself."],
    ["RBA", "Not set", "The RBA is independent."]] },
  { id: "lnp", name: "Coalition (Lib-Nat)", country: "AU", color: "#1C4F9C", lv: { ...ZERO, auSpend: -0.25, auTax: -0.08 }, sched: { auSpend: { 2029: -0.19, 2030: -0.27, 2031: -0.27, 2032: -0.29 }, auTax: { 2031: -0.1, 2032: -0.21 } }, notes: [
    ["Spending", "-0.25% GDP/yr average, 2028-29 to 2031-32 only", "$31.3bn of savings over 2028-29 to 2031-32 (5.8 / 8.2 / 8.3 / 9.1 $bn; Liberal Party Table 1, 26 Oct 2026; party figure, not PBO), modelled as -0.19 / -0.27 / -0.27 / -0.29% of GDP in those years and nothing outside that window, whatever the duration setting."],
    ["Taxes", "-0.08% GDP/yr average", "Tax Back Guarantee (-$19.8bn over 4 years) replaces WATO (+$10.1bn): net tax cut -$9.7bn (0 / 0 / -3.0 / -6.7 $bn), modelled as 0 / 0 / -0.10 / -0.21% of GDP in 2028-29 to 2031-32. Net of WATO repeal; starts 2030-31. Later years are outside the party's costing, so they are left at baseline."],
    ["Not modelled", "0", "Repealing Labor's capital gains, trust and negative gearing changes: no costing found, left at baseline. Spending cap and surplus target are rules, not sized."]] },
  { id: "grn", name: "Greens", country: "AU", color: "#2E9E44", lv: { ...ZERO, auSpend: 0.37, auTax: 1.08 }, notes: [
    ["Tax cut", "-0.37% GDP", "Tax-free threshold to $26,000 plus the same boost to payments: $22bn a year per the PBO, split half tax, half spending (split is this Page's assumption)."],
    ["Spending", "+0.37% GDP/yr", "The payment-boost half of the PBO $22bn costing."],
    ["New revenue", "+0.9% GDP (range +0.55 to +1.5)", "25% gas export tax ($17bn a year, Australia Institute, progressive think tank) and mining royalties ($28bn, Prosper Australia), as the Greens cite; not PBO-costed. The royalties figure is a state-level estimate; federal mechanism not specified. Middle +0.9% of GDP; low +0.55 (gas tax only); high +1.5 (both in full)."],
    ["Carbon price", "+0.55% GDP/yr", "PBO costing ECR-2025-3365 (2025 platform; $100/t on emitters of 25kt or more): about A$17.2bn a year of revenue (range 15.0 to 17.5), standalone before interactions (ECR-2025-3901); about 0.55% of GDP at A$31bn per 1%. Net tax lever +1.08 (-0.37 + 0.9 + 0.55)."],
    ["Not modelled", "0", "Public housing and rent controls: no costed size found."]] },
  { id: "onp", name: "One Nation", country: "AU", color: "#F28C28", lv: { ...ZERO, auTax: -0.6, auSpend: 0.65, auPop: -0.5 }, notes: [
    ["Taxes", "-0.6% GDP/yr", "Halve fuel excise for 3 years, income splitting for couples with dependants, no GST on insurance, higher tax-free threshold for retirees. Part of a package economists put at $90bn+ (AFR, 6 Jul 2026); spread over 4 years is this Page's assumption."],
    ["Spending", "+0.65% GDP/yr", "Defence to 3.5% of GDP by 2037: +$225bn over 10 years per the PBO (SMH, 21 Jun 2026), phased in (about +0.5); plus more Medicare and pension support (about +0.15)."],
    ["Migration", "-0.5 pts/yr growth", "Three years of negative net migration, then a 130,000 cap. Analysis with PBO tools: $212bn less output and $275bn more debt over a decade (The Age, 18 Oct 2026)."],
    ["Not modelled", "0", "Stated offsets (abolish the climate department, scrap SBS, cut ABC and some Indigenous program funding, end health/education duplication) have no PBO costing, left at baseline."]] },
];

// ---------- Road to Surplus: 20-year budget paths ----------
type Pkg = { name: string; spend: number; rev: number; who: string };
type Ctry = { id: string; name: string; debt: number; prim: number; drift: number; r: number; g: number; phase: number; base: string; pkgs: Pkg[]; verdict: string };
const FISCAL: Ctry[] = [
  { id: "US", name: "US", debt: 101, prim: 2.6, drift: 0.01, r: 3.4, g: 4.0, phase: 10, base: "CBO Feb 2026 baseline, pre-IEEPA ruling: deficit 5.8% of GDP, debt 101%, primary deficit 2.6%. Later figures (secondary reports, cbo.gov not opened): CBO's Aug 2026 update adds about $0.9tn to 2027-36 deficits; the FY2026 actual deficit was $1.993tn, about 6.2% of GDP (Monthly Budget Review, 8 Oct 2026)", pkgs: [
    { name: "Mostly spending", spend: 4, rev: 1.5, who: "Retirees and providers (slower Social Security/Medicare growth, CBO options), federal agencies and grantees, some defense; a small tax-base broadening." },
    { name: "Mostly revenue", spend: 1.5, rev: 4, who: "Higher earners and firms (top rates, payroll tax cap, CBO/JCT options) and consumers if a carbon tax or VAT is used." },
    { name: "Balanced", spend: 2.75, rev: 2.75, who: "Spread across retirees, agencies, higher earners and consumers, in line with CRFB-style plans." }],
    verdict: "Possible on paper, very hard in practice. It needs about 5.5% of GDP (about $1.7 trillion a year today), which would be rare for a deliberate peacetime consolidation. Bigger falls in the deficit have happened when wartime or emergency spending ended (after 1945; FY2020 to FY2022), per OMB Historical Tables 1.2. Higher interest rates push surplus past 20 years." },
  { id: "AU", name: "Australia", debt: 19.9, prim: 0.6, drift: 0.05, r: 4.0, g: 4.75, phase: 6, base: "2026-27 Budget (12 May 2026): deficit $31.5bn (about 1% of GDP); net debt 19.9% of GDP at 30 Jun 2027 (Budget Paper No. 1; net debt, not gross 34.0%); IGR ageing pressure", pkgs: [
    { name: "Mostly spending", spend: 1.5, rev: 0.5, who: "Program and grant recipients, NDIS growth, public service; small bracket-creep tax take." },
    { name: "Mostly revenue", spend: 0.5, rev: 1.5, who: "Resource firms (royalties or gas tax), property investors (negative gearing/CGT), or all consumers if GST rises." },
    { name: "Balanced", spend: 1, rev: 1, who: "Split across program recipients, investors and resource companies." }],
    verdict: "Realistic. About 2% of GDP is similar in size to the late-1990s repair, and surplus arrives in roughly 5 to 7 years in every case shown. But that repair was helped a great deal by the mining boom, rising terms of trade and asset sales (Telstra, Commonwealth Bank), so policy alone did less than the headline suggests." },
  { id: "UK", name: "UK", debt: 94, prim: 1.0, drift: 0.03, r: 3.8, g: 3.8, phase: 8, base: "ONS Sep 2026: net debt 94.0% of GDP (£3,005bn); borrowing 3.1% of GDP in the financial year to September", pkgs: [
    { name: "Mostly spending", spend: 3.5, rev: 1.5, who: "Departments outside health and defence, working-age benefits." },
    { name: "Mostly revenue", spend: 1.5, rev: 3.5, who: "Income tax and National Insurance payers, frozen thresholds, VAT." },
    { name: "Balanced", spend: 2.5, rev: 2.5, who: "Spread across taxpayers and public services." }],
    verdict: "Possible but hard. It is about the size of the 2010s austerity, which did not reach a surplus." },
  { id: "JP", name: "Japan", debt: 230, prim: 2.0, drift: 0.03, r: 1.4, g: 2.5, phase: 10, base: "Approximate IMF figures: gross debt about 230%, deficit about 5% (not fetched today)", pkgs: [
    { name: "Mostly spending", spend: 4, rev: 2, who: "Pension and health spending for an ageing population." },
    { name: "Mostly revenue", spend: 1.5, rev: 4.5, who: "Consumers via consumption tax rises (10% now)." },
    { name: "Balanced", spend: 3, rev: 3, who: "Retirees and consumers." }],
    verdict: "Unlikely. It needs about 6% of GDP while rates rise from near zero; past consumption-tax rises slowed growth." },
  { id: "EA", name: "Euro area", debt: 88, prim: 1.0, drift: 0.03, r: 2.4, g: 3.2, phase: 8, base: "Approximate IMF/Eurostat aggregate: deficit about 3.2%, debt about 88% (not fetched today)", pkgs: [
    { name: "Mostly spending", spend: 2.5, rev: 1, who: "Pensions and public wages, concentrated in France and Italy." },
    { name: "Mostly revenue", spend: 1, rev: 2.5, who: "Taxpayers in high-deficit members." },
    { name: "Balanced", spend: 1.75, rev: 1.75, who: "Split; the burden varies a lot by country." }],
    verdict: "Plausible for the bloc on average, but it hides wide gaps: Germany is near balance while France and Italy would carry most of it." },
];
// ===== Shared engine (any horizon). Every debt path uses the same step: d' = d(1+r)/(1+g) + primary deficit =====
const debtStep = (d: number, prim: number, r: number, gN: number) => d * (1 + r / 100) / (1 + gN / 100) + prim;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v)); // last-resort guard rail, listed under "Guard rails"
const toward = (start: number, target: number, t: number, speed: number) => target + (start - target) * Math.pow(1 - speed, t); // mean reversion
// Time shapes for any year t (0 = year 1). Smooth, defined for every t, and all go to a finite limit.
const FADE = (t: number) => Math.pow(0.55, t);                         // fiscal multiplier fades: 1, .55, .30, .17 ...
const LAG = (t: number) => (t === 0 ? 0.5 : Math.pow(0.65, t - 1));   // rate changes peak after about a year
const RAMP = (t: number) => 1 - Math.pow(0.6, t + 1);                  // adoption ramps: .4, .64, .78 ... to 1
const SHOCK = (t: number) => Math.pow(0.65, t);                        // one-off shocks fade out
const HOLD = (t: number) => (t < 3 ? 1 : Math.pow(0.6, t - 2));        // central-bank lever: held 3 years, then unwound toward neutral
const AIWIN = (t: number) => RAMP(t) * (t < 10 ? 1 : Math.pow(0.8, t - 9)); // AI extra growth: about 10 years, then fades (a level gain, not faster growth forever)
const MIGR = (t: number) => (t < 3 ? 1 : Math.pow(0.5, t - 2));        // migration shock: 3 years, then cap restores normal growth

function payoff(d: number, r: number, g: number, N: number): number {
  // constant primary surplus that takes debt to zero in N years using debtStep; checked by simulation in the test suite
  const a = (1 + r / 100) / (1 + g / 100);
  return Math.abs(a - 1) < 1e-9 ? d / N : d * Math.pow(a, N) * (a - 1) / (Math.pow(a, N) - 1);
}

function fiscal(c: Ctry, spend: number, rev: number, k: number, dr: number, N: number = 20, taxHeavy: boolean = false): { def: number[]; debt: number[] } {
  // taxHeavy = Alesina, Favero & Giavazzi (2019) view: tax rises cost more growth than spending cuts; default = CBO view (spending cuts cost more)
  const ws = taxHeavy ? 0.5 : 1.0, wv = taxHeavy ? 1.0 : 0.5;
  let d = c.debt, Sp = 0, Vp = 0; const def: number[] = [], debt: number[] = [];
  for (let t = 0; t < N; t++) {
    const ph = Math.min(1, (t + 1) / c.phase), S = spend * ph, V = rev * ph;
    const gap = -(ws * k * (S - Sp) + wv * k * (V - Vp)); Sp = S; Vp = V;  // growth hit only from new tightening (CBO multipliers)
    const prim = c.prim + Math.min(1.5, c.drift * t) - S - V - 0.35 * gap;    // ageing drift capped at +1.5% GDP (guard rail)
    const g = c.g + 0.5 * gap, r = c.r + dr;
    const prev = d; d = debtStep(d, prim, r, g);
    def.push(prim + r * prev / 100); debt.push(d);
  }
  return { def, debt };
}

// Latest official readings used as the "no change" starting point (fetched 3 Nov 2026; AUD/USD and US unemployment refreshed 9 Nov 2026, review9; US 10-year yield 9 Nov 2026, data refresh)
// Brent: January futures settle, 9 Nov 2026 (Dow Jones Market Data via Morningstar; Reuters). EIA daily spot (a different measure): 3 Nov 2026, released 4 Nov, next release 12 Nov.
// Used by the oil hint, Data & sources, What changed and the Mix scorecard.
const BRENT = { usd: 92.57, date: "9 Nov 2026", spot: 107.03, spotDate: "3 Nov 2026" };
const B = { usG: 3.4, usPi: 3.7, usU: 4.1, def: 5.8, debt: 101, y10: 4.88, auG: 2.1, auPi: 3.9, auU: 4.7, aud: 0.6894, auDebt: 19.9, auDef: 1.0, fed: 3.88, rba: 4.85,
  cnG: 4.5, cnPi: 0.9, jpG: 1.4, jpPi: 2.1, euG: 1.3, euPi: 3.8, ukG: 1.0, ukPi: 3.5, cny: 6.654, jpy: 157.5 };
// Year-1 (2027) calibration anchor: the no-change path starts at the average of official 2027 forecasts, then reverts to the long-run anchors.
// US growth: CBO Feb 2026 1.8, IMF WEO Oct 2026 2.3, OECD Sep 2026 2.1. US CPI: CBO PCE 2.3 plus the usual 0.4 CPI-PCE gap. US jobless: CBO 4.5.
// Aus growth: RBA Nov 2026 1.3 (Dec-27), IMF 1.6, OECD 1.7. Aus CPI: RBA 3.7 (Jun-27) and 2.7 (Dec-27), averaged. Aus jobless: RBA 4.9 (Dec-27).
const C1 = { usG: 2.1, usPi: 2.7, usU: 4.5, auG: 1.5, auPi: 3.2, auU: 4.9 };
// Long-run anchors the no-change path reverts to
const LR = { usG: 2.0, auG: 2.2, usPi: 2.5, auPi: 2.75, usU: 4.2, auU: 4.5, fed: 3.25, rba: 3.6, y10: 4.25, cnG: 3.5, cnPi: 1.5, jpG: 0.6, jpPi: 1.8, euG: 1.2, euPi: 2.0, ukG: 1.3, ukPi: 2.0,
  usPrim: 2.6, auPrim: 0.3, usR: 3.2, auR: 3.5 }; // primary deficits (CBO; Budget 1.0 less 0.7 net interest) and effective interest rates on debt

type Out = Record<string, number[]>;
const KEYS = ["usG", "usPi", "usU", "def", "debt", "y10", "auG", "auPi", "auU", "aud", "spx", "asx", "cnG", "cnPi", "jpG", "jpPi", "euG", "euPi", "ukG", "ukPi", "jpy", "auDef", "auDebt", "fedR", "rbaR", "aiG", "usRe", "auRe", "usPL", "auGpc", "auRent"];
function run(l: Lv, k: number, react: boolean, N: number = 5, dur: number = 10, sch?: Sch): Out {
  // dur = years budget and tariff changes stay in place (Infinity = permanent), then phased out over 5 years (no cliff)
  const ON = (t: number) => clamp((dur + 5 - t) / 5, 0, 1);
  const IMP = (t: number) => { let s = 0; for (let j = 0; j <= t; j++) s += (ON(j) - (j > 0 ? ON(j - 1) : 0)) * FADE(t - j); return s; };
  // Optional fixed timing per lever (party schedules). The lever value l[key] is split into a scheduled part (path by calendar year) and any rest, which follows the duration setting. With no schedule the exact ON and IMP above are used, so output is unchanged.
  const onF = (key: keyof Lv): ((t: number) => number) => { const e = sch ? sch[key] : undefined; const v = l[key]; return e === undefined || v === 0 ? ON : (t: number) => ((v - e.s) * ON(t) + (e.p[2027 + t] ?? 0)) / v; };
  const impF = (key: keyof Lv): ((t: number) => number) => { const f = onF(key); return f === ON ? IMP : (t: number) => { let s = 0; for (let j = 0; j <= t; j++) s += (f(j) - (j > 0 ? f(j - 1) : 0)) * FADE(t - j); return s; }; };
  const onTar = onF("tariff"), onUS = onF("usSpend"), onUT = onF("usTax"), onAS = onF("auSpend"), onAT = onF("auTax");
  const impUS = impF("usSpend"), impUT = impF("usTax"), impAS = impF("auSpend"), impAT = impF("auTax");
  const o: Out = {}; KEYS.forEach((x: string) => { o[x] = []; });
  let aiFis = 0, aiLvl = 0, aiJc = 0, auDebt = B.auDebt, debt = B.debt, usU = C1.usU, auU = C1.auU, spx = 0, asx = 0, fedX = 0, rbaX = 0, usRe = LR.usR, auRe = LR.auR, prevRamp = 0, tarLvP = 0, hg = 0;
  const ka = k === 1 ? 1 : k < 1 ? 0.15 : 2.5, kj = k === 1 ? 1 : k < 1 ? 0.3 : 1.8;
  const km = k === 1 ? 1 : k < 1 ? 0.4 : 1.6;               // fiscal effect of migration depends on migrant mix (age, skills, visa)
  const cpp = k === 1 ? 0.1 : k < 1 ? -0.1 : 0.25;          // per-person GDP effect per point of migration-driven growth (contested; PC 2016)
  const erent = k === 1 ? 1.75 : k < 1 ? 1.0 : 2.5;         // rents % per 1% more people than homes
  for (let t = 0; t < N; t++) {
    const fed = l.fed * HOLD(t) + fedX, rba = l.rba * HOLD(t) + rbaX, tar = l.tariff / 10 * onTar(t), oil = l.oil / 10, sh = SHOCK(t);
    const boj = l.boj * HOLD(t), ecb = l.ecb * HOLD(t), boe = l.boe * HOLD(t);
    const usBase = toward(C1.usG, LR.usG, t, 0.4), auBase = toward(C1.auG, LR.auG, t, 0.4);
    const usPiB = toward(C1.usPi, LR.usPi, t, 0.4), auPiB = toward(C1.auPi, LR.auPi, t, 0.4);
    const fedB = toward(B.fed, LR.fed, t, 0.25), rbaB = toward(B.rba, LR.rba, t, 0.25), y10B = toward(B.y10, LR.y10, t, 0.2);
    // AI: extra growth for about a decade, then a lasting level gain
    const aiG = ka * l.aiProd * AIWIN(t); aiLvl += aiG; aiFis = 0.92 * aiFis + aiG; // tax windfall from AI; spending catches up over time
    const rp = RAMP(t); const aiJ = kj * l.aiJobs * (rp - prevRamp) * (t < 10 ? 1 : 0); prevRamp = rp; aiJc = aiJc * 0.7 + aiJ; // displaced workers find new jobs over time
    const migr = l.auPop * MIGR(t);
    // Other economies (feed the US and Australia)
    const cnG = toward(B.cnG, LR.cnG, t, 0.2) + 0.05 * k * l.china * sh + 0.5 * k * l.pboc * FADE(t) - 0.15 * k * tar * sh - 0.1 * oil * sh;
    const cnGap = cnG - toward(B.cnG, LR.cnG, t, 0.2);
    const euG = toward(B.euG, LR.euG, t, 0.3) + l.euShock * FADE(t) - 0.4 * k * ecb * LAG(t) - 0.15 * k * oil * sh - 0.1 * tar * sh + 0.1 * cnGap;
    const euGap = euG - toward(B.euG, LR.euG, t, 0.3);
    const ukG = toward(B.ukG, LR.ukG, t, 0.3) + 0.5 * l.euShock * FADE(t) - 0.4 * k * boe * LAG(t) - 0.15 * k * oil * sh;
    const ukGap = ukG - toward(B.ukG, LR.ukG, t, 0.3);
    const jpG = toward(B.jpG, LR.jpG, t, 0.3) - 0.3 * k * boj * LAG(t) - 0.15 * k * oil * sh + 0.15 * cnGap - 0.1 * tar * sh;
    const jpGap = jpG - toward(B.jpG, LR.jpG, t, 0.3);
    const cnPi = toward(B.cnPi, LR.cnPi, t, 0.3) + 0.3 * cnGap + 0.15 * oil * sh;
    const euPi = toward(B.euPi, LR.euPi, t, 0.4) + 0.3 * oil * sh + 0.3 * euGap - 0.25 * k * ecb * LAG(t + 1);
    const ukPi = toward(B.ukPi, LR.ukPi, t, 0.4) + 0.3 * oil * sh + 0.3 * ukGap - 0.25 * k * boe * LAG(t + 1);
    const yenPct = 4 * k * (boj - fed) * (t === 0 ? 1 : 0.6);   // + = yen stronger
    const jpPi = toward(B.jpPi, LR.jpPi, t, 0.4) + 0.2 * oil * sh - 0.03 * yenPct * sh + 0.3 * jpGap;
    const carry = Math.max(0, yenPct - 3) * sh;                    // sharp yen rise forces carry-trade selling
    const auOwn = 0.8 * k * l.auSpend * impAS(t) - 0.4 * k * l.auTax * impAT(t) + migr; // Australian domestic impulse, for spillovers to the US and the AUD
    // United States
    const usDem = 0.02 * auOwn + 1.0 * k * l.usSpend * impUS(t) - 0.5 * k * l.usTax * impUT(t) - 0.5 * k * fed * LAG(t)
      - 0.25 * k * tar * (0.3 + 0.7 * sh) * (t < 10 ? 1 : 0.3) - 0.05 * k * oil * sh
      + 0.1 * cnGap + 0.15 * euGap + 0.05 * ukGap + 0.05 * jpGap - 0.1 * carry;
    const usG = usBase + usDem + aiG;
    const tarLv = 0.8 * (l.tariff / 10) * onTar(t) * (1 - Math.pow(0.5, t + 1)); const tarPi = tarLv - tarLvP; tarLvP = tarLv; // price LEVEL stays up while the tariff lasts; only inflation fades
    const usPi = usPiB - 0.6 * aiG + tarPi + 0.3 * usDem + 0.2 * oil * sh - 0.25 * k * fed * LAG(t + 1);
    usU = usU - 0.5 * usDem + aiJ; usU = usU + 0.3 * (LR.usU + 0.5 * aiJc - usU);
    const usPrim = LR.usPrim + Math.min(1.0, 0.03 * t) - 0.2 * aiFis + 0.3 * aiJc + (sch ? l.usSpend * onUS(t) - l.usTax * (t < 1 ? 1 : 0.9) * onUT(t) : (l.usSpend - l.usTax * (t < 1 ? 1 : 0.9)) * ON(t)) - 0.45 * tar - 0.3 * usDem;
    const y10 = clamp(y10B + 0.5 * fed + 0.2 * (usPi - usPiB) + clamp(0.02 * (debt - B.debt), -1, 2.5) + 0.1 * boj + 0.5 * aiG, 0.5, 12); // faster productivity raises rates, offsetting part of the budget gain
    usRe = usRe + 0.15 * (0.5 * (fedB + fed) + 0.5 * y10 - usRe);           // debt rolls over gradually into new rates
    const prevDebt = debt; debt = debtStep(debt, usPrim, usRe, usG + usPi);
    const def = usPrim + usRe * prevDebt / 100;
    // Australia
    const ore = (l.china + 5 * l.pboc) * sh;
    const audPct = 0.4 * k * ore + 3 * (rba - fed) - tar * sh - 2 * carry + 0.03 * l.oil * sh + 1.0 * auOwn;
    const aud = B.aud * (1 + audPct / 100);
    const auDem = 0.8 * k * l.auSpend * impAS(t) - 0.4 * k * l.auTax * impAT(t) - 0.4 * k * rba * LAG(t)
      + 0.2 * (usG - usBase - aiG) + 0.3 * k * cnGap + 0.05 * euGap + 0.1 * jpGap - 0.1 * tar * sh - 0.03 * oil * sh;
    const auG = auBase + migr + 0.8 * aiG + auDem;
    const auPi = auPiB - 0.5 * aiG + 0.3 * auDem - 0.3 * k * rba * LAG(t + 1) - 0.05 * audPct * sh + 0.2 * oil * sh;
    auU = auU - 0.5 * auDem + 0.8 * aiJ; auU = auU + 0.3 * (LR.auU + 0.4 * aiJc - auU);
    const dS = 3 * usDem - 4 * (y10 - y10B) * (t === 0 ? 1 : 0.3) - (t === 0 ? 1.5 * tar + 3 * carry + 0.5 * Math.abs(oil) : 0);
    spx = 0.9 * spx + dS + 5 * aiG;  // relative to no change; old moves fade
    asx = 0.9 * asx + 2.5 * auDem - 3 * rba * (t === 0 ? 1 : 0.2) + (t === 0 ? 0.3 * ore + 0.06 * l.oil - 2 * carry : 0) + 0.3 * dS + 4 * aiG;
    if (react) { // Taylor-style reaction, applied next year; half-step smoothing stops oscillation
      fedX = 0.5 * fedX + 0.5 * clamp(0.75 * (usPi - usPiB) + 0.5 * usDem, -3, 3);
      rbaX = 0.5 * rbaX + 0.5 * clamp(0.75 * (auPi - auPiB) + 0.5 * auDem, -3, 3);
    }
    const au10 = (rbaB + rba) * 0.5 + 2.3;
    auRe = auRe + 0.15 * (0.5 * (rbaB + rba) + 0.5 * au10 - auRe);
    const migLvl = l.auPop * Math.min(3, t + 1); // lost workers and taxpayers: a level loss built over 3 years, then permanent
    const auPrim = LR.auPrim + Math.min(0.5, 0.02 * t) - 0.35 * km * migLvl - 0.15 * aiFis + 0.3 * aiJc + (sch ? l.auSpend * onAS(t) - 0.9 * l.auTax * onAT(t) : (l.auSpend - 0.9 * l.auTax) * ON(t)) - 0.3 * auDem;
    const prevAu = auDebt; auDebt = debtStep(auDebt, auPrim, auRe, auG + auPi);
    const auDef = auPrim + auRe * prevAu / 100;
    hg = 0.8 * hg + (1 - cpp) * migr; // extra people relative to homes; supply catches up about 20% a year
    const auGpc = auG - (1.5 + (1 - cpp) * migr); // GDP per person: aggregate growth less population growth (about 1.5% a year, approximate)
    const v: Record<string, number> = { usPL: tarLv, auGpc, auRent: erent * hg, auDef, auDebt, fedR: clamp(fedB + fed, 0, 15), rbaR: clamp(rbaB + rba, 0, 15), aiG, usRe, auRe, usG, usPi, usU, def, debt, y10, auG, auPi, auU, aud, spx, asx, cnG, cnPi, jpG, jpPi, euG, euPi, ukG, ukPi, jpy: B.jpy / (1 + yenPct / 100) };
    KEYS.forEach((x: string) => o[x].push(v[x]));
  }
  return o;
}

type L = { key: keyof Lv; label: string; min: number; max: number; step: number; unit: string; hint: string };
const GROUPS: { name: string; levers: L[] }[] = [
  { name: "United States", levers: [
    { key: "tariff", label: "Tariff change", min: -15, max: 40, step: 1, unit: " pts", hint: "Change to the average import tariff" },
    { key: "usTax", label: "Taxes", min: -3, max: 3, step: 0.1, unit: "% GDP", hint: "Minus = cut, plus = rise" },
    { key: "usSpend", label: "Federal spending", min: -3, max: 3, step: 0.1, unit: "% GDP", hint: "Change per year" },
    { key: "fed", label: "Fed rate change", min: -4, max: 4, step: 0.25, unit: " pts", hint: "Now 3.88% (Oct 2026)" }] },
  { name: "Australia", levers: [
    { key: "rba", label: "RBA cash rate change", min: -3, max: 3, step: 0.25, unit: " pts", hint: "Now 4.85% (3 Nov 2026)" },
    { key: "auSpend", label: "Govt spending", min: -3, max: 3, step: 0.05, unit: "% GDP", hint: "Change per year" },
    { key: "auTax", label: "Taxes", min: -3, max: 3, step: 0.05, unit: "% GDP", hint: "Minus = cut, plus = rise" },
    { key: "auPop", label: "Migration effect on growth", min: -1, max: 0.5, step: 0.05, unit: " pts/yr", hint: "Minus = lower net migration, fewer workers and taxpayers" }] },
  { name: "China", levers: [
    { key: "china", label: "Demand / iron ore shock", min: -40, max: 40, step: 5, unit: "%", hint: "Minus = slowdown, ore price falls" },
    { key: "pboc", label: "PBoC + Beijing stimulus", min: 0, max: 5, step: 0.5, unit: "% GDP", hint: "Credit and infrastructure push" }] },
  { name: "Japan, Europe, UK", levers: [
    { key: "boj", label: "BoJ rate change", min: -1, max: 3, step: 0.25, unit: " pts", hint: "Now 1.25%; big hikes squeeze yen carry trades" },
    { key: "ecb", label: "ECB rate change", min: -2.5, max: 3, step: 0.25, unit: " pts", hint: "Deposit rate now 2.50%" },
    { key: "boe", label: "BoE rate change", min: -3, max: 3, step: 0.25, unit: " pts", hint: "Bank Rate now 4.00% (5 Nov 2026)" },
    { key: "euShock", label: "Euro-area demand shock", min: -4, max: 2, step: 0.5, unit: " pts", hint: "Minus = recession hits growth" }] },
  { name: "AI", levers: [
    { key: "aiProd", label: "AI productivity boost", min: 0, max: 2, step: 0.05, unit: " pts/yr", hint: "Extra growth per year once adopted: 0.07 Acemoglu, 1.5 Goldman Sachs" },
    { key: "aiJobs", label: "AI job disruption", min: 0, max: 4, step: 0.25, unit: " pts", hint: "Temporary rise in unemployment as jobs shift" }] },
  { name: "Global", levers: [
    { key: "oil", label: "Oil price change", min: -50, max: 80, step: 5, unit: "%", hint: `Brent futures settled at $${BRENT.usd} on ${BRENT.date} (Dow Jones Market Data; Reuters); EIA daily spot $${BRENT.spot} on ${BRENT.spotDate}` }] },
];

// ---------- European economies (own levers; spill-ins from the main model) ----------
type EuC = { id: string; name: string; g: number; pi: number; u: number; def: number; debt: number; rate: number; bank: string; trendG: number; trade: number; china: number; oil: number; cur: string; loan: number; spread: number; years: number; approx: string; color: string; target: number; rEff: number; neutral: number; piT: number };
const EU: EuC[] = [
  { id: "uk", name: "UK", g: 1.2, pi: 3.5, u: 4.7, def: 3.1, debt: 94.0, rate: 3.75, bank: "boe", trendG: 1.3, trade: 0.4, china: 0.05, oil: -1, cur: "£", loan: 250000, spread: 1.0, years: 25, approx: "", color: "#6A4C93", target: 3, rEff: 3.6, neutral: 3.25, piT: 2 },
  { id: "fr", name: "France", g: -0.1, pi: 3.4, u: 8.5, def: 5.1, debt: 115.7, rate: 2.5, bank: "ecb", trendG: 1.0, trade: 0.55, china: 0.04, oil: -1, cur: "€", loan: 250000, spread: 1.4, years: 25, approx: "", color: "#1982C4", target: 3, rEff: 2.0, neutral: 2.0, piT: 2 },
  { id: "es", name: "Spain", g: 2.7, pi: 5.0, u: 10.3, def: 2.4, debt: 100.5, rate: 2.5, bank: "ecb", trendG: 1.8, trade: 0.6, china: 0.03, oil: -1, cur: "€", loan: 200000, spread: 1.2, years: 25, approx: "", color: "#FFCA3A", target: 2.5, rEff: 2.2, neutral: 2.0, piT: 2 },
  { id: "de", name: "Germany", g: 1.2, pi: 3.3, u: 4.1, def: 2.9, debt: 62.8, rate: 2.5, bank: "ecb", trendG: 0.9, trade: 0.55, china: 0.07, oil: -1, cur: "€", loan: 300000, spread: 1.4, years: 25, approx: "", color: "#8AC926", target: 2.5, rEff: 1.5, neutral: 2.0, piT: 2 },
  { id: "fi", name: "Finland", g: 1.8, pi: 2.7, u: 10.5, def: 3.8, debt: 88.4, rate: 2.5, bank: "ecb", trendG: 1.2, trade: 0.5, china: 0.04, oil: -1, cur: "€", loan: 200000, spread: 1.0, years: 25, approx: "", color: "#4CC9F0", target: 3, rEff: 1.6, neutral: 2.0, piT: 2 },
  { id: "se", name: "Sweden", g: 2.8, pi: 1.0, u: 8.7, def: 1.6, debt: 35.1, rate: 1.75, bank: "riks", trendG: 2.0, trade: 0.55, china: 0.03, oil: -1, cur: "kr", loan: 2500000, spread: 1.5, years: 30, approx: "", color: "#F72585", target: 0, rEff: 1.5, neutral: 2.0, piT: 2 },
  { id: "no", name: "Norway", g: 2.6, pi: 3.4, u: 4.6, def: -10, debt: 40, rate: 4.5, bank: "nb", trendG: 1.5, trade: 0.5, china: 0.03, oil: 1, cur: "kr", loan: 3000000, spread: 1.0, years: 25, approx: "Overall surplus (about 10% of GDP incl. oil fund income) and debt still approximate; mainland GDP and the 2027 budget are fetched", color: "#B5179E", target: -10, rEff: 2.5, neutral: 3.25, piT: 2 },
  { id: "dk", name: "Denmark", g: 5.7, pi: 2.1, u: 6.8, def: -2.9, debt: 27.2, rate: 2.1, bank: "ecb", trendG: 1.6, trade: 0.6, china: 0.03, oil: 0, cur: "kr", loan: 2500000, spread: 1.5, years: 30, approx: "", color: "#FF595E", target: 0, rEff: 1.5, neutral: 2.1, piT: 2 },
  { id: "is", name: "Iceland", g: -1.1, pi: 5.4, u: 5.9, def: 0.0, debt: 38, rate: 8.0, bank: "cbi", trendG: 2.0, trade: 0.5, china: 0.02, oil: -1, cur: "kr", loan: 50000000, spread: 0.5, years: 25, approx: "Deficit and debt use the 2027 budget bill (balanced; Treasury debt about 38% of GDP), a narrower measure than general-government debt", color: "#3A86FF", target: 1, rEff: 5.0, neutral: 5.0, piT: 2.5 },
];
const BANKS: { key: string; name: string; now: string }[] = [
  { key: "riks", name: "Riksbank (Sweden)", now: "1.75%" }, { key: "nb", name: "Norges Bank (Norway)", now: "4.50%" }, { key: "cbi", name: "Central Bank of Iceland", now: "8.00%" }];
function runEU(c: EuC, l: Lv, eu: Record<string, number>, k: number, m: Out, b: Out, N: number = 5, dur: number = 10): Out {
  const o: Out = { g: [], pi: [], u: [], def: [], debt: [], rate: [] };
  let u = c.u, debt = c.debt, rEff = c.rEff;
  const fis = eu[c.id] ?? 0;
  const lever = c.bank === "ecb" ? l.ecb : c.bank === "boe" ? l.boe : (eu[c.bank] ?? 0); // Denmark's peg follows the ECB
  const oilFund = c.oil > 0 ? c.def - c.rEff * c.debt / 100 : 0; // Norway: oil-fund cash flow goes to the fund, not to paying down gross debt
  const ON = (j: number) => clamp((dur + 5 - j) / 5, 0, 1);
  for (let t = 0; t < N; t++) {
    const rc = lever * HOLD(t), sh = SHOCK(t), oil = l.oil / 10, on = ON(t);
    let imp = 0; for (let j = 0; j <= t; j++) imp += (ON(j) - (j > 0 ? ON(j - 1) : 0)) * FADE(t - j);
    const gB = toward(c.g, c.trendG, t, 0.4), piB = toward(c.pi, c.piT, t, 0.4), polB = toward(c.rate, c.neutral, t, 0.25);
    const ext = c.id === "uk" ? m.ukG[t] - b.ukG[t] : c.trade * (m.euG[t] - b.euG[t]);
    const demand = 0.8 * k * fis * imp - 0.4 * k * rc * LAG(t) + ext + 0.15 * (m.usG[t] - m.aiG[t] - b.usG[t]) + 3 * c.china * (m.cnG[t] - b.cnG[t]) + 0.15 * c.oil * oil * sh;
    const g = gB + demand + 0.8 * m.aiG[t];
    const pi = piB + 0.3 * demand + 0.25 * oil * sh * (c.oil < 0 ? 1 : 0.6) - 0.25 * k * rc * LAG(t + 1) - 0.5 * m.aiG[t];
    u = u - 0.4 * demand; u = u + 0.3 * (toward(c.u, c.u * 0.85, t, 0.1) - u);
    const pol = clamp(polB + rc, 0, 20);
    rEff = rEff + 0.15 * (pol + 0.8 - rEff);
    const w = Math.pow(0.9, t), primB = w * (c.def - c.rEff * c.debt / 100) + (1 - w) * (c.target - rEff * debt / 100); // overall balance moves gradually to the stated medium-term target
    const prim = primB + fis * on - 0.4 * demand - (c.oil > 0 ? 0.3 * oil * sh : 0);
    const prev = debt; debt = debtStep(debt, prim - oilFund, rEff, g + pi);
    o.g.push(g); o.pi.push(pi); o.u.push(u); o.def.push(prim + rEff * prev / 100); o.debt.push(debt); o.rate.push(pol);
  }
  return o;
}
// ===== Sectors: rules of thumb linking the engine's outputs to each industry (same method for every policy) =====
// Size: BEA value added % of GDP (Q2 2026) and ABS GVA % of GDP (2025-26). Jobs (thousands): BLS CES Sep 2026 and ABS Labour Force Detailed Feb 2026.
// Sensitivities (points of sector growth): g = per point of national growth gap; rate = per point of policy rate; oil = per 10% oil; tar = per 10 tariff points; cn = per point of China growth; ai = per point of AI growth; mig = per point of the migration lever.
type Sect = { id: string; name: string; usShare: number; auShare: number; usJobs: number; auJobs: number; g: number; rate: number; oil: number; tar: number; cn: number; ai: number; mig: number; why: string };
const SECT: Sect[] = [
  { id: "hous", name: "Housing and construction", usShare: 4.2, auShare: 7.2, usJobs: 8364, auJobs: 1371, g: 1.6, rate: -2.0, oil: -0.1, tar: -0.3, cn: 0.0, ai: 0.4, mig: 1.5, why: "Most rate-sensitive industry: dwelling investment falls 2 to 4% per point on rates (RBA MARTIN; Fed FRB/US); migration drives housing demand; data centres add building work" },
  { id: "mine", name: "Mining and resources", usShare: 1.6, auShare: 8.6, usJobs: 607, auJobs: 312, g: 0.3, rate: -0.2, oil: 0.5, tar: -0.2, cn: 0.8, ai: 0.1, mig: 0.0, why: "Driven by world prices: China takes most Australian iron ore (RBA); oil and gas output rises with oil prices (EIA)" },
  { id: "enrg", name: "Energy and utilities", usShare: 1.6, auShare: 2.2, usJobs: 612, auJobs: 214, g: 0.5, rate: -0.3, oil: 0.3, tar: -0.1, cn: 0.0, ai: 0.6, mig: 0.4, why: "Demand is steady; AI data centres are the main new source of power demand (EIA; IEA)" },
  { id: "mfg", name: "Manufacturing", usShare: 9.7, auShare: 5.1, usJobs: 12652, auJobs: 869, g: 1.4, rate: -0.8, oil: -0.3, tar: -0.2, cn: 0.2, ai: 0.3, mig: 0.0, why: "Cyclical; tariffs protect some plants but raise input costs and invite retaliation, a small net loss (Fed: Flaaen and Pierce 2019)" },
  { id: "agri", name: "Agriculture", usShare: 0.8, auShare: 2.2, usJobs: 1231, auJobs: 295, g: 0.2, rate: -0.2, oil: -0.3, tar: -0.6, cn: 0.4, ai: 0.0, mig: 0.0, why: "Export-exposed: retaliatory tariffs hit farm sales (USDA ERS); fuel and fertiliser costs rise with oil. US jobs: BLS QCEW 2025 annual average, NAICS 11 private, 1,231,078 private (total 1,235,695; UI-covered wage and salary jobs, excludes the self-employed; QCEW, not CES, because CES payrolls exclude farms; BLS QCEW API https://data.bls.gov/cew/data/api/2025/a/industry/11.csv). USDA ERS: 1.18m (2024)" },
  { id: "fin", name: "Financial services and banking", usShare: 9.0, auShare: 7.3, usJobs: 6645, auJobs: 544, g: 1.0, rate: 0.2, oil: 0.0, tar: -0.1, cn: 0.1, ai: 0.6, mig: 0.2, why: "Moves with credit and asset prices; higher rates widen bank margins slightly but slow lending (RBA Financial Stability Review)" },
  { id: "hlth", name: "Healthcare", usShare: 7.5, auShare: 9.0, usJobs: 23959, auJobs: 2394, g: 0.3, rate: 0.0, oil: 0.0, tar: -0.1, cn: 0.0, ai: 0.4, mig: 0.5, why: "Least cyclical; grows with ageing and public funding (BEA; ABS health measurement 2026)" },
  { id: "edu", name: "Education", usShare: 1.1, auShare: 4.8, usJobs: 14853, auJobs: 1331, g: 0.2, rate: 0.0, oil: 0.0, tar: 0.0, cn: 0.1, ai: 0.2, mig: 1.2, why: "Mostly public; in Australia international students make it a big export, so migration settings matter (ABS; Department of Education)" },
  { id: "tour", name: "Tourism and hospitality", usShare: 4.1, auShare: 2.5, usJobs: 16969, auJobs: 962, g: 1.3, rate: -0.3, oil: -0.4, tar: -0.1, cn: 0.3, ai: 0.0, mig: 0.4, why: "Discretionary spending; airfares rise with oil; Chinese visitors matter for Australia (Tourism Research Australia)" },
  { id: "ret", name: "Retail and consumer", usShare: 5.7, auShare: 4.1, usJobs: 15480, auJobs: 1336, g: 1.2, rate: -0.6, oil: -0.4, tar: -0.6, cn: 0.0, ai: 0.1, mig: 0.6, why: "Follows household income; tariffs pass through to shelf prices (NBER: Amiti, Redding and Weinstein); petrol costs squeeze budgets" },
  { id: "tech", name: "Tech and AI", usShare: 5.9, auShare: 2.2, usJobs: 2739, auJobs: 174, g: 1.5, rate: -1.0, oil: 0.0, tar: -0.4, cn: 0.1, ai: 2.0, mig: 0.3, why: "Most exposed to AI adoption; long-duration investment is rate-sensitive; chip tariffs raise costs (BEA information sector; Census trade)" },
  { id: "def", name: "Defence and government", usShare: 3.4, auShare: 5.4, usJobs: 2682, auJobs: 968, g: 0.1, rate: 0.0, oil: 0.0, tar: 0.0, cn: 0.0, ai: 0.1, mig: 0.0, why: "Set by budgets, not the cycle; shown as federal government (US) and public administration and safety (Australia)" },
  { id: "trn", name: "Transport and logistics", usShare: 3.2, auShare: 4.6, usJobs: 6609, auJobs: 783, g: 1.1, rate: -0.3, oil: -0.6, tar: -0.5, cn: 0.3, ai: 0.1, mig: 0.3, why: "Fuel is a big cost; trade volumes fall with tariffs (OECD STAN; Eurostat transport)" },
];
// Extra sector growth (points versus no change) in year i for country c ("us" or "au"). Multiply by 0.5 and 1.5 for the low and high views.
function sectorFx(o: Out, b: Out, l: Lv, c: string, i: number): number[] {
  const us = c === "us";
  const dG = us ? o.usG[i] - b.usG[i] : o.auG[i] - b.auG[i];
  const dR = us ? o.fedR[i] - b.fedR[i] : o.rbaR[i] - b.rbaR[i];
  const dCn = (o.cnG[i] - b.cnG[i]) * (us ? 0.3 : 1);
  const dAi = o.aiG[i] - b.aiG[i];
  const oilX = l.oil / 10 * SHOCK(i), tarX = l.tariff / 10 * SHOCK(i) * (us ? 1 : 0.3), mg = us ? 0 : l.auPop * MIGR(i);
  return SECT.map((s: Sect) => { const v = s.g * dG + s.rate * dR + s.oil * oilX + s.tar * tarX + s.cn * dCn + s.ai * dAi + s.mig * mg; return Number.isFinite(v) ? clamp(v, -25, 25) : 0; });
}
// Jobs effect (thousands): about 0.6 times the sector's extra growth, applied to its workforce
const sectorJobs = (fx: number[], c: string) => fx.map((v: number, j: number) => 0.6 * v / 100 * (c === "us" ? SECT[j].usJobs : SECT[j].auJobs));

// ===== Shared UI: one policy picker and one A-vs-B compare, used on every tab that shows a policy =====
type POpt = { value: string; label: string };
function PolicyPicker({ label, value, onChange, options, back }: { label: string; value: string; onChange: (v: string) => void; options: POpt[]; back?: boolean }) {
  return (
    <div data-picker={label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Select label={label} value={value} onChange={onChange} options={options} />
      {back && value !== "cur" && <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><Button label="Back to my Simulator mix" onClick={() => onChange("cur")} /></div>}
    </div>
  );
}
type CRow = { name: string; base: number; a: number; b: number; dp: number; unit: string };
const fmtD = (v: number, dp: number) => { const z = Math.abs(v) < 0.5 * Math.pow(10, -dp); const x = z ? 0 : v; return `${x > 0 ? "+" : ""}${x.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`; };
function PolicyCompare({ aName, bName, colA, colB, rows }: { aName: string; bName: string; colA: string; colB: string; rows: CRow[] }) {
  const th = useGrokTheme();
  const bar = (v: number, mx: number, c: string) => (
    <div style={{ display: "flex", height: 10 }}>
      <div style={{ width: "50%", display: "flex", justifyContent: "flex-end" }}>{v < 0 && <div style={{ width: `${(100 * -v) / mx}%`, background: c, borderRadius: 2 }} />}</div>
      <div style={{ width: 1, background: th.border.strong }} />
      <div style={{ width: "50%", display: "flex" }}>{v > 0 && <div style={{ width: `${(100 * v) / mx}%`, background: c, borderRadius: 2 }} />}</div>
    </div>
  );
  const sw = (c: string, t: string) => <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 10, background: c, borderRadius: 2, display: "inline-block" }} />{t}</span>;
  return (
    <div data-compare="macro" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: th.text.primary, fontSize: th.font.body2.fontSize }}>{sw(colA, `A: ${aName}`)}{sw(colB, `B: ${bName}`)}</div>
      {rows.map((r: CRow) => { const tiny = 0.5 * Math.pow(10, -r.dp); const cl = (v: number) => (Math.abs(v) < tiny ? 0 : v); const da = cl(r.a - r.base), db = cl(r.b - r.base); const mx = Math.max(Math.abs(da), Math.abs(db), r.dp === 0 ? 1000 : 0.05); return (
        <div key={r.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, color: th.text.primary, fontSize: th.font.body2.fontSize }}><span>{r.name}</span><span style={{ fontFamily: th.font.mono }}>{`A ${fmtD(da, r.dp)} · B ${fmtD(db, r.dp)}${r.unit}`}</span></div>
          {bar(da, mx, colA)}{bar(db, mx, colB)}
        </div>); })}
      <span style={{ color: th.text.secondary, fontSize: th.font.label.fontSize }}>Each bar is that policy minus no change. Left = lower, right = higher. Each row has its own scale.</span>
    </div>
  );
}

// ===== Starting data: [measure, value, published (YYYY-MM-DD), period, source] =====
type DRow = [string, string, string, string, string];
const DATA: DRow[] = [
  ["US GDP growth", "3.4% (annualised)", "2026-10-29", "Q3 2026", "BEA via FRED"], ["US CPI inflation", "3.7%", "2026-10-15", "Sep 2026", "BLS via FRED"], ["US unemployment", `${B.usU}%`, "2026-11-06", "Oct 2026", "BLS (preliminary; payrolls +165k)"],
  ["Fed funds (effective)", "3.88%", "2026-11-02", "Oct 2026", "FRED"], ["US 10y yield", `${B.y10}%`, "2026-11-09", "9 Nov 2026 (Treasury par yield curve, 10-yr CMT)", "US Treasury daily par yield curve"], ["US deficit", "5.8% GDP", "2026-02-11", "FY2026 est.", "CBO Feb 2026 baseline (pre-IEEPA ruling). FY2026 actual about 6.2% ($1.993tn, CBO Monthly Budget Review 8 Oct 2026, via secondary reports); Aug 2026 update about +$0.9tn over 2027-36"],
  ["US debt held by public", "101% GDP", "2026-02-11", "FY2026 est.", "CBO Feb 2026 baseline (pre-IEEPA ruling)"], ["US gross debt", "121% GDP ($39.5T)", "2026-09-25", "Q2 2026", "FRED / Treasury. Debt payoff uses CBO FY2026 est. 123.6% (Feb 2026)"], ["US debt held by public, 2055 benchmark", "171.8% GDP (2055); 175.1% (2056)", "2026-02-11", "2055 and 2056 projections", "CBO Feb 2026 extended baseline (Budget and Economic Outlook 2026 to 2036, cbo.gov/publication/62105; data: US-CBO/cbo-data long_term_budget annual_fy_2026-02)"],
  ["Aus GDP growth", "2.1%", "2026-09-02", "Jun qtr 2026", "ABS via RBA"], ["Aus GDP growth, financial year", "2.3%", "2026-10-23", "2025-26", "ABS national accounts"], ["Aus CPI inflation, headline (monthly CPI)", "4.3% y/y (trimmed mean 3.6%)", "2026-10-28", "Sep 2026", "ABS monthly CPI, 28 Oct 2026"], ["Aus CPI inflation, quarterly", "3.9%", "2026-10-28", "Sep qtr 2026", "ABS via RBA (not re-checked 9 Nov 2026)"],
  ["Aus unemployment", "4.7%", "2026-10-16", "Sep 2026", "ABS"], ["RBA cash rate", "4.85%", "2026-11-03", "3 Nov 2026", "RBA"], ["AUD/USD", B.aud.toFixed(4), "2026-11-09", "9 Nov 2026", "RBA F11.1 (0.7040 on 30 Oct)"],
  ["Aus net / gross debt", "19.9% / 34.0% GDP", "2026-05-12", "30 Jun 2027 est.", "Budget Paper No. 1, 2026-27"], ["Aus deficit", "1.0% GDP ($31.5bn)", "2026-05-12", "2026-27 est.", "Budget Paper No. 1"],
  ["Iron ore (61% fines, CFR Qingdao)", "US$92.9/dmt", "2026-11-09", "9 Nov 2026", "Mysteel SEADEX 61% Fines, CFR Qingdao"],
  ["Brent oil (futures settle)", `$${BRENT.usd}`, "2026-11-09", `${BRENT.date} settle (January contract)`, "Dow Jones Market Data (via Morningstar); Reuters (not EIA spot)"], ["Brent oil (EIA daily spot)", `$${BRENT.spot}`, "2026-11-03", BRENT.spotDate, "EIA Europe Brent Spot Price FOB (RBRTE), released 4 Nov; next release 12 Nov 2026"],
  ["China GDP / CPI", "4.5% / 0.7% (Oct); PPI +5.7% y/y", "2026-11-09", "Q3 / Oct 2026", "NBS China (GDP not re-checked)"], ["Yuan / yen per US$", "6.65 / 157.5", "2026-11-02", "30 Oct 2026", "FRED"],
  ["Euro area GDP / HICP", "1.3% / 4.0% (Oct flash)", "2026-11-04", "Q3 / Oct 2026 flash", "Eurostat (GDP not re-checked; full Oct HICP 18 Nov)"], ["ECB deposit rate", "2.50%", "2026-11-09", "Rate in force 9 Nov 2026", "ECB Data Portal"],
  ["Japan GDP", "1.4% (annualised)", "2026-09-08", "Q2 2026", "Cabinet Office"], ["Japan CPI / BoJ rate", "2.1% / 1.25%", "2026-10-30", "Sep / 30 Oct 2026", "Stat. Bureau / BoJ"],
  ["UK GDP growth", "1.2% y/y (0.4% q/q)", "2026-08-13", "Q2 2026", "ONS first estimate (Q3 due 12 Nov)"], ["UK unemployment", "4.7%", "2026-10-20", "Jun-Aug 2026", "ONS Labour Force Survey"],
  ["UK borrowing (deficit)", "3.1% GDP (£97.8bn)", "2026-10-21", "FY to Sep 2026", "ONS public sector finances"], ["UK net debt", "94.0% GDP (£3,005bn)", "2026-10-21", "End Sep 2026", "ONS public sector finances"],
  ["UK CPI / Bank Rate", "3.5% / 4.00%", "2026-11-05", "Sep 2026 / from 5 Nov 2026", "ONS (CPI not re-checked) / Bank of England (8 to 1 vote)"],
  ["France / Spain / Germany GDP", "-0.1% / 2.7% / 1.2% y/y", "2026-10-30", "Q3 2026 flash", "Eurostat"], ["Finland / Sweden GDP", "1.8% / 2.8% y/y", "2026-10-30", "Q3 2026 flash", "Eurostat"],
  ["Norway mainland GDP", "2.6% y/y (0.3% q/q)", "2026-08-27", "Q2 2026", "Statistics Norway"], ["Norway budget 2027", "Structural non-oil deficit NOK 608bn = 2.7% of fund, 12.6% of mainland GDP", "2026-10-06", "2027 budget", "Government of Norway"],
  ["Denmark GDP", "5.7% y/y (0.9% q/q, revised)", "2026-09-30", "Q2 2026", "Statistics Denmark"], ["Iceland GDP", "-1.1% y/y (-3.0% q/q)", "2026-08-29", "Q2 2026", "Statistics Iceland"],
  ["Iceland budget 2027", "Surplus ISK 5bn (0.1% GDP); Treasury debt about 38% GDP", "2026-09-08", "2027 budget bill", "Government of Iceland"],
  ["Inflation FR / ES / DE / FI / SE / DK / NO / IS", "3.4 / 5.0 / 3.3 / 2.7 / 1.0 / 2.1 / 3.4 / 5.4%", "2026-10-16", "Sep 2026 (HICP)", "Eurostat"],
  ["Jobless FR / ES / DE / FI / SE / DK / NO / IS", "8.5 / 10.3 / 4.1 / 10.5 / 8.7 / 6.8 / 4.6 / 5.9%", "2026-10-30", "Sep 2026", "Eurostat"],
  ["Deficit / debt FR, ES, DE, FI, SE, DK", "5.1/115.7, 2.4/100.5, 2.9/62.8, 3.8/88.4, 1.6/35.1, -2.9/27.2", "2026-10-21", "2025", "Eurostat EDP"],
  ["Riksbank / Norges Bank / CB Iceland / Nationalbanken", "1.75 / 4.50 / 8.00 / 2.10%", "2026-10-07", "Oct 2026", "Central banks"],
  ["US sector sizes", "BEA value added % of GDP", "2026-09-25", "Q2 2026", "BEA via FRED"], ["US jobs by industry", "BLS CES Table B-1; agriculture from QCEW (2025 annual average)", "2026-10-02", "Sep 2026", "BLS"],
  ["MPs owning investment properties (Australia)", "about 60%: UNVERIFIED", "2026-11-03", "Not checked", "IBTimes report only; not checked against the Register of Members' Interests"],
  ["Aus sector sizes", "ABS GVA by industry", "2026-10-23", "2025-26", "ABS national accounts"], ["Aus jobs by industry", "ABS Labour Force Detailed", "2026-03-26", "Feb 2026", "ABS"],
];

// ===== Backtests: three past episodes, model change versus no change compared with the published or observed change =====
type BT = { name: string; lv: Lv; key: string; yr: number; what: string; obs: number; obsTxt: string; src: string; miss: string };
const BACKTESTS: BT[] = [
  { name: "US tariffs 2018-19", lv: { ...ZERO, tariff: 1.7 }, key: "usPL", yr: 1, what: "US consumer price level, % (yr 2)", obs: 0.3, obsTxt: "about +0.3% on CPI from the 2018 tariffs (NY Fed, Jan 2019); SF Fed: about +0.1 pt on PCE inflation", src: "Amiti, Redding & Weinstein, Liberty Street Economics, Jan 2019; FRBSF Economic Letter 2019-07", miss: "Average tariff rise of about 1.7 pts is this Page's estimate ($283bn of imports at 10 to 50%). Retaliation and supply-chain shifts are not modelled." },
  { name: "Australia budget repair 1996-98", lv: { ...ZERO, auSpend: -1.0, auTax: 0.6, rba: -2.5 }, key: "auG", yr: 1, what: "Aus GDP growth vs about 3.5% trend, pts (yr 2)", obs: 1.0, obsTxt: "growth about 4.5% in 1997-98 versus about 3.5% trend (approximate, ABS 5206)", src: "ABS national accounts (5206.0); RBA cash rate 7.5% (Jul 1996) to 5.0% (Jul 1997)", miss: "Savings of about 1.6% of GDP and RBA cuts are included; strong terms of trade, asset sales and the Asian crisis are not, so the model misses part of the strength." },
  { name: "US inflation surge 2021-22", lv: { ...ZERO, usSpend: 4, oil: 40 }, key: "usPi", yr: 1, what: "US CPI inflation vs about 2% before, pts (yr 2)", obs: 6.0, obsTxt: "CPI 8.0% in 2022 (annual average) versus about 2% before the pandemic", src: "BLS CPI-U annual averages; EIA Brent spot annual averages ($70.86 in 2021, $100.93 in 2022)", miss: "Pandemic supply-chain disruption and the very tight labour market are not in the model, so it explains only part of the surge." },
];

// ===== What changed: dated items (content owned by Economist). Never called "today": the heading shows the as-of date,
// and each "coming up" item moves to the past list automatically once its date has passed (reader's clock).
const CHANGES = {
  asOf: "9 Nov 2026 (US close)",
  items: ["US midterms (3 Nov): AP has called both chambers for the Democrats. As of midday 9 Nov ET: House 254 Democrats to 163 Republicans with 18 races uncalled; Senate 54 to 44 with Alaska and Mississippi uncalled. New Congress sworn in 3 Jan 2027.", "RBA raised the cash rate 0.25 points to 4.85% on 3 Nov, an 18-year high (6 to 3 vote; three members preferred holding at 4.60%). The Fed held at 3.75 to 4.00% on 28 Oct (10 to 2; both dissents favoured a hike).", "Euro-area inflation rose to 4.0% a year in October (Eurostat flash, 4 Nov), from 3.8% in September; energy +20.8%; core 2.5%, unchanged.", "Bank of England raised Bank Rate 0.25 points to 4.00% on 5 Nov (8 to 1; one member wanted 4.25%), its first rise in more than three years. Norges Bank's policy rate stayed at 4.50%.", `US payrolls +165,000 in October (preliminary) and unemployment ${B.usU}%, down from 4.2% (BLS, 6 Nov).`, `Brent oil: January futures settled at $${BRENT.usd} a barrel on 9 Nov, down 5.85% on the day and the lowest settle since 31 Aug, after $98.32 on 6 Nov (Dow Jones Market Data; Reuters). The EIA daily spot price (a different measure) was $${BRENT.spot} on 3 Nov (EIA, released 4 Nov).`, "China: factory-gate prices (PPI) rose 5.7% a year in October; consumer prices rose 0.7% (NBS, 9 Nov).", `AUD/USD ${B.aud.toFixed(4)} on 9 Nov (RBA F11.1), down from 0.7040 on 30 Oct. ASX 200 closed at 9,029.7 on 9 Nov, up 0.1%.`, `US 10-year Treasury yield ${B.y10}% on 9 Nov (US Treasury), down from 4.95% on 3 Nov.`, "Australian CPI: headline 4.3% a year in September (ABS monthly CPI, 28 Oct); trimmed mean 3.6%."] as string[],
  upcoming: [
    { date: "2026-11-10", text: "US October CPI (BLS), 8:30am ET (6:30am Arizona). Scheduled." },
    { date: "2026-11-10", text: "Westpac-Melbourne Institute consumer confidence (Nov) and NAB business survey (Oct). Scheduled, AEDT." },
    { date: "2026-11-12", text: "UK Q3 GDP first estimate (ONS), 7:00am UK time. Scheduled; no result yet." },
    { date: "2026-11-12", text: "EIA weekly update of the Brent daily spot series. Scheduled." },
    { date: "2026-11-12", text: "Melbourne Institute consumer inflation expectations (Nov). Scheduled." },
    { date: "2026-11-18", text: "Eurostat full October HICP. Scheduled." },
    { date: "2026-11-18", text: "ABS Wage Price Index, September quarter. Scheduled, 11:30am AEDT." },
    { date: "2026-11-19", text: "ABS Labour Force, October 2026. Scheduled, 11:30am AEDT (5:30pm 18 Nov Arizona)." },
    { date: "2026-11-25", text: "ABS monthly CPI, October 2026; BEA Q3 GDP second estimate. Scheduled." },
    { date: "2026-12-02", text: "ABS national accounts, September quarter 2026. Scheduled." },
    { date: "2026-12-08", text: "RBA Monetary Policy Board decision (meeting 7-8 Dec). Scheduled." },
    { date: "2026-12-09", text: "FOMC decision (meeting 8-9 Dec, with projections). Scheduled." },
    { date: "2026-12-10", text: "US November CPI (BLS). Scheduled." },
  ] as { date: string; text: string }[],
};
const fmtDay = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${y}`; };
const pay = (P: number, ratePct: number, yrs: number) => { const r = ratePct / 1200, n = yrs * 12; return r <= 0 ? P / n : P * r / (1 - Math.pow(1 + r, -n)); };

// GDP conversions: 1% of GDP in money. Australia: Budget Paper No. 1 2026-27 ($31.5bn deficit = 1.0% of GDP, nominal GDP about A$3.09tn). US: CBO FY2026 GDP $31.90tn.
const AU_BN_PER_PCT = 31, US_TN_PER_PCT = 0.319;
const f1 = (v: number) => v.toFixed(1);
const yrs = ["Yr 1", "Yr 2", "Yr 3", "Yr 4", "Yr 5"];

export default function App() {
  const th = useGrokTheme();
  const [lv, setLv] = useState<Lv>(PRESETS[0].lv); // opens on an example (Trade war) so every tab shows something
  const [react, setReact] = useState<boolean>(false);
  const [view, setView] = useState<string>("growth");
  const [party, setParty] = useState<string>("rep");
  const [cmp, setCmp] = useState<string>("US");
  const [ctry, setCtry] = useState<string>("US");
  const [pk, setPk] = useState<string>("Balanced");
  // On/off toggles: a toggled-off lever keeps its slider value but is left out of the run.
  const [off, setOff] = useState<Record<string, boolean>>({});
  const [eu, setEu] = useState<Record<string, number>>({});
  const [iso, setIso] = useState<string>("");
  const [fk, setFk] = useState<string>("");
  const [pOff, setPOff] = useState<Record<string, boolean>>({});
  const [simP, setSimP] = useState<string>(""); // party last run in the Simulator: its fixed timing applies while a lever still equals the party value
  const [rOff, setROff] = useState<Record<string, boolean>>({});
  const [mult, setMult] = useState<string>("mid");
  const [rg, setRg] = useState<string>("now");
  const [taxH, setTaxH] = useState<string>("cbo");
  const isOn = (k: string) => (iso ? iso === k : !off[k]);
  const ALL_L = GROUPS.flatMap((g) => g.levers);
  const nm = (k: string) => (ALL_L.find((x) => x.key === k)?.label ?? k);
  const pLv = (p: Party): Lv => { const n: Lv = { ...ZERO }; (Object.keys(p.lv) as (keyof Lv)[]).forEach((k) => { if (!pOff[`${p.id}.${k}`]) n[k] = p.lv[k]; }); return n; };
  const [hz, setHz] = useState<string>("5");
  const [durS, setDurS] = useState<string>("10");
  const LRUN = hz === "lr";
  const SL = LRUN ? 100 : Number(hz);            // years shown
  const NR = Math.max(5, SL);                     // years computed (tables always have years 1-5)
  const D = durS === "perm" ? Infinity : Number(durS);
  // One cache for every engine run: the same policy is never computed twice
  const runCache = useMemo(() => new Map<string, Out>(), [react, NR, D]);
  // Party schedules: a lever follows the party timing while it equals that party's value
  const schFor = (p: Party | undefined, l: Lv): Sch | undefined => { if (!p || !p.sched) return undefined; const o: Sch = {}; (Object.keys(p.sched) as (keyof Lv)[]).forEach((k) => { const path = p.sched ? p.sched[k] : undefined; if (path && l[k] !== 0 && p.lv[k] !== 0) o[k] = { s: p.lv[k], p: path }; }); return Object.keys(o).length ? o : undefined; };
  const simSch = (l: Lv): Sch | undefined => { const p = PARTIES.find((x) => x.id === simP); if (!p) return undefined; const m: Lv = { ...ZERO }; (Object.keys(ZERO) as (keyof Lv)[]).forEach((k) => { if (l[k] === p.lv[k]) m[k] = l[k]; }); return schFor(p, m); };
  const runC = (l: Lv, k: number = 1): Out => { const sc = simSch(l); const key = `${k}|${(Object.keys(ZERO) as (keyof Lv)[]).map((x) => l[x]).join(",")}${sc ? "|" + simP + ":" + Object.keys(sc).join(",") : ""}`; let o = runCache.get(key); if (!o) { if (runCache.size > 300) runCache.clear(); o = run(l, k, react, NR, D, sc); runCache.set(key, o); } return o; };
  const NF = LRUN ? 50 : Math.max(10, Math.min(50, SL)); // Road to Surplus horizon
  const lab = (i: number) => (SL <= 10 ? `Yr ${i + 1}` : (i === 0 || (i + 1) % (SL > 50 ? 20 : SL > 20 ? 10 : 5) === 0) ? String(2027 + i) : "");
  const partyRuns = useMemo(() => PARTIES.map((p) => { const q = pLv(p), sc = schFor(p, q); return { p, m: run(q, 1, react, NR, D, sc), l: run(q, 0.5, react, NR, D, sc), h: run(q, 1.5, react, NR, D, sc) }; }), [react, NR, D, pOff]);
  const C = FISCAL.find((c) => c.id === ctry) ?? FISCAL[0];
  const P = C.pkgs.find((x) => x.name === pk) ?? C.pkgs[2];
  const sp = rOff.spend ? 0 : P.spend, rv = rOff.rev ? 0 : P.rev;
  const kM = mult === "lo" ? 0.5 : mult === "hi" ? 1.5 : 1, dR = rg === "up" ? 1 : 0, tH = taxH === "alesina";
  const fMid = fiscal(C, sp, rv, kM, dR, NF, tH), fLo = fiscal(C, sp, rv, 0.5 * kM, dR - 0.5, NF, tH), fHi = fiscal(C, sp, rv, 1.5 * kM, dR + 0.75, NF, tH), fBase = fiscal(C, 0, 0, 1, dR, NF);
  const firstSurplus = (d: number[]) => { const i = d.findIndex((x: number) => x <= 0); return i < 0 ? `Not within ${NF} yrs` : `Year ${i + 1} (${2027 + i})`; };
  const yrs20 = Array.from({ length: NF }, (_: unknown, i: number) => (i % (NF > 20 ? 10 : 4) === 0 || i === NF - 1 ? String(2027 + i) : ""));
  const dot = (c: string, n: string) => (<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: c, display: "inline-block" }} />{n}</span>);
  const pr = (x: { m: Out; l: Out; h: Out }, key: string, d: number) => `${f1(x.m[key][d])} (${f1(Math.min(x.l[key][d], x.m[key][d], x.h[key][d]))} to ${f1(Math.max(x.l[key][d], x.m[key][d], x.h[key][d]))})`;
  const sel = PARTIES.find((p) => p.id === party) ?? PARTIES[0];
  const aiRuns = useMemo(() => AI_SC.map((s) => ({ s, m: run(s.lv, 1, react, NR, D), l: run(s.lv, 0.5, react, NR, D), h: run(s.lv, 1.5, react, NR, D) })), [react, NR, D]);
  const [dId, setDId] = useState<string>("usp");
  const [ai, setAi] = useState<boolean>(false);
  const [life, setLife] = useState<string>(LIFE[0].name);
  const DB = DEBTS.find((x) => x.id === dId) ?? DEBTS[0];
  const gAI = ai ? 0.8 : 0, rAI = ai ? 0.4 : 0; // with an interest-rate offset of half the extra growth // AI boom adds about 0.8 pts to long-run growth (between Penn Wharton and Goldman)
  const LF = LIFE.find((x) => x.name === life) ?? LIFE[0];
  // Sliders update their number at once; the engine reruns 120 ms after the last move
  const [lvD, setLvD] = useState<Lv>(lv);
  const [euD, setEuD] = useState<Record<string, number>>(eu);
  useEffect(() => { const t = setTimeout(() => { setLvD(lv); setEuD(eu); }, 120); return () => clearTimeout(t); }, [lv, eu]);
  const lvE = useMemo(() => { const n: Lv = { ...ZERO }; (Object.keys(lvD) as (keyof Lv)[]).forEach((k) => { if (iso ? iso === k : !off[k]) n[k] = lvD[k]; }); return n; }, [lvD, off, iso]);
  const euE = useMemo(() => { const e: Record<string, number> = {}; Object.keys(euD).forEach((k: string) => { if (iso ? iso === `eu.${k}` : !off[`eu.${k}`]) e[k] = euD[k]; }); return e; }, [euD, off, iso]);
  const mid = runC(lvE, 1), lo = runC(lvE, 0.5), hi = runC(lvE, 1.5);
  const fkL = fk !== "" && fk in ZERO ? (fk as keyof Lv) : null;
  const alt = fkL ? runC({ ...lvE, [fkL]: isOn(fkL) ? 0 : lvD[fkL] }, 1) : null;
  const base = useMemo(() => run(ZERO, 1, false, NR, D), [NR, D]);
  const cut = (a: number[]) => a.slice(0, SL);

  const chart = (key: string, unit: string, fmt: (v: number) => string) => {
    const all = [...cut(mid[key]), ...cut(lo[key]), ...cut(hi[key]), ...cut(base[key]), ...(alt ? cut(alt[key]) : [])].filter((v: number) => Number.isFinite(v));
    const mx = Math.max(...all), mn = Math.min(...all);
    const pad = Math.max(0.3, (mx - mn) * 0.15);
    return (
      <LineChart points={cut(mid[key]).map((v: number, i: number) => ({ label: lab(i), value: v }))}
        labels={["Your policy", "No change"]} secondary={{ label: "No change", values: cut(base[key]) }}
        lines={[{ label: "Low-impact view", values: cut(lo[key]) }, { label: "High-impact view", values: cut(hi[key]) }, ...(alt && fkL ? [{ label: `${isOn(fkL) ? "Without" : "With"} ${nm(fkL)}`, values: cut(alt[key]) }] : [])]}
        ceiling={mx + pad} floor={mn - pad} unit={unit} format={fmt} legend={false} annotations={SL > 30 ? [{ at: 29, label: "2056: CBO window ends; extrapolation after" }] : undefined} />
    );
  };
  const arrow = (v: number) => (v > 0.5 ? "Up " : v < -0.5 ? "Down " : "Flat ");
  const rng = (k: string, d: number) => `${Math.min(lo[k][d], mid[k][d], hi[k][d]).toFixed(1)} to ${Math.max(lo[k][d], mid[k][d], hi[k][d]).toFixed(1)}`;

  const chip = (id: string, text: string, on: boolean, onTap: () => void, strike?: boolean) => (
    <button key={id} type="button" data-chip={id} aria-pressed={on} onClick={onTap}
      style={{ minHeight: 44, padding: "8px 14px", borderRadius: th.radius.full, border: `1px solid ${on ? th.border.strong : th.border.default}`, background: on ? th.fill.secondary : "transparent", color: on ? th.text.primary : th.text.secondary, fontSize: th.font.body2.fontSize, fontFamily: th.font.family, cursor: "pointer", textDecoration: strike && !on ? "line-through" : "none" }}>{text}</button>
  );
  const tglChips = (k: string) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {chip(`on-${k}`, isOn(k) ? "Included" : "Excluded", isOn(k), () => { setOff({ ...off, [k]: !off[k] }); setIso(""); setFk(k); }, true)}
      {chip(`iso-${k}`, iso === k ? "Isolated: only this" : "Isolate", iso === k, () => { setIso(iso === k ? "" : k); setFk(k); })}
      {k in ZERO && chip(`imp-${k}`, fk === k ? "Showing impact" : "Show impact", fk === k, () => setFk(fk === k ? "" : k))}
    </div>
  );
  const slider = (S: L) => (
    <div key={S.key} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 0", opacity: isOn(S.key) ? 1 : 0.6 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, color: th.text.primary, fontSize: th.font.body2.fontSize }}>
        <span>{S.label}</span>
        <span style={{ fontFamily: th.font.mono }}>{lv[S.key] > 0 ? "+" : ""}{lv[S.key]}{S.unit}</span>
      </div>
      {tglChips(S.key)}
      <input type="range" min={S.min} max={S.max} step={S.step} value={lv[S.key]}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setLv({ ...lv, [S.key]: Number(e.target.value) })}
        style={{ width: "100%", height: 44, accentColor: th.dataviz.categorical[0] }} />
      <span style={{ color: th.text.secondary, fontSize: th.font.label.fontSize }}>{S.hint}</span>
    </div>
  );
  const moved = (Object.keys(lv) as (keyof Lv)[]).filter((x) => lv[x] !== 0).length;
  const [tab, setTab] = useState<string>("sim");
  const topRef = useRef<HTMLDivElement>(null);
  const first = useRef<boolean>(true);
  const [narrow, setNarrow] = useState<boolean>(false); // phone-width layout: the Go to menu sits in the page instead of floating over content
  useEffect(() => { const f = () => setNarrow(window.innerWidth < 600); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  useEffect(() => { if (first.current) { first.current = false; return; } topRef.current?.scrollIntoView({ block: "start" }); }, [tab]);
  const TABS = [{ value: "sim", label: "Simulator" }, { value: "parties", label: "Parties: compare all" }, { value: "mix", label: "Mix & match worlds" }, { value: "road", label: "Road to Surplus" }, { value: "ai", label: "AI" }, { value: "life", label: "Better life" }, { value: "world", label: "Every economy" }, { value: "house", label: "Household" }, { value: "sector", label: "Sectors" }, { value: "auhh", label: "Australian household by party" }, { value: "data", label: "Data & sources" }];
  // ---------- Mix & match: 2-4 worlds, each a US party + an Australian party + optional add-ons, all run through the same two-country engine ----------
  type World = { us: string; au: string; add: string[]; on: boolean };
  const [worlds, setWorlds] = useState<World[]>([{ us: "dem", au: "onp", add: [], on: true }, { us: "rep", au: "onp", add: [], on: true }, { us: "dem", au: "lnp", add: [], on: true }, { us: "rep", au: "lnp", add: [], on: true }]);
  const [mxK, setMxK] = useState<string>("auG");
  const [wView, setWView] = useState<string>("growth");
  const ADDS: { id: string; name: string; lv: Lv }[] = [...PRESETS.map((p) => ({ id: `pre.${p.name}`, name: p.name, lv: p.lv })), ...AI_SC.filter((s) => !PRESETS.some((p) => p.name === s.name)).map((s) => ({ id: `ai.${s.name}`, name: s.name, lv: s.lv })), { id: "mine", name: "My Simulator levers", lv: lvE }];
  const GREY = "#8A8A8A";
  const pOf = (id: string) => PARTIES.find((p) => p.id === id);
  const pNm = (id: string, c: string) => pOf(id)?.name ?? `${c} no change`;
  const pCol = (id: string) => pOf(id)?.color ?? GREY;
  const wLv = (w: World): Lv => { const n: Lv = { ...ZERO }; const add = (l: Lv) => (Object.keys(l) as (keyof Lv)[]).forEach((k) => { n[k] += l[k]; }); const u = pOf(w.us), a = pOf(w.au); if (u) add(pLv(u)); if (a) add(pLv(a)); w.add.forEach((id: string) => { const x = ADDS.find((y) => y.id === id); if (x) add(x.lv); }); return n; };
  const wSch = (w: World, q: Lv): Sch | undefined => { const u = pOf(w.us), a = pOf(w.au); const su = u ? schFor(u, pLv(u)) : undefined, sa = a ? schFor(a, pLv(a)) : undefined; const o: Sch = { ...(su ?? {}), ...(sa ?? {}) }; (Object.keys(o) as (keyof Lv)[]).forEach((k) => { if (q[k] === 0) delete o[k]; }); return Object.keys(o).length ? o : undefined; };
  const glob = (o: Out): Out => ({ ...o, glob: o.usG.map((_: number, i: number) => (0.26 * o.usG[i] + 0.19 * o.cnG[i] + 0.15 * o.euG[i] + 0.04 * o.jpG[i] + 0.03 * o.ukG[i] + 0.02 * o.auG[i]) / 0.69) });
  const wRuns = useMemo(() => worlds.map((w: World, i: number) => { const q = wLv(w), sc = wSch(w, q); return { w, i, q, m: glob(run(q, 1, react, NR, D, sc)), l: glob(run(q, 0.5, react, NR, D, sc)), h: glob(run(q, 1.5, react, NR, D, sc)) }; }), [worlds, react, NR, D, pOff, lvE]);
  const baseG = glob(base);
  const WCOL = [th.dataviz.categorical[0], th.dataviz.categorical[1], th.dataviz.categorical[2], th.text.secondary];
  const wTag = (w: World) => (<span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>{dot(pCol(w.us), pNm(w.us, "US"))}<span>+</span>{dot(pCol(w.au), pNm(w.au, "Aus"))}{w.add.length ? <span>{`+ ${w.add.length} add-on${w.add.length > 1 ? "s" : ""}`}</span> : null}</span>);
  const setW = (i: number, p: Partial<World>) => setWorlds(worlds.map((w: World, j: number) => (j === i ? { ...w, ...p } : w)));
  const QUICK: [string, string, string][] = [["onp", "dem", "One Nation + Democrats"], ["onp", "rep", "One Nation + Republicans"], ["lnp", "dem", "Coalition + Democrats"], ["lnp", "rep", "Coalition + Republicans"]];
  const mort = (o: Out, rk: string, sprd: number, loan: number) => pay(loan, o[rk][1] + sprd, 30);
  const wr = (x: { m: Out; l: Out; h: Out }, f: (o: Out) => number, dp: number = 1) => `${f(x.m).toFixed(dp)} (${Math.min(f(x.l), f(x.m), f(x.h)).toFixed(dp)} to ${Math.max(f(x.l), f(x.m), f(x.h)).toFixed(dp)})`;
  const dir = (v: number) => (v > 0.5 ? `Up ${f1(v)}%` : v < -0.5 ? `Down ${f1(-v)}%` : `Flat ${f1(v)}%`);
  const MX_US = ["rep", "dem", ""], MX_AU = ["alp", "lnp", "grn", "onp", ""];
  const matrix = useMemo(() => MX_US.map((u: string) => MX_AU.map((a: string) => { const w: World = { us: u, au: a, add: [], on: true }, q = wLv(w); return glob(run(q, 1, react, NR, D, wSch(w, q))); })), [react, NR, D, pOff]);
  const MXO: { value: string; label: string; f: (o: Out) => string }[] = [
    { value: "auG", label: "Aus growth", f: (o: Out) => `${f1(o.auG[1])}%` }, { value: "usG", label: "US growth", f: (o: Out) => `${f1(o.usG[1])}%` }, { value: "glob", label: "World growth", f: (o: Out) => `${f1(o.glob[1])}%` },
    { value: "auDef", label: "Aus deficit", f: (o: Out) => `${f1(o.auDef[1])}%` }, { value: "def", label: "US deficit", f: (o: Out) => `${f1(o.def[1])}%` }, { value: "aud", label: "AUD/USD", f: (o: Out) => o.aud[1].toFixed(3) },
    { value: "auU", label: "Aus unemployment", f: (o: Out) => `${o.auU[1].toFixed(2)}%` }, { value: "usU", label: "US unemployment", f: (o: Out) => `${o.usU[1].toFixed(2)}%` },
    { value: "mort", label: "Aus mortgage", f: (o: Out) => `${sgn(mort(o, "rbaR", 1.9, 600000) - mort(base, "rbaR", 1.9, 600000), 0)}/mo` }];
  const MF = MXO.find((x) => x.value === mxK) ?? MXO[0];
  const auAll = [{ p: { id: "base", name: "No change", color: th.dataviz.other }, m: base, l: base, h: base }, ...partyRuns.filter((x) => x.p.country === "AU")];
  const usAll = [{ p: { id: "base", name: "No change", color: th.dataviz.other }, m: base, l: base, h: base }, ...partyRuns.filter((x) => x.p.country === "US")];
  const [picked, setPicked] = useState<string[]>(["us", "au", "uk"]);
  const [cmpKey, setCmpKey] = useState<string>("g");
  const [code, setCode] = useState<string>("");
  const [hh, setHh] = useState<string>("au");
  type Eco = { id: string; name: string; color: string; m: Out; l: Out; h: Out; b: Out; cur: string; loan: number; years: number; spread: number; rateKey: string };
  const pick = (o: Out, a: string, bb: string, c: string, d: string, e: string, r: string): Out => ({ g: o[a], pi: o[bb], u: o[c], def: o[d], debt: o[e], rate: o[r] });
  const euBase = useMemo(() => EU.map((c) => runEU(c, ZERO, {}, 1, base, base, NR, D)), [base, NR, D]);
  // Every economy for one policy (Europe only computed on the tabs that show it)
  const ecoOf = (l: Lv, eX: Record<string, number>, withEU: boolean): Eco[] => { const m = runC(l, 1), l2 = runC(l, 0.5), h2 = runC(l, 1.5); return [
    { id: "us", name: "US", color: th.dataviz.categorical[0], m: pick(m, "usG", "usPi", "usU", "def", "debt", "y10"), l: pick(l2, "usG", "usPi", "usU", "def", "debt", "y10"), h: pick(h2, "usG", "usPi", "usU", "def", "debt", "y10"), b: pick(base, "usG", "usPi", "usU", "def", "debt", "y10"), cur: "$", loan: 400000, years: 30, spread: 1.7, rateKey: "10y" },
    { id: "au", name: "Australia", color: th.dataviz.categorical[1], m: pick(m, "auG", "auPi", "auU", "auDef", "auDebt", "rbaR"), l: pick(l2, "auG", "auPi", "auU", "auDef", "auDebt", "rbaR"), h: pick(h2, "auG", "auPi", "auU", "auDef", "auDebt", "rbaR"), b: pick(base, "auG", "auPi", "auU", "auDef", "auDebt", "rbaR"), cur: "A$", loan: 600000, years: 30, spread: 1.9, rateKey: "cash" },
    ...(withEU ? EU.map((c, j: number) => ({ id: c.id, name: c.name, color: c.color, m: runEU(c, l, eX, 1, m, base, NR, D), l: runEU(c, l, eX, 0.5, l2, base, NR, D), h: runEU(c, l, eX, 1.5, h2, base, NR, D), b: euBase[j], cur: c.cur, loan: c.loan, years: c.years, spread: c.spread, rateKey: "policy" })) : []),
  ]; };
  const lvCode = (Object.keys(lv) as (keyof Lv)[]).filter((x) => lv[x] !== 0).map((x) => `${x}:${lv[x]}`).concat(Object.keys(eu).filter((x) => eu[x] !== 0).map((x) => `eu.${x}:${eu[x]}`)).join(",") || "none";
  const loadCode = () => { const n: Lv = { ...ZERO }; const e: Record<string, number> = {}; code.split(",").forEach((p: string) => { const [kk, vv] = p.split(":"); const v = Number(vv); if (!kk || Number.isNaN(v)) return; if (kk.startsWith("eu.")) e[kk.slice(3)] = v; else if (kk in n) (n as Record<string, number>)[kk] = v; }); setLv(n); setEu(e); setSimP(""); };
  const multi = (list: { p: { id: string; name: string; color: string }; m: Out }[], key: string, label: string) => {
    const n = SL, vals = list.flatMap((x) => cut(x.m[key])).filter((v: number) => Number.isFinite(v));
    const mx = vals.length ? Math.max(...vals) : 1, mn = vals.length ? Math.min(...vals) : 0, pad = Math.max(0.2, (mx - mn) * 0.1);
    const X = (i: number) => (n === 1 ? 320 : 40 + i * 560 / (n - 1)), Y = (v: number) => 20 + (1 - (v - mn + pad) / (mx - mn + 2 * pad)) * 160;
    const ticks = Array.from({ length: n }, (_: unknown, i: number) => i).filter((i: number) => lab(i) !== "");
    return (
      <div>
        <div style={{ color: th.text.primary, fontSize: th.font.body2.fontSize, marginBottom: 8 }}>{label}</div>
        <svg width="100%" viewBox="0 0 640 210" role="img" aria-label={label}>
          {[mn, (mn + mx) / 2, mx].map((v: number, i: number) => (<g key={i}><line x1={40} x2={600} y1={Y(v)} y2={Y(v)} stroke={th.border.subtle} /><text x={0} y={Y(v) + 5} fill={th.text.secondary} fontSize={16}>{mx - mn < 0.5 ? v.toFixed(3) : f1(v)}</text></g>))}
          {ticks.filter((i: number) => n <= 10 || i % 2 === 0 || i === n - 1 || n > 20).map((i: number) => <text key={i} x={X(i)} y={205} fill={th.text.secondary} fontSize={16} textAnchor="middle">{lab(i)}</text>)}
          {list.map((x) => n === 1 ? <circle key={x.p.id} cx={X(0)} cy={Y(x.m[key][0])} r={5} fill={x.p.color} /> : <polyline key={x.p.id} fill="none" stroke={x.p.color} strokeWidth={x.p.id === "base" ? 2 : 3} strokeDasharray={x.p.id === "base" ? "5 4" : undefined} points={cut(x.m[key]).map((v: number, i: number) => `${X(i)},${Y(v)}`).join(" ")} />)}
        </svg>
      </div>
    );
  };
  const keyRow = (list: { p: { id: string; name: string; color: string } }[]) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: th.text.primary, fontSize: th.font.body2.fontSize }}>
      {list.map((x) => <span key={x.p.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 4, background: x.p.color, display: "inline-block" }} />{x.p.name}</span>)}
    </div>
  );
  const house = (e: Eco, o: Out, d: number) => {
    const rate = e.id === "us" ? o.rate[d] + e.spread : o.rate[d] + e.spread;
    const pm = pay(e.loan, rate, e.years);
    const prices = 100 * o.pi.slice(0, d + 1).reduce((s: number, v: number) => s * (1 + v / 100), 1);
    return { rate, pm, prices, jobs: o.u[d] };
  };
  const usDebtGross = 121; // FRED / Treasury, Q2 2026 (the Debt payoff table uses CBO FY2026 est. 123.6%)
  const HLF: Record<string, number> = { us: 170.6, au: 15.5, uk: 35.6, fr: 31.5, de: 44.6, es: 24.6, fi: 2.8, se: 5.8, no: 3.0, dk: 3.2, is: 0.23 };
  const SUMMARY: Record<string, string> = {
    base: "Current settings, for reference.",
    alp: "In government: its 2026-27 Budget ($31.5bn deficit) is the baseline.",
    lnp: "$31bn of spending savings to fund tax-bracket indexation and a return to surplus.",
    grn: "Higher tax-free threshold and payments, paid for by new gas and mining taxes.",
    onp: "Fuel excise and other tax cuts, higher defence spending, and much lower migration.",
  };
  const cost = (x: { m: Out; l: Out; h: Out }) => { const d = (o: Out) => o.auDef.slice(0, 5).reduce((s: number, v: number, i: number) => s + v - base.auDef[i], 0) / 5; const a = d(x.m), b = d(x.l), c = d(x.h); return `${a >= 0 ? "+" : ""}${f1(a)}% GDP, about A$${Math.abs(a * AU_BN_PER_PCT).toFixed(0)}bn/yr ${a >= 0 ? "more deficit" : "less deficit"} (${f1(Math.min(a, b, c))} to ${f1(Math.max(a, b, c))})`; };
  const mini = (key: string, label: string) => multi(auAll, key, label);
  const sgn = (v: number, dp: number = 2) => `${v > 0 ? "+" : ""}${v.toFixed(dp)}`;
  // ---------- Sectors: policy picker, compare, jobs ----------
  const [secC, setSecC] = useState<string>("au");
  const [secY, setSecY] = useState<string>("1");
  const [secP, setSecP] = useState<string>("cur");
  const [secA, setSecA] = useState<string>("pre.0");
  const [secB, setSecB] = useState<string>("par.onp");
  const sy = Math.min(Number(secY), NR - 1);
  const strong = (x: L) => { const v = x.max > 0 ? x.max / 2 : x.min / 2; return Math.round(v / x.step) * x.step; };
  const POL: { value: string; label: string; lv: Lv; color?: string }[] = useMemo(() => [
    { value: "cur", label: "Current Simulator mix", lv: lvE },
    ...PRESETS.map((p, i: number) => ({ value: `pre.${i}`, label: `Scenario: ${p.name}`, lv: { ...ZERO, ...p.lv } })),
    ...AI_SC.map((s, i: number) => ({ value: `ai.${i}`, label: `AI: ${s.name}`, lv: { ...ZERO, ...s.lv } })),
    ...PARTIES.map((p: Party) => ({ value: `par.${p.id}`, label: `Party: ${p.name} (${p.country === "US" ? "US" : "Aus"})`, lv: pLv(p), color: p.color })),
    ...worlds.map((w: World, i: number) => ({ value: `w.${i}`, label: `Mix & match world ${i + 1}: ${pNm(w.us, "US")} + ${pNm(w.au, "Aus")}`, lv: wLv(w) })),
    ...ALL_L.map((x: L) => { const v = strong(x); return { value: `lv.${x.key}`, label: `One lever: ${x.label} ${v > 0 ? "+" : ""}${v}${x.unit}`, lv: { ...ZERO, [x.key]: v } }; }),
  ], [lvE, worlds, pOff]);
  const polOf = (k: string) => POL.find((p) => p.value === k) ?? POL[0];
  const nMoved = (l: Lv) => (Object.keys(l) as (keyof Lv)[]).filter((k) => l[k] !== 0).length;
  const baseS = react ? runC(ZERO, 1) : base;
  const secRun = (l: Lv) => ({ m: runC(l, 1), lo: runC(l, 0.5), hi: runC(l, 1.5) });
  const sP = polOf(secP);
  const POLO: POpt[] = useMemo(() => POL.map((p) => ({ value: p.value, label: p.label })), [POL]);
  const needEU = tab === "world" || tab === "house";
  const ECOS: Eco[] = useMemo(() => ecoOf(sP.lv, secP === "cur" ? euE : {}, needEU), [sP, secP, euE, needEU, runCache]);
  const sR = secRun(sP.lv);
  const sMid = sectorFx(sR.m, baseS, sP.lv, secC, sy), sLo = sectorFx(sR.lo, baseS, sP.lv, secC, sy), sHi = sectorFx(sR.hi, baseS, sP.lv, secC, sy);
  const sLF = secC === "us" ? 170600 : 15500;
  const uKey = secC === "us" ? "usU" : "auU";
  // AI job disruption moves unemployment without moving output, so add it to sector jobs, spread by each sector's share of jobs
  const sNoAI = sP.lv.aiJobs ? runC({ ...sP.lv, aiJobs: 0 }, 1) : null;
  const aiDisp = sNoAI ? -((sR.m[uKey][sy] - sNoAI[uKey][sy]) / 100) * sLF : 0;
  const sTotJ = SECT.reduce((a: number, x: Sect) => a + (secC === "us" ? x.usJobs : x.auJobs), 0);
  const sJobs = sectorJobs(sMid, secC).map((v: number, j: number) => v + aiDisp * (secC === "us" ? SECT[j].usJobs : SECT[j].auJobs) / sTotJ);
  const econJobs = -((sR.m[uKey][sy] - baseS[uKey][sy]) / 100) * sLF;
  const sZero = sMid.every((v: number) => Math.abs(v) < 0.05) && sJobs.every((v: number) => Math.abs(v) < 0.0005);
  const sOutZero = sMid.every((v: number) => Math.abs(v) < 0.05);
  const jf = (k: number) => { const p = Math.round(k * 1000); return Math.abs(p) < 1 ? "0" : `${p > 0 ? "+" : "-"}${Math.abs(p).toLocaleString()}`; };
  const SLEV: { name: string; lv: Lv }[] = secC === "us"
    ? [{ name: "Spend +1% GDP", lv: { ...ZERO, usSpend: 1 } }, { name: "Tax cut 1% GDP", lv: { ...ZERO, usTax: -1 } }, { name: "Fed +1 pt", lv: { ...ZERO, fed: 1 } }, { name: "Tariffs +10 pts", lv: { ...ZERO, tariff: 10 } }, { name: "Oil +20%", lv: { ...ZERO, oil: 20 } }, { name: "China slump -20%", lv: { ...ZERO, china: -20 } }, { name: "AI boost +0.5", lv: { ...ZERO, aiProd: 0.5 } }]
    : [{ name: "Spend +1% GDP", lv: { ...ZERO, auSpend: 1 } }, { name: "Tax cut 1% GDP", lv: { ...ZERO, auTax: -1 } }, { name: "RBA +1 pt", lv: { ...ZERO, rba: 1 } }, { name: "Migration -0.5", lv: { ...ZERO, auPop: -0.5 } }, { name: "Oil +20%", lv: { ...ZERO, oil: 20 } }, { name: "China slump -20%", lv: { ...ZERO, china: -20 } }, { name: "AI boost +0.5", lv: { ...ZERO, aiProd: 0.5 } }];
  const sMat = useMemo(() => SLEV.map((x: { name: string; lv: Lv }) => sectorFx(run(x.lv, 1, false, Math.max(NR, 2), 10), run(ZERO, 1, false, Math.max(NR, 2), 10), x.lv, secC, 1)), [secC, NR]);
  const sg = (v: number) => `${v >= 0.05 ? "+" : ""}${Math.abs(v) < 0.05 ? "0.0" : f1(v)}`;
  const cA = polOf(secA), cB = polOf(secB);
  const cRA = runC(cA.lv, 1), cRB = runC(cB.lv, 1);
  const LFP = (c: string) => (c === "us" ? 170600000 : 15500000);
  const macroRows = (A: Out, Bo: Out): CRow[] => [
    ...(["us", "au"] as const).flatMap((c) => { const k = (u: string, a2: string) => (c === "us" ? u : a2); const n = c === "us" ? "US" : "Aus"; return [
      { name: `${n} growth, yr 2 (pts)`, base: baseS[k("usG", "auG")][1], a: A[k("usG", "auG")][1], b: Bo[k("usG", "auG")][1], dp: 2, unit: "" },
      { name: `${n} inflation, yr 2 (pts)`, base: baseS[k("usPi", "auPi")][1], a: A[k("usPi", "auPi")][1], b: Bo[k("usPi", "auPi")][1], dp: 2, unit: "" },
      { name: `${n} unemployment, yr 2 (pts)`, base: baseS[k("usU", "auU")][1], a: A[k("usU", "auU")][1], b: Bo[k("usU", "auU")][1], dp: 2, unit: "" },
      { name: `${n} jobs, yr 2 (people)`, base: 0, a: -(A[k("usU", "auU")][1] - baseS[k("usU", "auU")][1]) / 100 * LFP(c), b: -(Bo[k("usU", "auU")][1] - baseS[k("usU", "auU")][1]) / 100 * LFP(c), dp: 0, unit: "" },
      { name: `${n} deficit, yr 2 (% GDP)`, base: baseS[k("def", "auDef")][1], a: A[k("def", "auDef")][1], b: Bo[k("def", "auDef")][1], dp: 2, unit: "" },
      { name: `${n} debt, yr 5 (% GDP)`, base: baseS[k("debt", "auDebt")][4], a: A[k("debt", "auDebt")][4], b: Bo[k("debt", "auDebt")][4], dp: 1, unit: "" },
    ]; }),
  ];
  const fxA = sectorFx(cRA, baseS, cA.lv, secC, sy), fxB = sectorFx(cRB, baseS, cB.lv, secC, sy);
  const colA = cA.color ?? th.dataviz.categorical[0], colB0 = cB.color ?? th.dataviz.categorical[1], colB = colB0 === colA ? th.dataviz.categorical[2] : colB0;
  const cmpMax = Math.max(0.5, ...fxA.map((v: number) => Math.abs(v)), ...fxB.map((v: number) => Math.abs(v)));
  const hbar = (v: number, c: string) => (<div style={{ display: "flex", height: 10 }}><div style={{ width: "50%", display: "flex", justifyContent: "flex-end" }}>{v < 0 && <div style={{ width: `${(100 * -v) / cmpMax}%`, background: c, borderRadius: 2 }} />}</div><div style={{ width: 1, background: th.border.strong }} /><div style={{ width: "50%" }}>{v > 0 && <div style={{ width: `${(100 * v) / cmpMax}%`, height: "100%", background: c, borderRadius: 2 }} />}</div></div>);
  const impact = (w: Out, wo: Out) => { const d = (k: string, i: number = 1) => w[k][i] - wo[k][i]; const mp = (o: Out, rk: string, sprd: number, loan: number) => pay(loan, o[rk][1] + sprd, 30); return [
    ["Growth, yr 2 (pts)", `US ${sgn(d("usG"))} · Aus ${sgn(d("auG"))}`],
    ["Inflation, yr 2 (pts)", `US ${sgn(d("usPi"))} · Aus ${sgn(d("auPi"))}`],
    ["Unemployment, yr 2 (pts)", `US ${sgn(d("usU"))} · Aus ${sgn(d("auU"))}`],
    ["Jobs, yr 2 (people)", `US ${sgn(-d("usU") / 100 * 170600000, 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} · Aus ${sgn(-d("auU") / 100 * 15500000, 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${Math.abs(d("usU")) < 0.005 && Math.abs(d("auU")) < 0.005 ? " (this lever moves output or prices, not the jobless rate, in this model)" : ""}`],
    ["Deficit, yr 2 (% GDP)", `US ${sgn(d("def"))} · Aus ${sgn(d("auDef"))}`],
    ["Debt, yr 5 (% GDP)", `US ${sgn(d("debt", 4), 1)} · Aus ${sgn(d("auDebt", 4), 1)}`],
    ["Household mortgage, yr 2 ($/month)", `US $400k: ${sgn(mp(w, "y10", 1.7, 400000) - mp(wo, "y10", 1.7, 400000), 0)} · Aus A$600k: ${sgn(mp(w, "rbaR", 1.9, 600000) - mp(wo, "rbaR", 1.9, 600000), 0)}`],
  ]; };

  const cmpSec = (cap: string) => (
    <Section heading="Compare two policies" caption={cap}>
      <Grid columns={2}>
        <PolicyPicker label="Policy A" value={secA} onChange={setSecA} options={POLO} />
        <PolicyPicker label="Policy B" value={secB} onChange={setSecB} options={POLO} />
      </Grid>
      <PolicyCompare aName={cA.label} bName={cB.label} colA={colA} colB={colB} rows={macroRows(cRA, cRB)} />
    </Section>
  );
  const viewPick = (<PolicyPicker label="Policy to view" value={secP} onChange={setSecP} options={POLO} back />);
  const HELP: Record<string, string> = {
    sim: "Pick a scenario or move a slider, then read the scoreboard and charts.",
    parties: "Each party's plan, run through the same model, side by side.",
    mix: "Pair a US plan with an Australian plan and see how they affect each other.",
    road: "What it takes to balance the budget, and to pay off debt.",
    ai: "Slow, middle and fast AI paths, plus job disruption.",
    life: "Evidence-based options for everyday wellbeing, with critiques from both sides.",
    world: "One policy across every economy. Pick the policy, then the countries.",
    house: "What one policy means for a mortgage, groceries, pay and jobs.",
    sector: "Which industries and jobs gain or lose under one policy.",
    data: "Starting numbers, dates and sources.",
  };

  return (
    <Page width="wide" title="US + Australia Policy Simulator"
      summary="Pull policy levers in the US, Australia, China, Japan, Europe and the UK, or move oil, and see the estimated five-year effects, starting from the latest official data.">
      {narrow && <Select label="Go to" value={tab} onChange={(v: string) => setTab(v)} options={TABS} />}
      <Callout tone="warning" lead="Educational toy, not a forecast.">It uses simple published rules of thumb. Economists disagree, so thin lines and bracketed numbers show a low-impact and a high-impact view. It takes no political side.</Callout>

      <div ref={topRef} style={{ scrollMarginTop: narrow ? 16 : 96 }} />
      <Text>{`${TABS.find((x) => x.value === tab)?.label ?? ""}: ${HELP[tab] ?? ""} Switch tabs with the menu at the top.`}</Text>
      {(() => { const n = new Date(); const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
        const past = CHANGES.upcoming.filter((u) => u.date < today), next = CHANGES.upcoming.filter((u) => u.date >= today);
        return (
      <Section heading={`What changed, as of ${CHANGES.asOf}`} collapsible defaultOpen={false}>
        <BulletList items={[...CHANGES.items, ...past.map((u) => `Was scheduled for ${fmtDay(u.date)}: ${u.text} The result has not been added here yet.`)]} />
        {next.length > 0 && <><Text>Coming up:</Text><BulletList items={next.map((u) => `${fmtDay(u.date)}: ${u.text}`)} /></>}
      </Section>); })()}

      {tab === "sim" && (<>
      <Section heading="How to use" collapsible defaultOpen={moved === 0}>
        <NumberedList items={["Tap a ready-made scenario, or open a group below and drag a slider.", "Read the scoreboard: your policy against no change, two years out.", "Switch the charts to see five years. Thick line: your policy. Dashed: no change. Thin lines: low and high views.", "Every lever has an Included / Excluded chip: tap it to compare with and without that policy, or Isolate to see it alone.", "Use the menu pinned at the top for parties, budgets, AI and policy ideas."]} />
      </Section>
      <Section heading="Current US tariffs (baseline)" caption="What 'no change' means for the tariff lever, as of Jul-Oct 2026. Measures differ, so a range is shown.">
        <Table columns={["Measure", "Rate", "Source", "As of"]} rows={[
          ["Statutory average (modelled)", "11.1%", "Yale Budget Lab (nonpartisan academic)", "24 Jul 2026"],
          ["Effective, before / after import substitution", "10.85% / 9.05%", "Yale Budget Lab", "24 Jul 2026"],
          ["Collected duties / imports", "7.2%", "Tax Foundation (free-market, centre-right)", "2026"],
          ["Observed effective rate", "7.1%", "Penn Wharton Budget Model (nonpartisan academic)", "Aug 2026"],
        ]} />
        <Text>Current US average tariff: 7.1-11.1% (collected vs statutory). Legal basis: the Supreme Court ruled on 20 Feb 2026 that IEEPA does not authorise tariffs (Learning Resources v. Trump). The Section 122 10% surcharge that followed expired on 24 Jul 2026 and was replaced by Section 301 forced-labor tariffs of 10% or 12.5% on 60 economies (91 FR 47318). Section 232 product tariffs (steel, aluminium, pharmaceuticals and others) remain.</Text>
        <LinkCards links={[{ title: "Supreme Court opinion, 20 Feb 2026", site: "supremecourt.gov", href: "https://www.supremecourt.gov/opinions/25pdf/24-1287_4gcj.pdf" }, { title: "Federal Register: Section 301 actions", site: "federalregister.gov", href: "https://www.federalregister.gov/documents/2026/07/28/2026-15181/notice-of-actions-in-section-301-investigations-of-acts-policies-and-practices-of-various-economies" }, { title: "Yale Budget Lab: state of US tariffs", site: "budgetlab.yale.edu", href: "https://budgetlab.yale.edu/research/state-us-tariffs" }, { title: "Tax Foundation: tariff tracker", site: "taxfoundation.org", href: "https://taxfoundation.org/research/federal-tax/trump-tariffs-trade-war/" }, { title: "Penn Wharton: effective tariff rates", site: "budgetmodel.wharton.upenn.edu", href: "https://budgetmodel.wharton.upenn.edu/p/2026-10-14-effective-tariff-rates-and-revenues-updated-october-14-2026/" }, { title: "CRS legal sidebar", site: "congress.gov", href: "https://www.congress.gov/crs-product/LSB11398" }]} />
      </Section>

      <Section heading="Choose a scenario">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Button label="Reset to no change" variant={moved === 0 ? "primary" : "quiet"} onClick={() => { setLv(ZERO); setOff({}); setIso(""); setFk(""); setSimP(""); }} />
          {PRESETS.map((p) => <Button key={p.name} label={p.name} variant={JSON.stringify(lv) === JSON.stringify(p.lv) ? "primary" : "quiet"} onClick={() => { setLv(p.lv); setOff({}); setIso(""); setSimP(""); }} />)}
        </div>
        <div data-changes="landing"><Callout tone="info" lead={moved === 0 ? "Unchanged: current settings." : `Changes vs unchanged: current settings (${moved} lever(s) moved${PRESETS.find((p) => JSON.stringify(p.lv) === JSON.stringify(lv)) ? ", " + PRESETS.find((p) => JSON.stringify(p.lv) === JSON.stringify(lv))!.name : ""})`}>{moved === 0 ? "Every lever is at current settings. Tap a scenario or drag a slider and the change shows here; the full scoreboard is further down." : impact(mid, base).map((r: string[]) => `${r[0]}: ${r[1]}`).join(" | ")}</Callout></div>
        {(() => { const sc = simSch(lvE), p = PARTIES.find((x) => x.id === simP); if (!sc || !p) return null; const NAMES: Partial<Record<keyof Lv, string>> = { usSpend: "US federal spending", usTax: "US taxes", auSpend: "Australian spending", auTax: "Australian taxes", tariff: "tariffs" };
          const parts = (Object.keys(sc) as (keyof Lv)[]).map((k) => { const ys = Object.keys(sc[k]!.p).map(Number).filter((y: number) => sc[k]!.p[y] !== 0); return `${NAMES[k] ?? k} ${Math.min(...ys)} to ${Math.max(...ys)}`; });
          return <Text>{`Fixed timing from the ${p.name} preset: ${parts.join("; ")} only (the duration setting does not apply to these levers). Move the lever to drop it.`}</Text>; })()}
      </Section>

      <Section heading="Or set the levers yourself" caption="Tap a group to open it. The number in brackets is how many levers in it you have moved.">
        {GROUPS.map((g) => (
          <Section key={g.name} heading={`${g.name} (${g.levers.filter((x) => lv[x.key] !== 0).length})`} collapsible defaultOpen={false}>
            <div>{g.levers.map(slider)}</div>
          </Section>
        ))}
        <Toggle label="Let the Fed and RBA react (Taylor rule)" value={react} onChange={setReact} />
        <Section heading="Europe: budgets and central banks" collapsible defaultOpen={false}>
          <Text>Fiscal change per country (% of GDP a year; plus = more spending or tax cuts). ECB moves France, Spain, Germany, Finland, and Denmark through its peg; the BoE lever is in the group above.</Text>
          {EU.map((c) => (
            <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 0" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, color: th.text.primary, fontSize: th.font.body2.fontSize }}><span>{`${c.name} budget`}</span><span style={{ fontFamily: th.font.mono }}>{`${(eu[c.id] ?? 0) > 0 ? "+" : ""}${eu[c.id] ?? 0}% GDP`}</span></div>
              {tglChips(`eu.${c.id}`)}
              <input type="range" min={-3} max={3} step={0.1} value={eu[c.id] ?? 0} onChange={(e: ChangeEvent<HTMLInputElement>) => setEu({ ...eu, [c.id]: Number(e.target.value) })} style={{ width: "100%", height: 44, accentColor: th.dataviz.categorical[0] }} />
            </div>
          ))}
          {BANKS.map((bk) => (
            <div key={bk.key} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 0" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, color: th.text.primary, fontSize: th.font.body2.fontSize }}><span>{`${bk.name} rate change (now ${bk.now})`}</span><span style={{ fontFamily: th.font.mono }}>{`${(eu[bk.key] ?? 0) > 0 ? "+" : ""}${eu[bk.key] ?? 0} pts`}</span></div>
              {tglChips(`eu.${bk.key}`)}
              <input type="range" min={-3} max={3} step={0.25} value={eu[bk.key] ?? 0} onChange={(e: ChangeEvent<HTMLInputElement>) => setEu({ ...eu, [bk.key]: Number(e.target.value) })} style={{ width: "100%", height: 44, accentColor: th.dataviz.categorical[0] }} />
            </div>
          ))}
        </Section>
        <Text>{moved === 0 ? "No levers moved: showing the no-change path." : `${moved} lever(s) moved${iso ? `; isolating ${nm(iso.replace("eu.", ""))} only` : Object.values(off).some((x: boolean) => x) ? `; ${Object.values(off).filter((x: boolean) => x).length} excluded` : ""}.`}</Text>
        {(iso !== "" || Object.values(off).some((x: boolean) => x)) && <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><Button label="Include every policy again" onClick={() => { setOff({}); setIso(""); }} /></div>}
      </Section>

      <Section heading="Save or share this scenario" collapsible defaultOpen={false}>
        <Text>{`Scenario code: \`${lvCode}\``}</Text>
        <Input label="Paste a scenario code to load it" value={code} onChange={setCode} placeholder="e.g. tariff:25,fed:-3" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><Button label="Load code" onClick={loadCode} /></div>
        <Text>Copy the code into a note or message; pasting it back here restores every lever.</Text>
      </Section>
      </>)}

      {tab === "world" && (<>
      <Section heading="Compare every economy" caption="Shows the policy picked here (Europe's budget and bank sliders apply only to your Simulator mix). Tap countries to add or remove them.">
        {viewPick}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ECOS.map((e) => <Button key={e.id} label={e.name} variant={picked.includes(e.id) ? "primary" : "quiet"} onClick={() => setPicked(picked.includes(e.id) ? picked.filter((x: string) => x !== e.id) : [...picked, e.id])} />)}
        </div>
        <Segmented value={cmpKey} onChange={setCmpKey} options={[{ value: "g", label: "Growth" }, { value: "pi", label: "Inflation" }, { value: "u", label: "Jobless" }, { value: "def", label: "Deficit" }, { value: "debt", label: "Debt" }]} />
        {keyRow(ECOS.filter((e) => picked.includes(e.id)).map((e) => ({ p: { id: e.id, name: e.name, color: e.color } })))}
        {multi(ECOS.filter((e) => picked.includes(e.id)).map((e) => ({ p: { id: e.id, name: e.name, color: e.color }, m: e.m })), cmpKey, ({ g: "Growth, %", pi: "Inflation, %", u: "Unemployment, %", def: "Deficit, % of GDP (minus = surplus)", debt: "Government debt, % of GDP" } as Record<string, string>)[cmpKey])}
        <Table columns={["Economy", "Growth yr 2", "Inflation yr 2", "Jobless yr 2", "Deficit yr 2", "Debt yr 5", "Mortgage / month"]} rows={ECOS.filter((e) => picked.includes(e.id)).map((e) => { const r = (k2: string, d: number) => `${f1(e.m[k2][d])} (${f1(Math.min(e.l[k2][d], e.m[k2][d], e.h[k2][d]))} to ${f1(Math.max(e.l[k2][d], e.m[k2][d], e.h[k2][d]))})`; return [dot(e.color, e.name), r("g", 1), r("pi", 1), r("u", 1), r("def", 1), r("debt", 4), `${e.cur}${Math.round(house(e, e.m, 1).pm).toLocaleString()}`]; })} />
        <Section heading="Government and party presets in Europe" collapsible defaultOpen={false}>
          <Text>Each European economy starts from its current government's budget (the baseline). Main-party alternative presets for the UK and the Nordic and euro-area countries are not yet built, so those levers stay at baseline; use the Europe sliders in the Simulator to test a party's plan by hand.</Text>
        </Section>
        <Section heading="How Europe is modelled" collapsible defaultOpen={false}>
          <BulletList items={["Each country: own budget lever (multiplier 0.8) and its central bank (1 point = about 0.4 points less growth at peak).", "Spill-ins: euro-area demand times each country's EU export share (about 0.4 to 0.6), US growth at 0.15, China via export exposure, oil.", "Norway: higher oil prices lift growth slightly and add to the surplus through the oil fund (Government Pension Fund Global).", "Denmark's krone is pegged to the euro, so Danmarks Nationalbank follows the ECB.", "Inflation drifts back to 2% targets and growth toward trend in the no-change path."]} />
        </Section>
      </Section>
      {cmpSec("US and Australia under two policies, against no change.")}
      </>)}

      {tab === "mix" && (<>
      <Section heading="Mix & match worlds" caption="Each world pairs a US policy set with an Australian one, plus optional add-ons, and runs through the same engine, so US policy spills into Australia (trade, AUD, rates, shares) and the reverse. Party settings are the same as on the Parties tab. Other economies stay at baseline unless an add-on moves them.">
        <Text>Quick combos: the first four set World 1; the last loads all four side by side.</Text>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {QUICK.map(([a, u, n]) => <Button key={n} label={n} variant={worlds[0].us === u && worlds[0].au === a ? "primary" : "quiet"} onClick={() => setW(0, { us: u, au: a, on: true })} />)}
          <Button label="All four side by side (2×2)" variant="primary" onClick={() => setWorlds(QUICK.map(([a, u]) => ({ us: u, au: a, add: [], on: true })))} />
        </div>
        <Segmented value={hz} onChange={setHz} options={[{ value: "1", label: "\u00a01 yr\u00a0" }, { value: "2", label: "\u00a02 yr\u00a0" }, { value: "3", label: "\u00a03 yr\u00a0" }, { value: "5", label: "\u00a05 yr\u00a0" }, { value: "10", label: "\u00a010 yr\u00a0" }, { value: "20", label: "\u00a020 yr\u00a0" }, { value: "30", label: "\u00a030 yr\u00a0" }, { value: "50", label: "\u00a050 yr\u00a0" }, { value: "lr", label: "Long run" }]} />
        <Grid columns={2}>
          {wRuns.map((x) => (
            <div key={x.i} data-world={x.i} style={{ display: "flex", flexDirection: "column", gap: 10, opacity: x.w.on ? 1 : 0.55 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, color: th.text.primary, fontSize: th.font.body2.fontSize }}><span style={{ width: 14, height: 4, background: WCOL[x.i], display: "inline-block" }} /><span>{`World ${x.i + 1}:`}</span>{wTag(x.w)}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {chip(`w${x.i}-on`, x.w.on ? "World shown" : "World hidden", x.w.on, () => setW(x.i, { on: !x.w.on }), true)}
                {worlds.length > 2 && <Button label="Remove" onClick={() => setWorlds(worlds.filter((_: World, j: number) => j !== x.i))} />}
              </div>
              <span style={{ color: th.text.secondary, fontSize: th.font.label.fontSize }}>US policy</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{MX_US.map((u: string) => chip(`w${x.i}-us-${u || "none"}`, pNm(u, "US"), x.w.us === u, () => setW(x.i, { us: u })))}</div>
              <span style={{ color: th.text.secondary, fontSize: th.font.label.fontSize }}>Australian policy</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{MX_AU.map((a: string) => chip(`w${x.i}-au-${a || "none"}`, pNm(a, "Aus"), x.w.au === a, () => setW(x.i, { au: a })))}</div>
              <span style={{ color: th.text.secondary, fontSize: th.font.label.fontSize }}>Add-ons (tap several; they add together)</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{ADDS.map((ad) => chip(`w${x.i}-add-${ad.id}`, ad.name, x.w.add.includes(ad.id), () => setW(x.i, { add: x.w.add.includes(ad.id) ? x.w.add.filter((y: string) => y !== ad.id) : [...x.w.add, ad.id] })))}</div>
            </div>
          ))}
        </Grid>
        {worlds.length < 4 && <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><Button label="Add a world" onClick={() => setWorlds([...worlds, { us: "", au: "", add: [], on: true }])} /></div>}
      </Section>

      <Section heading="Worlds side by side" caption={`Middle estimate; dashed grey is no change in both countries. Horizon: ${LRUN ? "100 years" : `${SL} year${SL === 1 ? "" : "s"}`}.`}>
        {keyRow([{ p: { id: "base", name: "No change", color: th.dataviz.other } }, ...wRuns.filter((x) => x.w.on).map((x) => ({ p: { id: `w${x.i}`, name: `World ${x.i + 1}`, color: WCOL[x.i] } }))])}
        <Segmented value={wView} onChange={setWView} options={[{ value: "growth", label: "Growth" }, { value: "prices", label: "Inflation" }, { value: "jobs", label: "Jobs" }, { value: "budget", label: "Budgets" }, { value: "global", label: "Global" }]} />
        {(() => { const L = [{ p: { id: "base", name: "No change", color: th.dataviz.other }, m: baseG }, ...wRuns.filter((x) => x.w.on).map((x) => ({ p: { id: `w${x.i}`, name: `World ${x.i + 1}`, color: WCOL[x.i] }, m: x.m }))]; const P: Record<string, [string, string][]> = { growth: [["usG", "US growth, %"], ["auG", "Aus growth, %"]], prices: [["usPi", "US inflation, %"], ["auPi", "Aus inflation, %"]], jobs: [["usU", "US unemployment, %"], ["auU", "Aus unemployment, %"]], budget: [["def", "US deficit, % GDP"], ["debt", "US debt, % GDP"], ["auDef", "Aus deficit, % GDP"], ["auDebt", "Aus net debt, % GDP"]], global: [["glob", "World growth proxy, %"], ["aud", "AUD/USD"], ["spx", "S&P 500 vs no change, %"], ["asx", "ASX 200 vs no change, %"]] }; return <Grid columns={2}>{(P[wView] ?? P.growth).map(([k, t]) => <div key={k}>{multi(L, k, t)}</div>)}</Grid>; })()}
      </Section>

      <Section heading="Scorecard per world" caption="Year 2 unless marked; middle estimate with the low to high-impact range in brackets. World growth proxy weights US, China, euro area, Japan, UK and Australia by rough GDP shares.">
        <Table columns={["", "No change", ...wRuns.map((x) => `World ${x.i + 1}`)]} rows={[
          ["Policies", "None", ...wRuns.map((x) => wTag(x.w))],
          ["US growth %", f1(base.usG[1]), ...wRuns.map((x) => wr(x, (o: Out) => o.usG[1]))],
          ["US inflation %", f1(base.usPi[1]), ...wRuns.map((x) => wr(x, (o: Out) => o.usPi[1]))],
          ["US jobless %", f1(base.usU[1]), ...wRuns.map((x) => wr(x, (o: Out) => o.usU[1]))],
          ["US deficit % GDP", f1(base.def[1]), ...wRuns.map((x) => wr(x, (o: Out) => o.def[1]))],
          [`US debt, end of yr ${SL}`, f1(base.debt[SL - 1]), ...wRuns.map((x) => wr(x, (o: Out) => o.debt[SL - 1]))],
          ["Aus growth %", f1(base.auG[1]), ...wRuns.map((x) => wr(x, (o: Out) => o.auG[1]))],
          ["Aus inflation %", f1(base.auPi[1]), ...wRuns.map((x) => wr(x, (o: Out) => o.auPi[1]))],
          ["Aus jobless %", f1(base.auU[1]), ...wRuns.map((x) => wr(x, (o: Out) => o.auU[1]))],
          ["Aus deficit % GDP", f1(base.auDef[1]), ...wRuns.map((x) => wr(x, (o: Out) => o.auDef[1]))],
          [`Aus net debt, end of yr ${SL}`, f1(base.auDebt[SL - 1]), ...wRuns.map((x) => wr(x, (o: Out) => o.auDebt[SL - 1]))],
          ["World growth proxy %", f1(baseG.glob[1]), ...wRuns.map((x) => wr(x, (o: Out) => o.glob[1]))],
          ["Oil (Brent assumption)", `$${BRENT.usd.toFixed(0)}`, ...wRuns.map((x) => `$${(BRENT.usd * (1 + x.q.oil / 100)).toFixed(0)}`)],
          ["AUD/USD", base.aud[1].toFixed(3), ...wRuns.map((x) => wr(x, (o: Out) => o.aud[1], 3))],
          ["S&P 500 vs no change", "0", ...wRuns.map((x) => dir(x.m.spx[1]))],
          ["ASX 200 vs no change", "0", ...wRuns.map((x) => dir(x.m.asx[1]))],
          ["US mortgage, $400k ($/mo vs no change)", "0", ...wRuns.map((x) => wr(x, (o: Out) => mort(o, "y10", 1.7, 400000) - mort(base, "y10", 1.7, 400000), 0))],
          ["Aus mortgage, A$600k (A$/mo vs no change)", "0", ...wRuns.map((x) => wr(x, (o: Out) => mort(o, "rbaR", 1.9, 600000) - mort(base, "rbaR", 1.9, 600000), 0))],
          ["Prices after 2 yrs, Aus (start = 100)", f1(100 * (1 + base.auPi[0] / 100) * (1 + base.auPi[1] / 100)), ...wRuns.map((x) => wr(x, (o: Out) => 100 * (1 + o.auPi[0] / 100) * (1 + o.auPi[1] / 100)))],
        ]} />
        <Text>Hidden worlds stay in the table so nothing jumps around; the charts drop them. Mortgages assume a 30-year loan at the US 10-year yield plus 1.7 points or the RBA cash rate plus 1.9 points.</Text>
      </Section>

      <Section heading="Every US × Australian party combination" caption="Year 2, middle estimate, no add-ons. Rows: US policy; columns: Australian policy.">
        <Segmented value={mxK} onChange={setMxK} options={MXO.map((x) => ({ value: x.value, label: x.label }))} />
        <Table columns={["US \\ Aus", ...MX_AU.map((a: string) => pNm(a, "Aus"))]} rows={MX_US.map((u: string, i: number) => [dot(pCol(u), pNm(u, "US")), ...MX_AU.map((_: string, j: number) => MF.f(matrix[i][j]))])} />
        <Text>The four example pairings are the One Nation and Coalition columns crossed with the Republican and Democrat rows. Sources for each party's settings are on the Parties tab and in Data & sources.</Text>
      </Section>
      </>)}

      {tab === "house" && (<>
      <Section heading="Your household" caption="What the picked policy means in everyday terms, two years from now, against no change. Rough guide only.">
        {viewPick}
        <Segmented value={hh} onChange={setHh} options={ECOS.map((e) => ({ value: e.id, label: e.name.length < 4 ? `\u00a0\u00a0${e.name}\u00a0\u00a0` : e.name }))} />
        {(() => { const e = ECOS.find((x) => x.id === hh) ?? ECOS[0]; const a = house(e, e.m, 1), z = house(e, e.b, 1); const fuel = 0.35 * sP.lv.oil; const inc = (e.m.g[0] + e.m.g[1] - e.b.g[0] - e.b.g[1]) * 0.7 - (e.m.pi[0] + e.m.pi[1] - e.b.pi[0] - e.b.pi[1]) * 0.3 - (e.id === "us" ? sP.lv.usTax : e.id === "au" ? sP.lv.auTax : 0); return (
          <Table columns={["", "With this policy", "No change"]} rows={[
            [`Mortgage on ${e.cur}${e.loan.toLocaleString()} over ${e.years} yrs`, `${e.cur}${Math.round(a.pm).toLocaleString()}/month at ${f1(a.rate)}%`, `${e.cur}${Math.round(z.pm).toLocaleString()}/month at ${f1(z.rate)}%`],
            [`A ${e.cur}100 grocery shop today costs`, `${e.cur}${a.prices.toFixed(0)}`, `${e.cur}${z.prices.toFixed(0)}`],
            ["Fuel price change from the oil lever", `${fuel >= 0 ? "+" : ""}${f1(fuel)}%`, "0%"],
            ["Unemployment rate", `${a.jobs.toFixed(2)}% (${sgn(a.jobs - z.jobs, 2)} pts)`, `${z.jobs.toFixed(2)}%`],
            ["People out of work vs no change", (() => { const lf = HLF[e.id]; const dd = (a.jobs - z.jobs) / 100 * lf * 1e6; return lf ? (Math.abs(dd) < 500 ? "About the same" : `${Math.round(Math.abs(dd)).toLocaleString()} ${dd > 0 ? "more" : "fewer"}`) : `${sgn(a.jobs - z.jobs, 2)} pts (labour force not yet sourced)`; })(), "0 (current settings)"],
            ["Chance a worker is unemployed", `about 1 in ${f1(100 / Math.max(a.jobs, 0.5))}`, `about 1 in ${f1(100 / Math.max(z.jobs, 0.5))}`],
            ["Real take-home pay vs no change", `${inc >= 0 ? "+" : ""}${f1(inc)}%`, "0%"],
          ]} />); })()}
        <Section heading="How these are worked out" collapsible defaultOpen={false}>
          <BulletList items={["Mortgage rate = model policy rate plus a typical lender margin (US: 10-year yield + 1.7 for a 30-year fixed; Australia: cash rate + 1.9 variable; Europe: policy rate + 0.5 to 1.5).", "Grocery prices follow model inflation; fuel moves about 35% of the oil price change.", "Take-home pay: 0.7 times the extra growth, less a share of extra inflation, less any tax rise in % of GDP. Caveat: the tax term uses the whole tax lever, including company and resource taxes, so it overstates the hit to wage earners for presets that raise business taxes (for example the Greens, whose personal tax change is a cut). A personal versus company split is pending.", "Loan sizes are rough typical first-home loans, not national averages."]} />
        </Section>
      </Section>
      {cmpSec("Household view of two policies side by side: pick any two.")}
      </>)}

      {tab === "parties" && (<>
      <Section heading="Years shown">
        {(() => { const HZO = ["1", "2", "3", "4", "5", "10", "20", "30", "50", "lr"]; return (
          <div data-years-slider style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ color: th.text.primary, fontSize: th.font.body2.fontSize }}>{`Charts on this tab show ${LRUN ? "the long run" : hz + (hz === "1" ? " year" : " years")}. Drag to change.`}</div>
            <input type="range" aria-label="Years shown" min={0} max={HZO.length - 1} step={1} value={Math.max(0, HZO.indexOf(hz))} onChange={(e: ChangeEvent<HTMLInputElement>) => setHz(HZO[Number(e.target.value)])} style={{ width: "100%", height: 44, margin: 0, accentColor: th.dataviz.categorical[0] }} />
          </div>); })()}
      </Section>
      <Section heading="Compare all Australian parties" caption="No federal election is underway. The next one is due between 7 Aug 2027 and 20 May 2028 (AEC). Shown: parties with stated, sized national economic policies.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: th.text.primary, fontSize: th.font.body2.fontSize }}>
          {auAll.map((x) => <span key={x.p.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 4, background: x.p.color, display: "inline-block" }} />{x.p.name}</span>)}
        </div>
        <Grid columns={2}>
          {mini("auG", "Growth, %")}
          {mini("auPi", "Inflation, %")}
          {mini("auU", "Unemployment, %")}
          {mini("auDef", "Budget deficit, % of GDP")}
        </Grid>
        <Table columns={["Party", "In one line", "Growth yr 2", "Inflation yr 2", "Jobless yr 2", "Deficit yr 2", "Net debt yr 5", "Cost to budget, avg yrs 1-5"]} rows={auAll.map((x) => [dot(x.p.color, x.p.name), SUMMARY[x.p.id] ?? "", x.p.id === "base" ? f1(base.auG[1]) : pr(x, "auG", 1), x.p.id === "base" ? f1(base.auPi[1]) : pr(x, "auPi", 1), x.p.id === "base" ? f1(base.auU[1]) : pr(x, "auU", 1), x.p.id === "base" ? f1(base.auDef[1]) : pr(x, "auDef", 1), x.p.id === "base" ? f1(base.auDebt[4]) : pr(x, "auDebt", 4), x.p.id === "base" ? "0" : cost(x)])} />
        <Text>Brackets show the low to high-impact range. Labor matches no change because, as the government, its budget is the baseline.</Text>
        <Section heading="Who is not included, and why" collapsible defaultOpen={false}>
          <Text>Community Strong (teal) independents, Katter's Australian Party, Centre Alliance and other independents have no shared, sized national economic platform to set the levers from. The Greens' and One Nation's revenue and cost figures are partly not PBO-costed, so their true ranges are wider than shown.</Text>
        </Section>
      </Section>

      <Section heading="Compare all US parties" caption="Same method as Australia. Middle estimate; ranges in the table below.">
        {keyRow(usAll)}
        <Grid columns={2}>
          {multi(usAll, "usG", "Growth, %")}
          {multi(usAll, "usPi", "Inflation, %")}
          {multi(usAll, "usU", "Unemployment, %")}
          {multi(usAll, "debt", "Debt held by the public, % of GDP")}
        </Grid>
      </Section>

      <Section heading="Party presets: what each assumes" caption="Built only from each party's own stated proposals as of Nov 2026, using one method for all. Central bank levers are never set by a party.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PARTIES.map((p) => <Button key={p.id} label={p.name} variant={party === p.id ? "primary" : "quiet"} onClick={() => setParty(p.id)} />)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Button label={`Run ${sel.name} in the Simulator`} onClick={() => { setLv(pLv(sel)); setOff({}); setIso(""); setSimP(sel.id); setTab("sim"); }} />
        </div>
        {(Object.keys(sel.lv) as (keyof Lv)[]).some((k) => sel.lv[k] !== 0) && (<>
          <Text>Tap a line item to leave it out of this party's run (every chart and table on this tab updates).</Text>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(Object.keys(sel.lv) as (keyof Lv)[]).filter((k) => sel.lv[k] !== 0).map((k) => { const id = `${sel.id}.${k}`; return chip(`p-${id}`, `${pOff[id] ? "Excluded" : "Included"}: ${nm(k)} ${sel.lv[k] > 0 ? "+" : ""}${sel.lv[k]}`, !pOff[id], () => setPOff({ ...pOff, [id]: !pOff[id] }), true); })}
          </div>
          <Table columns={["Impact of each item", ...(sel.country === "US" ? ["US growth yr 2", "US deficit yr 2", "US debt yr 5"] : ["Aus growth yr 2", "Aus jobless yr 2", "Aus deficit yr 2"])]} rows={(Object.keys(sel.lv) as (keyof Lv)[]).filter((k) => sel.lv[k] !== 0).map((k) => { const w = run({ ...ZERO, [k]: sel.lv[k] }, 1, react, NR, D); const ks = sel.country === "US" ? [["usG", 1], ["def", 1], ["debt", 4]] : [["auG", 1], ["auU", 1], ["auDef", 1]]; const ex = !!pOff[`${sel.id}.${k}`]; return [ex ? `${nm(k)} (excluded: left at current settings)` : nm(k), ...ks.map(([kk, i]) => ex ? "0.00 (excluded)" : sgn(w[kk as string][i as number] - base[kk as string][i as number]))]; })} />
        </>)}
        <Table columns={["Lever", "Setting", "Why (source)"]} rows={sel.notes.map((n: [string, string, string]) => [n[0], n[1], n[2]])} />
        <Text>US colours follow US convention (Republican red, Democrat blue). Australia's differ: Labor is red, the Coalition blue, the Greens green, One Nation orange. Teal independents and Katter's Australian Party are not included: the teals are independents with no shared platform, and neither has PBO-costed national economic policies to set the levers from.</Text>
      </Section>

      <Section heading="How much of each platform is costed" caption="Same method for every party. Uncosted items stay at the baseline, which makes a party with uncosted savings look more expensive and one with uncosted spending look cheaper than its platform says.">
        <Table columns={["Party", "Items sized (any source)", "Officially costed (CBO/PBO)", "Deficit yr 2, official costings only", "Deficit yr 2, as modelled", "Left at baseline (no figure found)"]} rows={PARTIES.map((p) => { const c = COSTING[p.id]; if (!c) return [dot(p.color, p.name), "not yet sourced", "not yet sourced", "not yet sourced", "not yet sourced", "not yet sourced"]; const n = c.items.length, sz = c.items.filter((x: CItem) => x[1] !== "unsized").length, of = c.items.filter((x: CItem) => x[1] === "official").length; const kk = p.country === "US" ? "def" : "auDef"; const o = run({ ...ZERO, ...c.off }, 1, react, NR, D), m2 = run(p.lv, 1, react, NR, D);
          return [dot(p.color, p.name), `${sz} of ${n} (${Math.round(100 * sz / n)}%)`, `${of} of ${n} (${Math.round(100 * of / n)}%)`, f1(o[kk][1]), f1(m2[kk][1]), c.items.filter((x: CItem) => x[1] === "unsized").map((x: CItem) => x[0]).join("; ") || "None"]; })} />
        <EstimateBlock page="sim" /><div data-estimate-pending hidden style={{ border: `1px dashed ${th.border.strong}`, borderRadius: th.radius.md, padding: 12, color: th.text.secondary, fontSize: th.font.body2.fontSize }}>{"Estimate pending (not yet sourced), plotted at current settings until a sourced low-to-high range is added: " + PARTIES.map((p) => { const c = COSTING[p.id]; const u = c ? c.items.filter((x: CItem) => x[1] === "unsized").map((x: CItem) => x[0]) : []; return u.length ? `${p.name}: ${u.join("; ")}` : ""; }).filter((x: string) => x).join(". ") + "."}</div>
        <Text>{"Shares count stated items, not dollars. Sized items use, in order of preference, official costings (CBO, PBO), outside published estimates, the party's own figures, then this Page's estimates (marked in each party's notes). No published estimate was found for any item left at baseline as of 3 Nov 2026, so the range cannot include them; US presets use CBO scores and press reports, not the parties' own documents."}</Text>
      </Section>

      <Section heading="Parties side by side" caption="Middle estimate, with the low to high-impact range in brackets. Year 2 unless marked.">
        <Segmented value={cmp} onChange={setCmp} options={[{ value: "US", label: "US parties" }, { value: "AU", label: "Australian parties" }]} />
        {cmp === "US" ? (
          <Table columns={["Party", "Growth %", "Inflation %", "Deficit % GDP", "Debt yr 5"]} rows={[
            [dot("#8A8A8A", "No change"), f1(base.usG[1]), f1(base.usPi[1]), f1(base.def[1]), f1(base.debt[4])],
            ...partyRuns.filter((x) => x.p.country === "US").map((x) => [dot(x.p.color, x.p.name), pr(x, "usG", 1), pr(x, "usPi", 1), pr(x, "def", 1), pr(x, "debt", 4)])]} />
        ) : (
          <Table columns={["Party", "Growth %", "Inflation %", "Jobless %", "Deficit % GDP"]} rows={[
            [dot("#8A8A8A", "No change"), f1(base.auG[1]), f1(base.auPi[1]), f1(base.auU[1]), f1(base.auDef[1])],
            ...partyRuns.filter((x) => x.p.country === "AU").map((x) => [dot(x.p.color, x.p.name), pr(x, "auG", 1), pr(x, "auPi", 1), pr(x, "auU", 1), pr(x, "auDef", 1)])]} />
        )}
      </Section>
      </>)}

      {tab === "road" && (<>
      <Section heading={`Road to Surplus (${NF} years)`} caption="Savings phase in gradually. Thick line: the multiplier and r - g settings picked below. Thin lines: half and one-and-a-half times that multiplier, with rates 0.5 pts lower and 0.75 pts higher.">
        <Segmented value={ctry} onChange={setCtry} options={FISCAL.map((c) => ({ value: c.id, label: c.name.length < 4 ? `\u00a0\u00a0${c.name}\u00a0\u00a0` : c.name }))} />
        <Segmented value={pk} onChange={setPk} options={C.pkgs.map((x) => ({ value: x.name, label: x.name }))} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {chip("r-spend", `${rOff.spend ? "Excluded" : "Included"}: spending cuts ${f1(P.spend)}% GDP`, !rOff.spend, () => setROff({ ...rOff, spend: !rOff.spend }), true)}
          {chip("r-rev", `${rOff.rev ? "Excluded" : "Included"}: new revenue ${f1(P.rev)}% GDP`, !rOff.rev, () => setROff({ ...rOff, rev: !rOff.rev }), true)}
        </div>
        <Segmented value={mult} onChange={setMult} options={[{ value: "lo", label: "Low multiplier" }, { value: "mid", label: "Middle" }, { value: "hi", label: "High multiplier" }]} />
        <Segmented value={rg} onChange={setRg} options={[{ value: "now", label: `r - g today (${f1(C.r - C.g)})` }, { value: "up", label: `r - g 1 pt higher (${f1(C.r - C.g + 1)})` }]} />
        <Text>{"r − g: the interest rate on government debt minus the economy's growth rate; when it's positive, debt tends to grow faster than the economy."}</Text>
        <Segmented value={taxH} onChange={setTaxH} options={[{ value: "cbo", label: "Cuts cost more growth (CBO)" }, { value: "alesina", label: "Tax rises cost more (Alesina et al.)" }]} />
        <Text>{"Multiplier = how much each 1% of GDP of tightening slows growth in year 1, which then shrinks revenue. Low 0.5, middle 1.0 (spending; tax 0.5), high 1.5 (Blanchard & Leigh, IMF WP/13/1, found multipliers were underestimated in 2010-11). r - g = interest rate on debt minus nominal growth; higher r - g makes debt harder to cut. Whether spending cuts or tax rises cost more growth is contested: CBO's multipliers say cuts; Alesina, Favero & Giavazzi (2019) say tax rises; others dispute that."}</Text>
        <Table columns={["Sensitivity (this package)", "r - g today: first surplus", `debt ${2026 + NF}`, "r - g +1 pt: first surplus", `debt ${2026 + NF}`]} rows={[["Low multiplier", 0.5], ["Middle", 1], ["High multiplier", 1.5]].map(([n, kk]) => { const a = fiscal(C, sp, rv, kk as number, 0, NF, tH), b = fiscal(C, sp, rv, kk as number, 1, NF, tH); return [n as string, firstSurplus(a.def), f1(a.debt[NF - 1]) + "%", firstSurplus(b.def), f1(b.debt[NF - 1]) + "%"]; })} />
        <Table columns={["Impact of each item", "Deficit yr 5", `Debt in ${2026 + NF}`]} rows={[["Spending cuts", P.spend], ["New revenue", P.rev]].map(([n, v]) => { const w = fiscal(C, n === "Spending cuts" ? (v as number) : 0, n === "New revenue" ? (v as number) : 0, kM, dR, NF, tH); return [n as string, `${sgn(w.def[4] - fBase.def[4], 1)} pts`, `${sgn(w.debt[NF - 1] - fBase.debt[NF - 1], 1)} pts`]; })} />
        <Metrics metrics={[
          { label: "Total savings at full phase-in", value: f1(sp + rv) + "% GDP", detail: `${f1(sp)} spending + ${f1(rv)} revenue, over ${C.phase} yrs` },
          { label: "First surplus (middle)", value: firstSurplus(fMid.def), detail: `Range: ${firstSurplus(fLo.def)} to ${firstSurplus(fHi.def)}` },
          { label: `Debt in ${2026 + NF}`, value: f1(fMid.debt[NF - 1]) + "% GDP", detail: `No change: ${f1(fBase.debt[NF - 1])}%` },
        ]} />
        <Grid columns={2}>
          <LineChart points={fMid.def.map((v: number, i: number) => ({ label: yrs20[i], value: v }))} labels={["Deficit with package", "No change"]} secondary={{ label: "No change", values: fBase.def }}
            lines={[{ label: "Low view", values: fLo.def }, { label: "High view", values: fHi.def }]} ceiling={Math.max(...fBase.def, ...fHi.def) + 1} floor={Math.min(...fLo.def, 0) - 1} unit="% GDP" format={f1} annotations={[{ at: "zero", label: "Surplus line" }]} legend={false} />
          <LineChart points={fMid.debt.map((v: number, i: number) => ({ label: yrs20[i], value: v }))} labels={["Debt with package", "No change"]} secondary={{ label: "No change", values: fBase.debt }}
            lines={[{ label: "Low view", values: fLo.debt }, { label: "High view", values: fHi.debt }]} ceiling={Math.max(...fBase.debt, ...fHi.debt) + 10} floor={Math.max(0, Math.min(...fLo.debt) - 10)} unit="% GDP" format={(v: number) => v.toFixed(0)} legend={false} />
        </Grid>
        <Text>First chart: yearly deficit (below zero is a surplus). Second: debt as a share of GDP.</Text>
        <Table columns={["Item", "Detail"]} rows={[["Starting point", C.base], ["Who bears the cost", P.who], ["Verdict", C.verdict]]} />
      </Section>
      {cmpSec("How two policies change deficits and debt (and growth and jobs on the way).")}
      </>)}

      {tab === "ai" && (<>
      <Section heading="AI scenarios" caption="Year 5 values, middle estimate with the range in brackets. The range is deliberately very wide: nobody knows.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AI_SC.map((s) => <Button key={s.name} label={`Run ${s.name}`} onClick={() => { setLv({ ...lv, aiProd: s.lv.aiProd, aiJobs: s.lv.aiJobs }); setTab("sim"); }} />)}
        </div>
        <Table columns={["Scenario", "US growth", "US jobless", "US deficit", "US debt", "Aus growth", "S&P vs base"]} rows={aiRuns.map((x) => [x.s.name, pr(x, "usG", 4), pr(x, "usU", 4), pr(x, "def", 4), pr(x, "debt", 4), pr(x, "auG", 4), pr(x, "spx", 4)])} />
        <Table columns={["Scenario", "Based on"]} rows={AI_SC.map((s) => [s.name, s.basis])} />
        <Table columns={["Published estimate", "What it measures", "Horizon", "Per year, roughly"]} rows={AI_LIT.map((x) => [x[0], x[1], x[2], x[3]])} />
        <Text>{"These studies measure different things over different horizons, so they are not directly comparable. The AI boom scenario uses the top of the published range. Budget effect: faster productivity tends to raise interest rates, so the model adds half of any extra growth to the 10-year yield, which offsets part of the tax gain (CBO's rules of thumb in How Changes in Economic Projections Might Affect Budget Projections treat growth and interest rates as separate, partly offsetting effects). The job-disruption size has no published source and is illustrative."}</Text>
        <Section heading="How AI is modelled" collapsible defaultOpen={false}>
          <Text>AI adds supply, so it lowers inflation a little, and higher incomes raise tax revenue. Australia gets about 80% of the US effect (slower adoption, per the Productivity Commission). CBO has not put AI into its baseline because the size is so uncertain.</Text>
        </Section>
      </Section>
      {cmpSec("Put two AI paths, or an AI path and anything else, side by side.")}
      </>)}

      {tab === "road" && (
      <Section heading="Paying off the debt entirely" caption="Primary surplus = the budget surplus before interest payments. Assumes a constant surplus held every year.">
        <Segmented value={dId} onChange={setDId} options={DEBTS.map((x) => ({ value: x.id, label: x.name }))} />
        <Toggle label="With an AI boom (growth +0.8 pts a year, interest +0.4)" value={ai} onChange={setAi} />
        <Table columns={["Pay off in", "Primary surplus needed", "Swing from today", "In today's money / yr"]} rows={[20, 30, 40].map((N: number) => { const p = payoff(DB.d, DB.r + rAI, DB.g + gAI, N); return [`${N} years`, f1(p) + "% GDP", f1(p - DB.prim) + " pts", DB.id.startsWith("us") ? `$${(p - DB.prim) * US_TN_PER_PCT > 0 ? ((p - DB.prim) * US_TN_PER_PCT).toFixed(1) : "0"}T` : `A$${((p - DB.prim) * AU_BN_PER_PCT).toFixed(0)}bn`]; })} />
        <Text>{DB.id.startsWith("us") ? "Verdict: paying off US debt is not realistic. Even over 40 years it needs a swing of about 5 points of GDP held for a generation, which is rare for a deliberate peacetime effort; an AI boom trims this by well under a point once higher interest rates are allowed for. Stabilising debt is the more common goal among economists." : "Verdict: realistic for net debt. Australia did it once: net debt reached about zero in 2006 and the Future Fund was set up in 2006 to hold surpluses. That was helped a great deal by the mining boom, rising terms of trade and asset sales (Telstra, Commonwealth Bank), not policy alone. Gross debt is usually kept to support a working bond market."}</Text>
        <Section heading="The debate: is zero debt even a good goal?" collapsible defaultOpen={true}>
        <Text>{"Arguments against aiming for zero:"}</Text>
        <BulletList items={["Treasuries are the main safe asset for banks, pension funds and foreign central banks, and the Fed uses them to run monetary policy. In 2000-01, when surpluses were forecast to pay off US debt, FOMC minutes discussed how to operate with a disappearing Treasury market.", "When interest rates are below growth (r < g), moderate public debt may have low fiscal cost and can even raise welfare (Blanchard, AER 2019).", "Australia kept issuing some bonds even at zero net debt in the 2000s so the market kept working."]} />
        <Text>{"Arguments for lower debt:"}</Text>
        <BulletList items={["High debt can crowd out private investment and raises interest costs (CBO, The Macroeconomic Effects of Federal Debt).", "Low debt leaves room to respond to recessions and emergencies.", "r < g can reverse; interest rates matter more than anything: 1 point higher rates raise the surplus needed roughly as much as the AI boom lowers it."]} />
        <Text>{"Economists disagree; this Page does not pick a side. The common middle ground is keeping debt from growing faster than the economy."}</Text>
        </Section>
      </Section>
      )}

      {tab === "life" && (
      <Section heading="A better life for the average person: evidence-based options" caption="Options with good evidence of raising typical household wellbeing. They are evidence-based options, not endorsements of any party.">
        <Text>{"How options were chosen: (1) peer-reviewed or official evidence that it raises typical households' real income, lowers living costs or improves wellbeing; (2) relevant in both the US and Australia; (3) published critiques from both left and right. Budget cost is shown but was not a filter. Evidence grade: A = many strong causal studies agree; B = strong studies but mixed or design-dependent results; C = mostly modelling or theory."}</Text>
        <Table columns={["Option", "Grade", "Evidence", "Budget cost", "Fits deficit goal?"]} rows={LIFE.map((x) => [x.name, x.grade ?? "not yet graded", x.evidence, x.cost, x.fit])} />
        <Select label="Read one in detail" value={life} onChange={setLife} options={LIFE.map((x) => x.name)} />
        <Table columns={["", "Detail"]} rows={[["What and why", LF.what], ["Evidence grade", `${LF.grade ?? "not yet graded"}: ${LF.basis ?? "not yet sourced"}`], ["Critique from the left", LF.left], ["Critique from the right", LF.right]]} />
        <Section heading="Well-evidenced options not listed, and why" collapsible defaultOpen={false}>
          <BulletList items={["Health coverage expansions: strong evidence on financial security (Oregon Health Insurance Experiment, Finkelstein et al., QJE 2012), left out because the US and Australian systems differ too much for one option.", "Minimum wage rises: left out because evidence on employment effects is contested.", "Cash transfers and basic income pilots: left out because pilot results are mixed and hard to scale to national budgets.", "Early-childhood programmes are covered under Childcare and early education."]} />
        </Section>
      </Section>
      )}

      {tab === "sim" && (<>
      <Section heading="Time horizon" caption="How far ahead to look, and how long budget and tariff changes last before being phased out.">
        <Segmented value={hz} onChange={setHz} options={[{ value: "1", label: "\u00a01 yr\u00a0" }, { value: "2", label: "\u00a02 yr\u00a0" }, { value: "3", label: "\u00a03 yr\u00a0" }, { value: "4", label: "\u00a04 yr\u00a0" }, { value: "5", label: "\u00a05 yr\u00a0" }, { value: "10", label: "\u00a010 yr\u00a0" }, { value: "20", label: "\u00a020 yr\u00a0" }, { value: "30", label: "\u00a030 yr\u00a0" }, { value: "50", label: "\u00a050 yr\u00a0" }, { value: "lr", label: "Long run" }]} />
        <Segmented value={durS} onChange={setDurS} options={[{ value: "5", label: "Policies last 5 yrs" }, { value: "10", label: "10 yrs" }, { value: "perm", label: "Permanent" }]} />
        {SL >= 30 && base.debt.length > 28 && <Text>{`Benchmark: with no change, this model puts US debt held by the public at ${f1(base.debt[28])}% of GDP in 2055; CBO's February 2026 extended baseline (pre-IEEPA ruling) projects 171.8% in 2055 and 175.1% in 2056 (cbo.gov/publication/62105), so the model is about 3 points below CBO in 2055. CBO's window ends at 2056 (30 years), so anything later is an extrapolation and is labelled that way.`}</Text>}
        {SL > 10 && <Text>Past 10 years this is about where things settle, not a forecast: growth returns to trend (US 2.0%, Australia 2.2%), inflation to target, unemployment to its normal rate, and central banks back to neutral. Debt follows interest rate versus growth.</Text>}
      </Section>
      {LRUN && (
        <Section heading="Long-run steady state" caption="Where the model settles after 100 years. Debt keeps rising when the government runs a deficit before interest and interest rates are near or above growth.">
          {(() => { const L = 99, s = (o: Out, kk: string) => (o[kk][L] - o[kk][L - 10]) / 10; const tag = (o: Out, kk: string) => (Math.abs(s(o, kk)) < 0.2 ? "Stable" : s(o, kk) > 0 ? `Still rising about ${f1(s(o, kk))} pts a year` : `Still falling about ${f1(-s(o, kk))} pts a year`); return (
            <Table columns={["", "Your policy", "No change"]} rows={[
              ["US growth / inflation / jobless", `${f1(mid.usG[L])} / ${f1(mid.usPi[L])} / ${f1(mid.usU[L])}%`, `${f1(base.usG[L])} / ${f1(base.usPi[L])} / ${f1(base.usU[L])}%`],
              ["Fed rate / 10-year yield", `${f1(mid.fedR[L])} / ${f1(mid.y10[L])}%`, `${f1(base.fedR[L])} / ${f1(base.y10[L])}%`],
              ["US debt, % GDP", `${f1(mid.debt[L])} (${tag(mid, "debt")})`, `${f1(base.debt[L])} (${tag(base, "debt")})`],
              ["Aus growth / inflation / jobless", `${f1(mid.auG[L])} / ${f1(mid.auPi[L])} / ${f1(mid.auU[L])}%`, `${f1(base.auG[L])} / ${f1(base.auPi[L])} / ${f1(base.auU[L])}%`],
              ["RBA cash rate", `${f1(mid.rbaR[L])}%`, `${f1(base.rbaR[L])}%`],
              ["Aus net debt, % GDP", `${f1(mid.auDebt[L])} (${tag(mid, "auDebt")})`, `${f1(base.auDebt[L])} (${tag(base, "auDebt")})`],
            ]} />); })()}
          <Text>{"Beyond 2056 every figure here is an extrapolation of the model's assumptions, not a projection."}</Text>
        </Section>
      )}

      {fkL && alt && (
        <Section heading={`Impact of this policy: ${nm(fkL)}`} caption={isOn(fkL) ? "With it minus without it, everything else as currently included. Charts below add a 'Without' line." : "It is excluded now: this shows what including it would add. Charts below add a 'With' line."}>
          <Table columns={["", "Difference"]} rows={isOn(fkL) ? impact(mid, alt) : impact(alt, mid)} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tglChips(fkL)}
            <Button label="Close impact" onClick={() => setFk("")} />
          </div>
        </Section>
      )}

      <Section heading="Scoreboard: two years from now">
        <Metrics metrics={[
          { label: "US growth", value: f1(mid.usG[1]) + "%", detail: "No change: " + f1(base.usG[1]) + "%" },
          { label: "US inflation", value: f1(mid.usPi[1]) + "%", detail: "No change: " + f1(base.usPi[1]) + "%" },
          { label: "US unemployment", value: mid.usU[1].toFixed(2) + "%", detail: "No change: " + base.usU[1].toFixed(2) + "%" },
          { label: "Aus growth", value: f1(mid.auG[1]) + "%", detail: "No change: " + f1(base.auG[1]) + "%" },
          { label: "Aus unemployment", value: mid.auU[1].toFixed(2) + "%", detail: "No change: " + base.auU[1].toFixed(2) + "%" },
          { label: "AUD/USD", value: mid.aud[1].toFixed(3), detail: "Now " + B.aud.toFixed(3) },
          { label: "US debt (yr 5)", value: f1(mid.debt[4]) + "% GDP", detail: "No change: " + f1(base.debt[4]) + "%" },
          { label: "S&P 500", value: arrow(mid.spx[1]) + f1(mid.spx[1]) + "%", detail: "vs no change" },
          { label: "ASX 200", value: arrow(mid.asx[1]) + f1(mid.asx[1]) + "%", detail: "vs no change" },
        ]} />
        {(lvE.usSpend > 0 || lvE.usTax < 0) && mid.debt[0] < base.debt[0] && <Text>{"Why US debt dips at first: the model's spending multiplier (1.0) and lasting level effect lift nominal GDP faster than the extra borrowing in years 1 and 2, so debt as a share of GDP falls briefly before rising. Many official dynamic analyses show debt rising from the start when spending is deficit-financed, so treat the early dip as a feature of this simple model."}</Text>}
        {4 * (lvE.boj - lvE.fed) > 3 && <Text>{"Why stocks fall here: a large Fed cut relative to the BoJ strengthens the yen by more than 3% in this model, which forces yen carry-trade selling (as in August 2024) and hits stocks and the AUD. Without that channel, rate cuts usually lift stocks. The size of this hit is uncertain."}</Text>}
        {lvE.oil < 0 && <Text>{"Why stocks can dip when oil falls: any big oil move, up or down, takes a small one-off volatility penalty off stocks in year 1, so an oil price fall can nudge stocks down at first."}</Text>}
      </Section>

      <Section heading={LRUN ? "Charts: the long run (100 years)" : `Charts: the next ${SL} year${SL === 1 ? "" : "s"}`} caption="Thick line: your policy. Dashed: no change. Thin lines: low and high-impact views. Change the time horizon above.">
        <Segmented value={view} onChange={setView} options={[
          { value: "growth", label: "Growth" }, { value: "prices", label: "Inflation" }, { value: "jobs", label: "Jobs" },
          { value: "debt", label: "US debt" }, { value: "markets", label: "Markets" }, { value: "world", label: "World" }]} />
        {view === "growth" && <Grid columns={2}>{chart("usG", "%", f1)}{chart("auG", "%", f1)}</Grid>}
        {view === "prices" && <Grid columns={2}>{chart("usPi", "%", f1)}{chart("auPi", "%", f1)}</Grid>}
        {view === "jobs" && <Grid columns={2}>{chart("usU", "%", f1)}{chart("auU", "%", f1)}</Grid>}
        {view === "debt" && <Grid columns={2}>{chart("def", "% GDP", f1)}{chart("debt", "% GDP", f1)}</Grid>}
        {view === "markets" && <Grid columns={2}>{chart("y10", "%", (v: number) => v.toFixed(2))}{chart("aud", "", (v: number) => v.toFixed(3))}{chart("spx", "%", f1)}{chart("asx", "%", f1)}</Grid>}
        {view === "world" && <Grid columns={2}>{chart("cnG", "%", f1)}{chart("euG", "%", f1)}{chart("jpG", "%", f1)}{chart("ukG", "%", f1)}</Grid>}
        <Text>{({ growth: "First: US GDP growth. Second: Australian GDP growth.", prices: "First: US inflation. Second: Australian inflation.", jobs: "First: US unemployment. Second: Australian unemployment.", debt: "First: US yearly deficit. Second: US debt held by the public.", markets: "US 10-year yield, AUD/USD, then S&P 500 and ASX 200 change vs no change.", world: "GDP growth: China, euro area, Japan, UK." } as Record<string, string>)[view]}</Text>
      </Section>

      <Section heading="Price level, GDP per person and rents" collapsible defaultOpen={false} caption="Change versus no change, middle estimate with the low to high range.">
        {(() => { const yi = Math.min(4, NR - 1), y2 = Math.min(1, NR - 1); const dd = (key: string, i: number) => { const a = mid[key][i] - base[key][i], b = lo[key][i] - base[key][i], c = hi[key][i] - base[key][i]; return `${sgn(a, 2)} (${sgn(Math.min(a, b, c), 2)} to ${sgn(Math.max(a, b, c), 2)})`; };
          return <Table columns={["Measure", `Yr ${y2 + 1}`, `Yr ${yi + 1}`]} rows={[
            ["US price level from tariffs, %", dd("usPL", y2), dd("usPL", yi)],
            ["US inflation, pts", dd("usPi", y2), dd("usPi", yi)],
            ["Aus GDP growth (aggregate), pts", dd("auG", y2), dd("auG", yi)],
            ["Aus GDP growth per person, pts", dd("auGpc", y2), dd("auGpc", yi)],
            ["Aus rents, %", dd("auRent", y2), dd("auRent", yi)],
          ]} />; })()}
        <Text>{"Tariffs lift the price level for as long as they last; inflation rises only while it adjusts. Migration changes aggregate GDP much more than GDP per person, whose sign is debated; the budget effect depends on the mix of migrants (age, skills, visa type), and lower migration also eases housing demand and rents. Sources: Productivity Commission, Migrant Intake into Australia (2016); Treasury and Home Affairs, Shaping a Nation (2018); National Academies (2017)."}</Text>
      </Section>

      <Section heading="Other economies, year 2" collapsible defaultOpen={false}>
        <Table columns={["Economy", "Growth", "Range", "Inflation"]} rows={[
          ["China", f1(mid.cnG[1]), rng("cnG", 1), f1(mid.cnPi[1])],
          ["Euro area", f1(mid.euG[1]), rng("euG", 1), f1(mid.euPi[1])],
          ["Japan", f1(mid.jpG[1]), rng("jpG", 1), f1(mid.jpPi[1])],
          ["UK", f1(mid.ukG[1]), rng("ukG", 1), f1(mid.ukPi[1])],
          ["Yen per US$", mid.jpy[0].toFixed(1), "Now 157.5", ""],
        ]} />
      </Section>

      <Section heading="US and Australia ranges, year 2" collapsible defaultOpen={false}>
        <Table columns={["Measure", "Middle", "Range"]} rows={[
          ["US growth %", f1(mid.usG[1]), rng("usG", 1)],
          ["US inflation %", f1(mid.usPi[1]), rng("usPi", 1)],
          ["US unemployment %", f1(mid.usU[1]), rng("usU", 1)],
          ["US 10y yield %", mid.y10[1].toFixed(2), rng("y10", 1)],
          ["Aus growth %", f1(mid.auG[1]), rng("auG", 1)],
          ["Aus inflation %", f1(mid.auPi[1]), rng("auPi", 1)],
          ["Aus unemployment %", f1(mid.auU[1]), rng("auU", 1)],
          ["AUD/USD", mid.aud[1].toFixed(3), `${Math.min(lo.aud[1], mid.aud[1], hi.aud[1]).toFixed(3)} to ${Math.max(lo.aud[1], mid.aud[1], hi.aud[1]).toFixed(3)}`],
        ]} />
      </Section>

      </>)}

      {tab === "sector" && (<>
      <Section heading="Sectors: who wins and loses">
        <PolicyPicker label="Policy to view" value={secP} onChange={setSecP} options={POLO} back />
        <Grid columns={2}>
          <Segmented value={secC} onChange={setSecC} options={[{ value: "au", label: "Australia" }, { value: "us", label: "\u00a0\u00a0US\u00a0\u00a0" }]} />
          <Segmented value={secY} onChange={setSecY} options={[{ value: "0", label: "Year 1" }, { value: "1", label: "Year 2" }, { value: "4", label: "Year 5" }]} />
        </Grid>
        {nMoved(sP.lv) === 0 ? (
          <Callout tone="info" lead="Nothing to show yet">{secP === "cur" ? "The current Simulator mix is 'no change', so every sector is 0 by definition. Pick a scenario, party, AI path, world or single lever in 'Policy to view', or set levers on the Simulator tab." : `${sP.label} moves no levers here (for example, a party in government is the baseline), so every sector is 0 by definition. Pick another policy to compare.`}</Callout>
        ) : sZero ? (
          <Callout tone="info" lead="Almost no effect here">{`${sP.label} barely touches ${secC === "us" ? "US" : "Australian"} industries in year ${sy + 1} (all under 0.05 points). Try the other country or a later year.`}</Callout>
        ) : sOutZero ? (
          <Callout tone="info" lead="Jobs move, output barely does">{`${sP.label} hardly changes industry output in year ${sy + 1}, but it does change jobs (see the jobs column).`}</Callout>
        ) : null}
        <Metrics metrics={[
          { label: "Showing", value: sP.label.replace(/^[^:]*: /, ""), detail: `${secC === "us" ? "US" : "Australia"}, year ${sy + 1} (${2027 + sy}), versus no change` },
          { label: "Jobs, all 13 sectors", value: jf(sJobs.reduce((a: number, b: number) => a + b, 0)), detail: aiDisp ? `Sum of the industry estimates below (people), including ${jf(aiDisp)} from AI job disruption, spread by each sector's share of jobs` : "Sum of the industry estimates below (people)" },
          { label: "Jobs, whole economy", value: jf(econJobs), detail: `From the change in unemployment (${sgn(sR.m[uKey][sy] - baseS[uKey][sy], 2)} pts) times the labour force` },
        ]} />
        <Table columns={["Sector", "Size (% GDP)", "Jobs now (000s)", "Extra growth, pts (low to high)", "Jobs effect (people)", "Main channel"]} rows={SECT.map((s: Sect, j: number) => [
          s.name, f1(secC === "us" ? s.usShare : s.auShare), (secC === "us" ? s.usJobs : s.auJobs) ? Math.round(secC === "us" ? s.usJobs : s.auJobs).toLocaleString() : "n/a (farms not in BLS payrolls)",
          `${sg(sMid[j])} (${sg(Math.min(sLo[j], sMid[j], sHi[j]))} to ${sg(Math.max(sLo[j], sMid[j], sHi[j]))})`, (secC === "us" ? s.usJobs : s.auJobs) ? jf(sJobs[j]) : "not yet sourced", s.why])} />
        <Text>{`Extra growth is points of industry output growth versus no change. Sizes: ${secC === "us" ? "BEA value added by industry, Q2 2026; jobs: BLS CES payrolls, Sep 2026; agriculture from QCEW" : "ABS national accounts 2025-26 (industry GVA); jobs: ABS Labour Force Detailed, Feb 2026"}. Low and high are half and one-and-a-half times the middle.`}</Text>
      </Section>
      <Section heading="Compare two policies on sectors">
        <Grid columns={2}>
          <PolicyPicker label="Policy A" value={secA} onChange={setSecA} options={POLO} />
          <PolicyPicker label="Policy B" value={secB} onChange={setSecB} options={POLO} />
        </Grid>
        <div data-compare="1" style={{ display: "flex", flexDirection: "column", gap: 10, color: th.text.primary, fontSize: th.font.label.fontSize }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 10, background: colA, display: "inline-block", borderRadius: 2 }} />{`A: ${cA.label}`}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 10, background: colB, display: "inline-block", borderRadius: 2 }} />{`B: ${cB.label}`}</span>
          </div>
          {SECT.map((s: Sect, j: number) => (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}><span>{s.name}</span><span style={{ color: th.text.secondary }}>{`A ${sg(fxA[j])} · B ${sg(fxB[j])} pts`}</span></div>
              {hbar(fxA[j], colA)}{hbar(fxB[j], colB)}
            </div>))}
          <div style={{ color: th.text.secondary }}>{`Bars: left = sector shrinks, right = grows, versus no change. Scale ±${f1(cmpMax)} points. ${secC === "us" ? "US" : "Australia"}, year ${sy + 1}.`}</div>
        </div>
        {(nMoved(cA.lv) === 0 || nMoved(cB.lv) === 0) && <Text>{"A policy with no levers moved (for example an empty current mix) shows no bars: that is 'no change'."}</Text>}
      </Section>
      <Section heading="Lever by sector: one lever at a time (year 2)" collapsible defaultOpen={false}>
        <Text>Each column runs one lever on its own through the engine (no Taylor reaction) and shows extra sector growth in points, for the country chosen above.</Text>
        <Table columns={["Sector", ...SLEV.map((x: { name: string; lv: Lv }) => x.name)]} rows={SECT.map((s: Sect, j: number) => [s.name, ...sMat.map((r: number[]) => sg(r[j]))])} />
      </Section>
      <Section heading="Labour market by industry" collapsible defaultOpen={true}>
        <Text>{"Rule of thumb: an industry's jobs move about 0.6 times its output (employment elasticity 0.5 to 0.7). Largest employers first, for the policy chosen above."}</Text>
        <Table columns={["Industry", "Jobs now (000s)", "Share of jobs", "Jobs effect (people)"]} rows={SECT.map((s: Sect, j: number) => ({ s, j, n: secC === "us" ? s.usJobs : s.auJobs })).filter((x: { s: Sect; j: number; n: number }) => x.n > 0).sort((a: { n: number }, b: { n: number }) => b.n - a.n).map((x: { s: Sect; j: number; n: number }) => [x.s.name, Math.round(x.n).toLocaleString(), `${f1(100 * x.n / (secC === "us" ? 159044 : 14772))}%`, jf(sJobs[x.j])])} />
        <Text>{`Totals: ${secC === "us" ? "159.0 million US payroll jobs (BLS, Sep 2026); labour force about 170.6 million" : "14.77 million employed in Australia (ABS, Feb 2026); labour force about 15.5 million"}. The 13 sectors do not cover every industry, so their sum differs from the whole-economy figure.`}</Text>
      </Section>
      </>)}
      {tab === "auhh" && <HouseholdAUTab />}
      {tab === "data" && (<>
      <Section heading="Starting data, with date and source for every number" collapsible defaultOpen={true}>
        {(() => { const now = new Date(); const age = (d: string) => Math.max(0, Math.round((now.getTime() - new Date(d + "T12:00:00").getTime()) / 86400000)); const fr = (d: string) => (age(d) <= 45 ? "Fresh" : age(d) <= 120 ? "Recent" : age(d) <= 400 ? "Ageing" : "Old");
          const n = DATA.length, fresh = DATA.filter((x: DRow) => age(x[2]) <= 45).length, recent = DATA.filter((x: DRow) => age(x[2]) > 45 && age(x[2]) <= 120).length, oldest = DATA.reduce((a: DRow, x: DRow) => (age(x[2]) > age(a[2]) ? x : a), DATA[0]);
          return (<>
            <Metrics metrics={[{ label: "Data freshness", value: `${Math.round(100 * (fresh + recent) / n)}% under 4 months`, detail: `${fresh} fresh (45 days or less), ${recent} recent, ${n - fresh - recent} older, of ${n} numbers` }, { label: "Oldest number", value: `${age(oldest[2])} days`, detail: `${oldest[0]} (${oldest[4]})` }, { label: "Checked", value: "9 Nov 2026 (refreshed rows only)", detail: "Rows not re-checked keep their own dates. As of = publication date where known, otherwise the date fetched" }]} />
            <Table columns={["Measure", "Value", "Period", "As of", "Freshness", "Source"]} rows={DATA.map((x: DRow) => [x[0], x[1], x[3], x[2], `${fr(x[2])} (${age(x[2])} days)`, x[4]])} />
          </>); })()}
        <Text>{"Still not fetched: an overall Norway surplus figure for 2026 (the model uses about 10% of GDP including oil fund income), Japan and euro-area budget totals (Road to Surplus uses approximate IMF levels, marked there), the RBA commodity price index, US and Australian house price indexes, and the US parties' own platform documents (the US presets use CBO scores and press reporting of their proposals). Where a party has no stated position the model uses the no-change baseline."}</Text>
      </Section>

      <Section heading="Anchoring check: no-change path versus official forecasts (not validation)" collapsible defaultOpen={true}>
        <Text>{"The no-change path is anchored to official 2027 forecasts, so matching them in 2027 is true by construction and is not evidence the model is accurate. Responses to policy changes are illustrative and have only been checked against the three past episodes in Backtests below. Gap = model minus the average of the forecasts shown. Close = within 0.3 points."}</Text>
        {(() => { const v = (a: number[] | undefined, i: number) => (a && a.length > i ? a[i] : NaN);
          const rows: [string, number, (number | null)[]][] = [
            ["US growth 2027", v(base.usG, 0), [1.8, 2.3, 2.1, null]], ["US growth 2028", v(base.usG, 1), [1.8, null, null, null]],
            ["US inflation 2027 (CPI; CBO PCE 2.3 + 0.4)", v(base.usPi, 0), [2.7, null, null, null]], ["US unemployment 2027", v(base.usU, 0), [4.5, null, null, null]], ["US 10-year yield 2027", v(base.y10, 0), [4.3, null, null, null]],
            ["Aus growth 2027", v(base.auG, 0), [null, 1.6, 1.7, 1.3]], ["Aus growth 2028", v(base.auG, 1), [null, null, null, 1.5]],
            ["Aus CPI 2027 (RBA Jun/Dec avg)", v(base.auPi, 0), [null, null, null, 3.2]], ["Aus CPI 2028", v(base.auPi, 1), [null, null, null, 2.45]],
            ["Aus unemployment 2027", v(base.auU, 0), [null, null, null, 4.9]], ["Aus unemployment 2028", v(base.auU, 1), [null, null, null, 5.1]], ["RBA cash rate 2027 (RBA market-path assumption, not a forecast)", v(base.rbaR, 0), [null, null, null, 4.85]]];
          const cell = (x: number | null) => (x === null ? "not published by this forecaster" : f1(x));
          return <Table columns={["Measure", "Model", "CBO Feb 2026", "IMF WEO Oct 2026", "OECD Sep 2026", "RBA Nov 2026", "Gap", "Verdict"]} rows={rows.map((r: [string, number, (number | null)[]]) => { const xs = r[2].filter((x: number | null): x is number => x !== null); const avg = xs.reduce((a: number, b: number) => a + b, 0) / xs.length; const gap = r[1] - avg;
            return [r[0], f1(r[1]), ...r[2].map(cell), `${gap >= 0 ? "+" : ""}${f1(gap)}`, Math.abs(gap) <= 0.3 ? "Close" : Math.abs(gap) <= 0.7 ? "Some gap" : "Big gap"]; })} />; })()}
        <Text>{"Year 1 is anchored (calibrated) to these forecasts, so 2027 should be close. Later years show the model's own drift: it returns to long-run trend faster than the RBA expects, so it is more optimistic on Australian jobs in 2028. The CBO forecast predates this year's oil shock."}</Text>
      </Section>

      <Section heading="Backtests: three past episodes" collapsible defaultOpen={true}>
        <Text>{"Each episode's levers are run against no change, and the model's change is compared with what was published or observed. These are rough: the past baseline and lever sizes are approximate, and three episodes cannot validate a model."}</Text>
        {(() => { const bt = BACKTESTS.map((b: BT) => { const m = run(b.lv, 1, false, 2, 1), z = run(ZERO, 1, false, 2, 1), lo = run(b.lv, 0.5, false, 2, 1), hi = run(b.lv, 1.5, false, 2, 1); const d = (o: Out) => o[b.key][b.yr] - z[b.key][b.yr]; return { b, mid: d(m), lo: Math.min(d(lo), d(m), d(hi)), hi: Math.max(d(lo), d(m), d(hi)) }; });
          return (<>
            <Table columns={["Episode", "Measure", "Model (low to high)", "Published or observed", "Error (model minus observed)", "Source"]} rows={bt.map((x) => [x.b.name, x.b.what, `${sgn(x.mid, 2)} (${sgn(x.lo, 2)} to ${sgn(x.hi, 2)})`, `${sgn(x.b.obs, 1)}: ${x.b.obsTxt}`, `${sgn(x.mid - x.b.obs, 2)} pts`, x.b.src])} />
            <BulletList items={bt.map((x) => `${x.b.name}: ${x.b.miss}`)} />
          </>); })()}
      </Section>

      <Section heading="The rules of thumb inside" collapsible defaultOpen={false}>
        <BulletList items={[
          "The no-change path starts at the latest data and drifts toward trend growth (US 2.0%, Australia 2.2%).",
          "Spending: 1% of GDP lifts growth about 1 point in year 1, then fades (CBO range 0.5 to 2.5). Tax cuts: about 0.5 (CBO 0.3 to 1.5).",
          "Tariffs: 10 points raises the US price level about 0.8% over two years (Fed/NBER near-full pass-through; Amiti, Redding & Weinstein, JEP 2019). The price level stays higher for as long as the tariff lasts; only the inflation rate fades, and prices fall back as the tariff is phased out. It also trims growth 0.25 and raises 0.45% of GDP.",
          "Central banks: a 1-point hike cuts growth 0.3 to 0.5 and inflation about 0.25 to 0.3, peaking after a year (FRB/US, RBA MARTIN, ECB and BoE models).",
          "Okun's law: each point of growth above trend lowers unemployment about half a point.",
          "Yields: each point of debt above today's level adds about 0.02 points to the 10-year yield, within a risk premium of -1 to +2.5 points (Laubach; CBO). Deficits work through debt; there is no separate deficit term.",
          "China: 1 point slower growth costs Australia about 0.3 points and the US about 0.1 (RBA; IMF spillover reports). A 10% ore shock moves China-linked demand about 0.5 points.",
          "Europe: 1 point weaker euro-area growth costs the US about 0.15 and the UK about 0.5 (IMF; OECD trade shares: the EU buys about 18% of US goods exports).",
          "Oil: 10% higher raises inflation about 0.2 to 0.3 points in the US, Australia, Europe and the UK, and cuts growth about 0.15 in oil importers; the US is a net exporter, so its hit is small (IMF WEO; Fed).",
          "Yen carry trade: when the BoJ rises versus the Fed, the yen strengthens about 4% per point. A big jump forces investors to sell borrowed-yen bets, hitting stocks and the AUD (as in August 2024).",
          "AUD: 10% on commodity prices moves it about 4%; each point the RBA rises versus the Fed adds about 3% (RBA).",
          "AI and interest rates: half of any extra AI growth is added to the 10-year yield, so faster productivity raises borrowing costs and offsets part of the budget gain.",
          "Migration: aggregate GDP moves with the number of workers; GDP per person moves much less and its sign is contested (-0.1 to +0.25 per point, middle +0.1; Productivity Commission 2016). The budget effect depends on migrant mix (low view 0.4x, high 1.6x). Housing: more people than homes raises rents 1 to 2.5% per 1% gap (middle 1.75), and supply closes about 20% of the gap a year. Not yet reconciled: at the middle setting a -0.5 point migration cut costs the budget about A$16bn a year on average over 10 years in this engine, below the $28.3bn a year estimate in the estimates block and the $275bn of extra debt reported by The Age.",
          "Taylor rule toggle: each bank moves 0.75 times its inflation gap plus 0.5 times its growth gap the next year.",
          "Stocks: a rough direction guide only, built from growth, yields and shocks. Any big oil move, up or down, takes a one-off volatility penalty in year 1. A Fed cut much larger than the BoJ's triggers the yen carry-trade channel above, so stocks can fall even though rates are cut.",
          "Debt early on: deficit-financed spending can lower US debt as a share of GDP in years 1 and 2, because the spending multiplier lifts nominal GDP faster than borrowing at first. Many official dynamic analyses show debt rising from year 1.",
          "Year-1 calibration: the no-change path starts 2027 at the average of the CBO, IMF, OECD and RBA forecasts (see Calibration check), then drifts to the long-run anchors.",
          "Policy end date: budget and tariff changes stay for the chosen number of years, then phase out in straight steps over 5 years, so nothing falls off a cliff.",
          "Taylor smoothing: with the Taylor toggle on, each bank moves only half way to the rule's rate each year, and its reaction is capped at 3 points either side of the no-change rate.",
          "Guard rails: policy rates 0 to 15%; 10-year yields 0.5 to 12% with a risk premium of -1 to +2.5 points; ageing drift on deficits capped at 1.5% of GDP; sector effects capped at 25 points; every time shape fades to a finite limit.",
          "Sectors: each industry's growth moves with the economy by its own cyclical sensitivity, plus direct channels for interest rates, oil, tariffs, China and AI. Industry jobs move about 0.6 times industry output (employment elasticity 0.5 to 0.7).",
        ]} />
      </Section>

      <Section heading="Methodology and limitations (read this first if you are new)" collapsible defaultOpen={false}>
        <NumberedList items={[
          "What it is: a teaching tool. It shows the direction and rough size of policy effects using published rules of thumb. It is not a forecast and not investment advice.",
          "How it works: a no-change path starts from the latest official data, anchored in 2027 to the average of CBO, IMF, OECD and RBA forecasts, then drifts to long-run trends. Each lever adds an effect with a published size and a time shape (fades, lags or ramps). Debt follows the standard rule: next year's debt = this year's debt x (1 + interest) / (1 + growth) + primary deficit.",
          "Same method for every party: party presets are just lever settings taken from their stated plans and costings. Where a party has no stated position, the lever stays at no change. Presets never move central-bank rates.",
          "Calibrated, not validated: the no-change path is anchored to official 2027 forecasts. Policy responses are illustrative; see Backtests for three rough checks against history.",
          "Ranges: every result is shown with a low-impact (half) and high-impact (one-and-a-half times) view, because economists disagree about the size of these effects. Effects are not always monotonic in that scale (feedbacks can offset), so each range shows the lowest and highest of the low, middle and high runs.",
          "Limitations: no financial crises, elections, wars or pandemics unless you add a shock; no state or regional detail; trade and exchange rates are simplified; sectors use fixed sensitivities, not a full input-output model; long horizons (decades) mostly show where the assumptions lead, not what will happen.",
          "Known quirk: with no change at all, US debt keeps rising for decades because the US runs a permanent primary deficit. That is the CBO's message too, not a bug.",
          "Testing: the engine is checked over every preset, party, AI scenario and extreme setting, every horizon up to 100 years, with and without the Taylor rule, for finite values, plausible ranges, no sudden jumps and steady long-run behaviour. These checks show the numbers do not break; they do not show the economics is right.",
          "Data: every starting number above has its period, publication date, freshness and source, and the same dated list is saved as one data file (econ-data-2026-11-03) for the daily briefing to use. Check the source before relying on any figure.",
        ]} />
      </Section>

      <Section heading="Sources">
        <LinkCards links={[
          { title: "The Simple Macroeconomics of AI (Acemoglu 2024)", site: "NBER", href: "https://www.nber.org/papers/w32487" },
          { title: "The economic potential of generative AI", site: "McKinsey", href: "https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier" },
          { title: "Generative AI could raise global GDP by 7%", site: "Goldman Sachs", href: "https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent" },
          { title: "The Projected Impact of Generative AI on Future Productivity Growth (Sep 2025)", site: "Penn Wharton Budget Model", href: "https://budgetmodel.wharton.upenn.edu/p/2025-09-08-the-projected-impact-of-generative-ai-on-future-productivity-growth/" },
          { title: "Artificial Intelligence and Its Potential Effects on the Economy and the Federal Budget (Dec 2024)", site: "CBO", href: "https://www.cbo.gov/publication/61147" },
          { title: "Budget Paper No. 1, 2026-27", site: "Australian Treasury", href: "https://budget.gov.au/content/bp1/download/bp1_2026-27.pdf" },
          { title: "Government deficit and debt, 2025 (EDP release)", site: "Eurostat", href: "https://ec.europa.eu/eurostat/web/products-euro-indicators/w/2-21102026-ap" },
          { title: "Unemployment, Sep 2026", site: "Eurostat", href: "https://ec.europa.eu/eurostat/en/web/products-euro-indicators/w/3-30102026-bp" },
          { title: "China CPI, Sep 2026", site: "NBS China", href: "https://www.stats.gov.cn/english/PressRelease/202610/t20261015_1965500.html" },
          { title: "UK consumer price inflation, Sep 2026", site: "ONS", href: "https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/consumerpriceinflation/september2026" },
          { title: "Policy rate", site: "Sveriges Riksbank", href: "https://www.riksbank.se/en-gb/statistics/interest-rates-and-exchange-rates/policy-rate-deposit-and-lending-rate/" },
          { title: "Policy rate", site: "Norges Bank", href: "https://www.norges-bank.no/en/topics/Monetary-policy/Policy-rate/" },
          { title: "MPC statement, 7 Oct 2026", site: "Central Bank of Iceland", href: "https://cb.is/news-and-publications/article/statement-of-the-monetary-policy-committee-october-7-2026" },
          { title: "Rate increase, 10 Sep 2026", site: "Danmarks Nationalbank", href: "https://www.nationalbanken.dk/da/viden-og-nyheder/presse/arkiv/2026/renteforhoejelse-10-09-2026" },
          { title: "Gen-AI: Artificial intelligence and the future of work", site: "IMF", href: "https://www.imf.org/en/Publications/Staff-Discussion-Notes/Issues/2024/01/14/Gen-AI-Artificial-Intelligence-and-the-Future-of-Work-542379" },
          { title: "Harnessing data and digital technology", site: "Productivity Commission", href: "https://www.pc.gov.au" },
          { title: "Future Fund history", site: "Future Fund", href: "https://www.futurefund.gov.au" },
          { title: "Housing supply and zoning (Glaeser and Gyourko)", site: "Journal of Economic Perspectives", href: "https://www.aeaweb.org/articles?id=10.1257/jep.32.1.3" },
          { title: "Auckland upzoning and housing supply", site: "University of Auckland", href: "https://www.journals.elsevier.com/journal-of-urban-economics" },
          { title: "Sector-based training evidence", site: "MDRC / Economic Mobility Corp", href: "https://www.mdrc.org" },
          { title: "Childcare inquiry", site: "Productivity Commission", href: "https://www.pc.gov.au/inquiries-and-research/childhood" },
          { title: "Options for Reducing the Deficit", site: "CBO", href: "https://www.cbo.gov/topics/budget/options-reducing-deficit" },
          { title: "Debt Fixer and deficit plans", site: "CRFB", href: "https://www.crfb.org" },
          { title: "Fiscal Monitor", site: "IMF", href: "https://www.imf.org/en/Publications/FM" },
          { title: "Intergenerational Report", site: "Australian Treasury", href: "https://treasury.gov.au/intergenerational-report" },
          { title: "Election commitments costings", site: "Parliamentary Budget Office", href: "https://www.pbo.gov.au" },
          { title: "Midterm economy guide (party proposals)", site: "CNBC", href: "https://www.cnbc.com/guide/midterm-elections-economy-affordability/" },
          { title: "Democratic affordability bills", site: "SmartAsset", href: "https://smartasset.com/financial-advisor/midterm-election-what-parties-are-proposing-to-bring-down-inflation" },
          { title: "Coalition savings and tax plan, 26 Oct 2026", site: "Liberal Party", href: "https://www.liberal.org.au/2026/10/26/coalition-will-cut-labors-waste-cut-taxes-and-tackle-the-cost-of-living" },
          { title: "Greens tax-free threshold plan (PBO costing)", site: "ABC News", href: "https://www.abc.net.au/news/2026-10-27/greens-leader-proposes-tax-cut-and-welfare-boost/107315572" },
          { title: "One Nation defence target cost (PBO)", site: "Sydney Morning Herald", href: "https://www.smh.com.au/politics/federal/pauline-hanson-s-defence-spending-boost-would-cost-extra-225b-budget-office-says-20260621-p608p2.html" },
          { title: "One Nation migration plan and debt", site: "The Age", href: "https://www.theage.com.au/politics/federal/how-one-nation-s-negative-migration-plans-would-drive-up-debt-by-275b-20261018-p61575.html" },
          { title: "One Nation cost-of-living policies cost", site: "AFR", href: "https://www.afr.com/policy/economy/one-nation-s-cost-of-living-policies-could-cost-budget-90b-20260706-p60cw4" },
          { title: "Australian party policy tracker", site: "Election Tracker", href: "https://electiontracker.au/elections/federal/49/policies/tax-budget" },
          { title: "FRED economic data (GDP, CPI, jobs, rates, FX, oil)", site: "St. Louis Fed", href: "https://fred.stlouisfed.org" },
          { title: "Budget and Economic Outlook 2026 to 2036", site: "CBO", href: "https://www.cbo.gov/publication/62105" },
          { title: "Long-term budget data, Feb 2026 (annual_fy_2026-02)", site: "CBO (GitHub)", href: "https://github.com/US-CBO/cbo-data/blob/main/data/budget/long_term_budget/annual_fy_2026-02.csv" },
          { title: "Europe Brent Spot Price FOB, daily and annual", site: "EIA", href: "https://www.eia.gov/dnav/pet/hist/RBRTED.htm" },
          { title: "Front-month ICE Brent settles at $92.57 (9 Nov 2026)", site: "Dow Jones via Morningstar", href: "https://www.morningstar.com/news/dow-jones/202611099164/front-month-ice-brent-crude-fell-585-to-settle-at-9257-data-talk" },
          { title: "Daily Treasury par yield curve rates, 2026", site: "US Treasury", href: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/2026/all?type=daily_treasury_yield_curve&field_tdr_date_value=2026&page&_format=csv" },
          { title: "Monetary policy decision, 3 Nov 2026", site: "RBA", href: "https://www.rba.gov.au/media-releases/2026/mr-26-30.html" },
          { title: "Statement on Monetary Policy, Nov 2026", site: "RBA", href: "https://www.rba.gov.au/publications/smp/2026/nov/economic-conditions.html" },
          { title: "China GDP, Q3 2026", site: "NBS China", href: "https://www.stats.gov.cn/english/PressRelease/202610/t20261021_1965671.html" },
          { title: "Euro area GDP flash, Q3 2026", site: "Eurostat", href: "https://ec.europa.eu/eurostat/en/web/products-euro-indicators/w/2-30102026-ap" },
          { title: "Euro area inflation flash, Oct 2026", site: "Eurostat", href: "https://ec.europa.eu/eurostat/web/products-euro-indicators/w/2-04112026-ap" },
          { title: "ECB deposit facility rate", site: "ECB Data Portal", href: "https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.DFR.LEV?lastNObservations=1&format=csvdata" },
          { title: "China CPI and PPI, Oct 2026", site: "NBS China", href: "https://www.stats.gov.cn/sj/zxfbhjd/202611/t20261109_1965796.html" },
          { title: "BoJ statement, 30 Oct 2026", site: "Bank of Japan", href: "https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k261030a.pdf" },
          { title: "Japan CPI, Sep 2026", site: "Statistics Bureau of Japan", href: "https://www.stat.go.jp/data/cpi/sokuhou/tsuki/pdf/zenkoku.pdf" },
          { title: "Monetary Policy Summary, Nov 2026", site: "Bank of England", href: "https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/november-2026" },
          { title: "Fiscal multipliers", site: "CBO", href: "https://www.cbo.gov/publication/45580" },
          { title: "Tariff price effects", site: "NBER (Amiti, Redding, Weinstein)", href: "https://www.nber.org/papers/w25672" },
          { title: "Policy rules (Taylor rule)", site: "Federal Reserve", href: "https://www.federalreserve.gov/monetarypolicy/policy-rules-and-how-policymakers-use-them.htm" },
          { title: "MARTIN model", site: "RBA", href: "https://www.rba.gov.au/publications/rdp/2019/2019-07.html" },
          { title: "World Economic Outlook and spillover analysis", site: "IMF", href: "https://www.imf.org/en/Publications/WEO" },
          { title: "OECD Economic Outlook", site: "OECD", href: "https://www.oecd.org/economic-outlook/" },
          { title: "GDP first quarterly estimate, Apr to Jun 2026", site: "ONS", href: "https://www.ons.gov.uk/economy/grossdomesticproductgdp/bulletins/gdpfirstquarterlyestimateuk/apriltojune2026" },
          { title: "Labour market overview, Oct 2026", site: "ONS", href: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/october2026" },
          { title: "Public sector finances, Sep 2026", site: "ONS", href: "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/bulletins/publicsectorfinances/september2026" },
          { title: "National accounts (mainland GDP), Q2 2026", site: "Statistics Norway", href: "https://www.ssb.no/en/nasjonalregnskap-og-konjunkturer/nasjonalregnskap/statistikk/nasjonalregnskap" },
          { title: "Key figures in the National Budget for 2027", site: "Government of Norway", href: "https://www.regjeringen.no/en/whats-new/key-figures-in-the-national-budget-for-2027/id3174610/" },
          { title: "National accounts (GDP)", site: "Statistics Denmark", href: "https://www.dst.dk/en/Statistik/emner/oekonomi/nationalregnskab/noegletal-for-nationalregnskabet-bnp" },
          { title: "National accounts, Q2 2026", site: "Statistics Iceland", href: "https://www.statice.is/publications/news-archive/national-accounts/national-accounts-2nd-quarter-2026/" },
          { title: "Budget bill 2027: fiscal deficits end", site: "Government of Iceland", href: "https://www.government.is/news/article/prolonged-period-of-fiscal-deficits-comes-to-an-end-in-the-budget-bill/" },
          { title: "Seaborne iron ore index, 9 Nov 2026", site: "Mysteel", href: "https://www.mysteel.net/analysis/5148123-daily-seaborne-iron-ore-index-edges-lower-amid-subdued-market-sentiment" },
          { title: "Statement on Monetary Policy, Nov 2026: forecast table", site: "RBA", href: "https://www.rba.gov.au/publications/smp/2026/nov/outlook.html" },
          { title: "World Economic Outlook, Oct 2026", site: "IMF", href: "https://www.imf.org/en/publications/weo/issues/2026/10/13/world-economic-outlook-october-2026" },
          { title: "Interim Economic Outlook, Sep 2026", site: "OECD", href: "https://www.oecd.org/en/publications/oecd-economic-outlook-interim-report-september-2026_f751d02b-en/full-report.html" },
          { title: "Value added by industry as % of GDP, Q2 2026 (BEA)", site: "FRED", href: "https://fred.stlouisfed.org/release/tables?eid=211&rid=331" },
          { title: "Payrolls by industry (CES Table B-1), Sep 2026", site: "BLS", href: "https://www.bls.gov/news.release/empsit.t17.htm" },
          { title: "Australian System of National Accounts 2025-26 (GVA by industry)", site: "ABS", href: "https://www.abs.gov.au/statistics/economy/national-accounts/australian-system-national-accounts/latest-release" },
          { title: "Labour Force, Detailed (employment by industry)", site: "ABS", href: "https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia-detailed/latest-release" },
          { title: "Disentangling the effects of the 2018-2019 tariffs (Flaaen and Pierce)", site: "Federal Reserve", href: "https://www.federalreserve.gov/econres/feds/disentangling-the-effects-of-the-2018-2019-tariffs-on-a-globally-connected-us-manufacturing-sector.htm" },
          { title: "Retaliatory tariffs and US agriculture", site: "USDA ERS", href: "https://www.ers.usda.gov/publications/pub-details?pubid=104715" },
          { title: "Electricity demand and data centres", site: "EIA", href: "https://www.eia.gov/electricity/" },
          { title: "Structural analysis (STAN) database", site: "OECD", href: "https://www.oecd.org/en/data/datasets/structural-analysis-stan-database.html" },
          { title: "National accounts by industry", site: "Eurostat", href: "https://ec.europa.eu/eurostat/web/national-accounts" },
          { title: "Tourism Research Australia", site: "Austrade", href: "https://www.tra.gov.au" },
          { title: "Okun's law", site: "St. Louis Fed", href: "https://www.stlouisfed.org/publications/regional-economist/january-2012/okuns-law" },
        ]} />
      </Section>
      </>)}
      <BackToTop />
      {!narrow && <Floating edge="top" bar>
        <Select label="Go to" value={tab} onChange={(v: string) => setTab(v)} options={TABS} />
      </Floating>}
    </Page>
  );
}

type Occ = { id: string; label: string; income: number; src: string; notes: string };
const OCCS: Occ[] = [
  { id: "elec", label: "Electrician (licensed tradie)", income: 104455, src: "ATO Taxation Statistics 2022–23, Table 15A, median taxable income, 341111 Electrician (general)", notes: "Instant asset write-off applies if self-employed; Key Apprenticeship Program applies to apprentices only." },
  { id: "appr", label: "Apprentice, housing construction trade", income: 42878, src: "No ATO occupation median for apprentices. Default uses the median for delivery drivers (732111) as a stand-in for a lower trade wage, so edit it", notes: "Key Apprenticeship Program: $10,000 in $2,000 payments at 6, 12, 24 and 36 months and at completion (from 1 July 2025)." },
  { id: "nurse", label: "Hospital worker, registered nurse", income: 76690, src: "ATO 2022–23 Table 15A, 254499 Registered nurse – other", notes: "Penalty rates and award wages are set by the Fair Work Commission, not by these platforms." },
  { id: "allied", label: "Hospital worker, allied health (physio)", income: 77631, src: "ATO 2022–23 Table 15A, 252511 Physiotherapist", notes: "" },
  { id: "rmo", label: "Doctor, resident medical officer (HELP debt)", income: 120600, src: "ATO 2022–23 Table 15A, 253112 Medical officer – resident", notes: "HELP repayment rules apply. Enter your HELP balance below." },
  { id: "gp", label: "Doctor, general practitioner", income: 151936, src: "ATO 2022–23 Table 15A, 253111 General practice", notes: "" },
  { id: "teach", label: "Teacher, secondary", income: 94058, src: "ATO 2022–23 Table 15A, 241411 Secondary school teacher", notes: "" },
  { id: "teachp", label: "Teacher, primary", income: 83152, src: "ATO 2022–23 Table 15A, 241213 Primary school teacher", notes: "" },
  { id: "retail", label: "Retail worker", income: 33825, src: "ATO 2022–23 Table 15A, 621111 Retail assistant – general", notes: "Many retail workers are part-time, so the median reflects hours as well as pay." },
  { id: "hosp", label: "Hospitality worker (bar or barista)", income: 36745, src: "ATO 2022–23 Table 15A, 431111 Bar attendant", notes: "" },
  { id: "gig", label: "Gig or delivery worker", income: 42878, src: "ATO 2022–23 Table 15A, 732111 Delivery driver (closest ATO category; gig platform work is not separately coded)", notes: "Sole traders can use the instant asset write-off." },
  { id: "farm", label: "Farmer (beef cattle)", income: 59883, src: "ATO 2022–23 Table 15A, 121312 Beef cattle farmer", notes: "Farm income is volatile, so medians vary a lot year to year." },
  { id: "smb", label: "Small business owner", income: 47326, src: "No occupation median. Default is the ATO 2022–23 average taxable income of returns with a blank occupation code, so edit it", notes: "Instant asset write-off and the Coalition's 2025 Entrepreneurship Accelerator apply." },
  { id: "student", label: "University student", income: 21986, src: "No occupation median. Default is the ATO 2022–23 median for returns with a blank occupation code, so edit it", notes: "HELP debt: the Greens proposed wiping it; Labor's 20% cut was applied in 2025." },
  { id: "retiree", label: "Retiree or pensioner", income: 21986, src: "No occupation median. Default is the same blank-code median, so edit it. Age Pension recipients are exempt from the new 30% minimum capital gains tax", notes: "WATO and the $1,000 deduction need labour income (wages, salary, parental leave pay), so labour income defaults to $0 for this profile. Enter any wages in the labour income box." },
];

const HORIZONS = [
  { id: "2", label: "2 years", years: 2 },
  { id: "3", label: "3 years (one full term)", years: 3 },
  { id: "4", label: "4 years (PBO forward estimates)", years: 4 },
];
const FY_AU = ["2026–27", "2027–28", "2028–29", "2029–30"];

function incomeTax(inc: number, low: number): number {
  if (inc <= 18200) return 0;
  let t = Math.min(inc, 45000) - 18200;
  t = t * low;
  if (inc > 45000) t += (Math.min(inc, 135000) - 45000) * 0.30;
  if (inc > 135000) t += (Math.min(inc, 190000) - 135000) * 0.37;
  if (inc > 190000) t += (inc - 190000) * 0.45;
  return t;
}
function marginal(inc: number, low: number): number {
  if (inc <= 18200) return 0;
  if (inc <= 45000) return low;
  if (inc <= 135000) return 0.30;
  if (inc <= 190000) return 0.37;
  return 0.45;
}
// HELP 2026-27 (ATO): nil to $69,528; 15c per $ to $129,717; then $9,028 + 17c; 10% of total income from $186,051 (marginal rate 10% there)
function helpRate(inc: number): number { return inc <= 69528 ? 0 : inc <= 129717 ? 0.15 : inc < 186051 ? 0.17 : 0.10; }
// Medicare levy 2025-26 (ATO): nil to the lower threshold, 10% of income above it until 2% of income applies (upper threshold). SAPTO thresholds for seniors and pensioners.
function medicare(inc: number, senior: boolean): number { const lo = senior ? 44268 : 28011; return inc <= lo ? 0 : Math.min(0.1 * (inc - lo), 0.02 * inc); }
function medicareRate(inc: number, senior: boolean): number { const lo = senior ? 44268 : 28011, hi = senior ? 55335 : 35013; return inc <= lo ? 0 : inc < hi ? 0.1 : 0.02; }
const moneyAU = (n: number) => (n < 0 ? "−$" : "$") + Math.round(Math.abs(n)).toLocaleString("en-AU");

function HouseholdAUTab() {
  const [occ, setOcc] = useState<string>("nurse");
  const o = OCCS.find((x: Occ) => x.id === occ) as Occ;
  const [incStr, setIncStr] = useState<string>("");
  const [labStr, setLabStr] = useState<string>("");
  const income = incStr.trim() === "" ? o.income : Math.max(0, Number(incStr) || 0);
  const [hz, setHz] = useState<string>("3");
  const years = HORIZONS.find((h) => h.id === hz)!.years;
  const [growth, setGrowth] = useState<string>("3");
  const [helpStr, setHelpStr] = useState<string>("0");
  const [ccStr, setCcStr] = useState<string>("0");
  const [family, setFamily] = useState<string>("single");
  const [housing, setHousing] = useState<string>("rent");
  const [state, setState] = useState<string>("NSW");
  const [area, setArea] = useState<string>("metro");
  const [age, setAge] = useState<string>("25-44");
  const helpDebt = Math.max(0, Number(helpStr) || 0);
  const childcare = Math.max(0, Number(ccStr) || 0);
  const g = (Number(growth) || 0) / 100;
  const noLabourDefault = ["retiree", "student", "smb"].includes(occ);
  const labour = Math.min(income, labStr.trim() === "" ? (noLabourDefault ? 0 : income) : Math.max(0, Number(labStr) || 0));
  const isAppr = occ === "appr";
  const senior = occ === "retiree"; // retiree profile uses the SAPTO Medicare thresholds

  const calc = useMemo(() => {
    const rows: { fy: string; inc: number; labMid: number; labLow: number; labHigh: number; avgRate: number; emtr: number }[] = [];
    for (let i = 0; i < years; i++) {
      const inc = income * Math.pow(1 + g, i);
      const low = i === 0 ? 0.15 : 0.14;
      const cut = incomeTax(inc, 0.16) - incomeTax(inc, low);
      const lab = labour * Math.pow(1 + g, i);
      const dedAmt = occ === "smb" ? 0 : Math.min(1000, lab);
      const ded = dedAmt * marginal(inc, low);
      const netLab = Math.max(0, lab - dedAmt);
      const wato = i >= 1 && netLab > 18200 ? Math.min(250, incomeTax(netLab, low)) : 0;
      const appr = isAppr ? [2000, 2000, 2000, 2000][i] : 0;
      const t = incomeTax(inc, low) + medicare(inc, senior) - wato;
      const emtr = marginal(inc, low) + medicareRate(inc, senior) + (helpDebt > 0 ? helpRate(inc) : 0);
      rows.push({ fy: FY_AU[i], inc, labLow: cut + wato + appr, labMid: cut + wato + appr + ded / 2, labHigh: cut + wato + appr + ded, avgRate: inc > 0 ? t / inc : 0, emtr });
    }
    return rows;
  }, [income, labour, occ, years, g, isAppr, helpDebt, senior]);

  const sum = (k: "labLow" | "labMid" | "labHigh") => calc.reduce((a, r) => a + r[k], 0);
  const greensLow = helpDebt;
  const greensHigh = helpDebt + childcare * years;
  const greens26 = Math.min(Math.max(income - 18200, 0), 26000 - 18200) * 0.14; // 2026 proposal: tax-free threshold to $26,000 at the 14% rate

  const coalitionUCB = [-5.7, -4.8, 7.5, 9.5]; // PBO underlying cash balance sign (+ = improves); shown as + = cost
  const coalYrs = Math.min(years, 3);
  const coalH = coalitionUCB.slice(1, 1 + coalYrs).reduce((a, b) => a + b, 0);

  return (
    <>
      <TableOfContents items={[{ label: "Your profile" }, { label: "Time frame" }, { label: "1. Take-home pay" }, { label: "2. Cost of living" }, { label: "3. Jobs and wages evidence" }, { label: "4. Budget and debt" }, { label: "Policies by party" }, { label: "Range of expert views" }, { label: "Factors you may not have considered" }, { label: "Methodology and limitations" }, { label: "Learn more" }, { label: "Ideas to reduce bias further" }, { label: "Sources" }]} />

      <Callout tone="info" lead="What this covers, as of 9 Nov 2026">The next federal election is due by 2028. 2026 proposals have been announced (Coalition 26 Oct; Greens 27 to 28 Oct) and are shown as separate rows labelled "proposal". The totals still use the latest written platforms with independent costings, from the 2025 election (PBO 2025 Election Commitments Report), plus Labor's laws passed since then as the governing party; those 2025 platforms are kept as history. One Nation has one PBO-analysed item (defence to 3.5% of GDP, +$225bn over 10 years, SMH 21 Jun 2026) and no PBO costing of its household measures, so those are listed as uncosted.</Callout>

      <Section heading="Your profile">
        <Grid columns={3}>
          <Select label="Occupation" value={occ} onChange={(v: string) => { setOcc(v); setIncStr(""); setLabStr(""); }} options={OCCS.map((x: Occ) => ({ value: x.id, label: x.label }))} />
          <Input label={"Taxable income, $ a year (default " + moneyAU(o.income) + ")"} type="number" value={incStr} placeholder={String(o.income)} onChange={(v: string) => setIncStr(v)} />
          <Input label={"Labour income (wages, salary), $ a year (default " + moneyAU(noLabourDefault ? 0 : income) + ")"} type="number" value={labStr} placeholder={String(noLabourDefault ? 0 : income)} onChange={(v: string) => setLabStr(v)} />
          <Input label="Expected wage growth, % a year (your assumption)" type="number" value={growth} onChange={(v: string) => setGrowth(v)} />
          <Input label="HELP (student loan) balance, $" type="number" value={helpStr} onChange={(v: string) => setHelpStr(v)} />
          <Input label="Childcare out-of-pocket cost, $ a year" type="number" value={ccStr} onChange={(v: string) => setCcStr(v)} />
          <Select label="Family" value={family} onChange={(v: string) => setFamily(v)} options={[{ value: "single", label: "Single, no kids" }, { value: "couple", label: "Couple, no kids" }, { value: "couple1", label: "Couple, 1 child" }, { value: "couple2", label: "Couple, 2+ children" }, { value: "sole", label: "Single parent" }]} />
          <Select label="Housing" value={housing} onChange={(v: string) => setHousing(v)} options={[{ value: "rent", label: "Renter" }, { value: "mortgage", label: "Owner with mortgage" }, { value: "own", label: "Owner, no mortgage" }, { value: "investor", label: "Also owns an investment property" }]} />
          <Select label="State or territory" value={state} onChange={(v: string) => setState(v)} options={["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]} />
          <Select label="Area" value={area} onChange={(v: string) => setArea(v)} options={[{ value: "metro", label: "Capital city" }, { value: "regional", label: "Regional or remote" }]} />
          <Select label="Age group" value={age} onChange={(v: string) => setAge(v)} options={["Under 25", "25-44", "45-64", "65+"]} />
        </Grid>
        <Text>{"Default income source: " + o.src + ". " + (o.notes ? o.notes : "")}</Text>
        <Text>Family, housing, state, area and age don't change the dollar totals. Federal platforms rarely cost policies by household type, so these choices add the notes below instead.</Text>
        <Rows rows={[
          { title: "Family: " + ({ single: "single, no kids", couple: "couple, no kids", couple1: "couple, 1 child", couple2: "couple, 2+ children", sole: "single parent" } as Record<string, string>)[family], detail: family === "single" ? "Figures are for one taxpayer, which matches your profile." : family === "couple" ? "Figures are for one taxpayer. Tax is assessed per person, so run each partner's income separately." : "Figures are for one taxpayer. Enter your childcare out-of-pocket cost above: the Greens' free childcare (PBO-costed) counts it, and the Coalition's $100m regional flexible childcare is a program, not a per-household payment. Family Tax Benefit, Child Care Subsidy and parental leave depend on family income tests, which this tool doesn't model.", meta: "Section 1 and 2" },
          { title: "State or territory: " + state, detail: "Only federal platforms are compared. " + state + " state taxes, stamp duty and energy prices are excluded and differ by state.", meta: "Not modelled" },
          { title: "Area: " + (area === "regional" ? "regional or remote" : "capital city"), detail: area === "regional" ? "Regional measures in the platforms: Coalition $100m regional flexible childcare and $100m for 200 regional GPs (2025); Dr Helen Haines' 15 regional commitments (PBO report, none are household tax or payment changes). Fuel excise matters more where people drive further." : "The regional measures (Coalition regional childcare and GPs; Dr Helen Haines' regional commitments) are aimed at regional areas, not capital cities.", meta: "Section 2" },
          { title: "Age group: " + age, detail: age === "65+" ? "Age Pension recipients are exempt from the new 30% minimum capital gains tax. WATO and the $1,000 deduction need labour income, so they don't apply if you have none." : age === "Under 25" ? "If you studied, enter your HELP balance above: the Greens' plan would wipe it (PBO-costed), and Labor's HELP changes affect your marginal rate." : "No age-specific measure in these platforms for this group.", meta: "Section 1" },
        ]} />
      </Section>

      <Section heading="Time frame">
        <Segmented value={hz} onChange={(v: string) => setHz(v)} options={HORIZONS.map((h) => ({ value: h.id, label: h.label }))} />
        <Text>A federal parliamentary term runs up to 3 years, and elections often come earlier. A 2-year view is most of one term. A 4-year view runs past the next election, so policies in it could change. The PBO's forward estimates cover 4 financial years. Household figures here start in 2026–27, the current financial year.</Text>
      </Section>

      <Section heading="1. Take-home pay">
        <Table columns={["Party", "Change over " + years + " yrs", "Range", "How sure"]} rows={[
          ["Coalition (2025 platform)", "$0 in this window", "$0", "Its costed household measures (Cost of Living Tax Offset up to $1,200; fuel excise halved) applied to 2025–26 only"],
          ["Greens (2025 platform)", moneyAU(greensLow) + " HELP debt removed (one-off)", moneyAU(greensLow) + " to " + moneyAU(greensHigh) + " incl. free childcare", "PBO-costed proposal, not enacted; dental, rent freeze and other items not costed per household. Childcare figure = your yearly out-of-pocket cost × years selected; assumes a child in care for every year and care within 50 hrs/week (PBO ECR-2025-3025, ongoing, costed to 2035–36). A 2025 proposal, not law; any start would follow a future election."],
          ["Coalition (2026 proposal, 26 Oct)", "$0 in this window", "n/a", "Proposal; party costing (not PBO). The Tax Back Guarantee ($250 rising to $500, $750, $1,000) replaces WATO ($250) from 2029–30 (party Table 1), so it changes nothing to 2028–29. Not in totals."],
          ["Greens (2026 proposal, 27 Oct)", "Up to " + moneyAU(greens26) + " a year once in effect", "n/a", "Proposal; PBO costing ($22bn a year, ABC 27 Oct 2026). Tax-free threshold to $26,000: up to $1,092 a year ((26,000 − 18,200) × 14%). No start date set, so not in totals."],
          ["Independent (Dr Helen Haines, Indi)", "Not modelled", "n/a", "15 regional commitments in PBO report; none are household tax or payment changes"],
          ["Labor (governing; enacted law)", moneyAU(sum("labMid")), moneyAU(sum("labLow")) + " to " + moneyAU(sum("labHigh")), "Enacted law; includes WATO; range is how much of the $1,000 deduction you'd use"],
          ["One Nation", "Uncosted", "n/a", "No PBO costing; excluded from totals"],
        ]} />
        <Table columns={["Year", "Income", "Labor tax change (mid)", "Average tax rate", "Effective marginal rate"]} rows={calc.map((r) => [r.fy, moneyAU(r.inc), moneyAU(r.labMid), (r.avgRate * 100).toFixed(1) + "%", (r.emtr * 100).toFixed(0) + "%"])} />
        <Text>Labor's figures are compared with the old 16% rate. The 2026–27 rate is 15%, then 14% from 2027–28. They include the Working Australians Tax Offset (up to $250 from 2027–28) and the $1,000 instant work-expense deduction from 2026–27. Both use the labour income you enter, not total income (ATO). The deduction is the lower of $1,000 and your labour income, and it isn't available on business income only, so it is $0 for the small business owner profile. The offset needs net labour income (labour income minus the deduction) above the $18,200 tax-free threshold and can't exceed the tax on that income. The deduction is worth $0 if you already claim $1,000 or more in expenses, and up to its full amount times your marginal rate if you claim nothing, so the middle figure assumes half. Retiree, student and small business profiles default to $0 labour income; enter yours if you have wages. Apprentice payments are included for the apprentice profile, assuming the apprenticeship started 1 July 2025.</Text>
        <Text>Bracket creep: the thresholds aren't indexed, so the average tax rate rises as wages grow. The effective marginal rate adds the 2% Medicare levy and, if you have a HELP balance, the HELP repayment rate for 2026–27 (15% above $69,528, 17% above $129,717, then 10% of total income from $186,051). The Medicare levy uses the 2025–26 low-income thresholds ($28,011 to $35,013, phased in at 10%; $44,268 to $55,335 for the retiree profile under SAPTO).</Text>
      </Section>

      <Section heading="2. Cost of living">
        <Table columns={["Area", "Coalition (2025)", "Greens (2025)", "Labor (enacted)", "One Nation"]} rows={[
          ["Energy", "Gas reservation; nuclear plan (no household bill costing)", "No new coal and gas (no household bill costing)", "$150 bill rebate ended 31 Dec 2025", "Uncosted"],
          ["Housing", "Housing Infrastructure Program (PBO-costed, supply side)", "2-year rent freeze, then 2% cap per 2 years (uncosted per household)", "Negative gearing limited to new builds; CGT discount replaced by indexation plus a 30% minimum tax from 1 July 2027. Treasury: house price growth about 2% lower, rents about $2 a week higher", "Uncosted"],
          ["Childcare", "$100m regional flexible childcare", "Free childcare (PBO-costed; your saving = your out-of-pocket cost)", "No new measure in this window found", "Uncosted"],
          ["Health", "$100m for 200 regional GPs", "Dental and mental health in Medicare (PBO-costed nationally, not per household)", "No household figure computed", "Uncosted"],
          ["Fuel", "Excise halved 25c/L for 12 months from 1 Jul 2025 (about $14 a week for a one-car household)", "n/a", "n/a", "Proposed halving (uncosted)"],
        ]} />
        <Text>{housing === "investor" ? "Your profile owns an investment property. Under enacted law, properties held before 7:30pm AEST on 12 May 2026 keep negative gearing, and gains accrued before 1 July 2027 keep the 50% discount." : housing === "rent" ? "Your profile rents. Treasury's estimate of the enacted housing tax changes is rents about $2 a week higher; the Greens' rent freeze would apply only to rent increases." : "Your profile owns a home. Treasury's estimate is house price growth about 2% lower over the next few years from the enacted changes."}</Text>
      </Section>

      <Section heading="3. Jobs and wages evidence">
        <Rows rows={[
          { title: "Housing tax changes (Labor, enacted)", detail: "Treasury: 35,000 fewer dwellings over a decade, offset by about 65,000 from supply measures; 75,000 more owner-occupiers. HIA-commissioned modelling: tens of thousands fewer homes and 3,000–4,300 fewer construction jobs.", meta: "Range: Treasury vs HIA" },
          { title: "Apprenticeship incentive (Labor, enacted)", detail: "$10,000 per housing-construction apprentice. No independent estimate of effects on completions was found.", meta: "Low certainty" },
          { title: "Coalition public service cut (2025)", detail: "PBO-costed natural attrition of APS jobs; no independent wage modelling.", meta: "Costed, effects not modelled" },
          { title: "Greens tycoon and billionaire taxes (2025)", detail: "PBO-costed revenue. No independent modelling of effects on investment or jobs was found.", meta: "Costed, effects not modelled" },
          { title: "Penalty rates and award wages", detail: "Set by the Fair Work Commission, not changed by these platforms.", meta: "Fact" },
        ]} />
      </Section>

      <Section heading="4. Budget and debt">
        <Table columns={["Party (2025 platform vs PEFO; + = cost)", "4-yr forward estimates", "To 2035–36", "Gross debt 2035–36", "Debt interest"]} rows={[
          ["Coalition", "−$6.6bn", "+$135.6bn", "+$147.3bn ($1.7tn, 35.1% of GDP)", "+$21.6bn"],
          ["Greens", "+$5.2bn", "+$343.1bn", "+$703.0bn ($2.2tn, 46.9% of GDP)", "+$136.4bn"],
          ["Labor", "−$1.0bn", "−$4.4bn", "−$1.9bn ($1.5tn, 31.9% of GDP)", "Not materially different"],
          ["One Nation", "Uncosted", "Uncosted", "n/a", "n/a"],
        ]} />
        <Text>{"Selected horizon (" + years + " yrs): the PBO publishes year-by-year figures for the Coalition. From 2026–27, to match the household figures, they add up to " + (-coalH >= 0 ? "+" : "−") + "$" + Math.abs(coalH).toFixed(1) + "bn over " + coalYrs + (coalYrs === 1 ? " year" : " years") + " (2026–27 to " + ["2026–27", "2027–28", "2028–29"][coalYrs - 1] + ")." + (years === 4 ? " 2029–30 is not published year by year: it is only in the PBO medium-term total to 2035–36." : "") + " The chart also shows 2025–26, which is outside this window. For Labor and the Greens, only the 4-year and medium-term totals are shown. Sign convention, as in the estimates block: + = cost to the budget (a worse underlying cash balance, more debt or more interest); − = saving. Intergenerational effect: higher debt means more interest paid by future taxpayers, shown in the last column."}</Text>
        <Text>Current baseline: 2026–27 Budget deficit $31.5bn (1.0% of GDP); net debt 19.9% and gross debt 34.0% of GDP at 30 June 2027 (Budget Paper No. 1, 12 May 2026).</Text>
        <ColumnSeries labels={["2025–26 (outside window)", "2026–27", "2027–28", "2028–29"]} series={[{ name: "Coalition yearly budget cost, $bn (+ = cost)", values: coalitionUCB.map((v: number) => -v) }]} />
      </Section>

      <Section heading="Policies by party">
        <Table columns={["Party", "Policy", "Status", "In totals?"]} rows={[
          ["Coalition", "Cost of Living Tax Offset up to $1,200 (2025–26)", "PBO-costed, not enacted", "Yes (outside window)"],
          ["Coalition", "Fuel excise halved for 12 months", "PBO-costed, not enacted", "Yes (outside window)"],
          ["Coalition", "Instant asset write-off $30,000, permanent, turnover under $10m", "Party document", "No (business timing benefit)"],
          ["Coalition", "Entrepreneurship Accelerator: lower tax on first $200,000 for 3 years", "PBO-costed", "No (new businesses only)"],
          ["Coalition", "Student HELP 20% cut: not proceeding", "PBO-costed", "No (cut already applied)"],
          ["Greens", "Wipe all student debt", "PBO-costed", "Yes"],
          ["Greens", "Free childcare", "PBO-costed", "Yes, if you enter a cost"],
          ["Greens", "Dental and mental health in Medicare", "PBO-costed nationally", "No (no per-household figure)"],
          ["Greens", "Rent freeze, then capped increases", "Uncosted per household", "No"],
          ["Labor", "Tax rate 16% to 15% (2026–27) to 14% (2027–28)", "Enacted", "Yes"],
          ["Labor", "$1,000 standard deduction (2026–27); WATO up to $250 (2027–28)", "Enacted", "Yes"],
          ["Labor", "20% HELP cut; repayment threshold $69,528 (2026–27), marginal system", "Enacted (2025)", "In marginal rate only"],
          ["Labor", "Instant asset write-off $20,000 (extended into 2025–26)", "Announced and extended", "No"],
          ["Labor", "Key Apprenticeship Program $10,000 (housing construction)", "In effect from 1 July 2025", "Yes, apprentice profile"],
          ["Labor", "Negative gearing and CGT changes from 1 July 2027", "Enacted", "No (investor-specific)"],
          ["One Nation", "Fuel excise halving; income splitting; defence 3.5% of GDP; lower migration", "Uncosted (not in PBO report)", "No"],
        ]} />
      </Section>

      <Section heading="Estimates for uncosted items" caption="Separate from the costed figures above. Dashed bands are estimates, not official costings.">
        <EstimateBlock page="explorer" />
        <Rows rows={[
          { title: "Coalition nuclear plan: budget (government equity)", detail: "$36.4bn to 2035 and $118.2bn to 2050. Equity counts in the headline cash balance and debt, not the underlying deficit. Coalition figure, not independently costed by the PBO (PBO ECR-2025-2009). Not added to the Coalition subtotal above.", meta: "PBO (official), as of May 2025" },
          { title: "Coalition nuclear plan: system cost, whole economy 2025-2050", detail: "Frontier Economics $331bn (Progressive Change) / $446bn (Step Change), Coalition-requested modelling, vs Climate Council $775-821bn (climate advocacy). Not a budget cost.", meta: "Estimate, low confidence" },
        ]} />
        <LinkCards links={[{ title: "PBO costing: civil nuclear program (ECR-2025-2009)", site: "pbo.gov.au", href: "https://www.pbo.gov.au/elections/2025-general-election/2025-election-commitments-costings/announced-commitments-establish-civil-nuclear-program-including-operating-nuclear-power-plants-in-7-locations-across-country" }, { title: "Climate Council: counting the real cost of the nuclear plan", site: "climatecouncil.org.au", href: "https://www.climatecouncil.org.au/resources/economic-meltdown-counting-the-real-cost-of-peter-duttons-nuclear-fantasy/" }]} />
      </Section>

      <Section heading="Range of expert views">
        <Table columns={["Topic", "View", "Who", "Evidence"]} rows={[
          ["Negative gearing and CGT", "Reform would lower prices up to 2% with little effect on rents", "Grattan Institute (Hot Property, 2016)", "Modelling"],
          ["Negative gearing and CGT", "Reform reduces new building and raises rents", "Housing Industry Association (2026)", "Commissioned modelling"],
          ["Negative gearing and CGT", "35,000 fewer dwellings, offset by supply measures; +75,000 owner-occupiers", "Treasury (2026–27 Budget)", "Official modelling"],
          ["Energy: nuclear", "Nuclear in the mix is up to 44% cheaper", "Frontier Economics for the Coalition (Dec 2024)", "Modelling comparing different AEMO scenarios"],
          ["Energy: nuclear", "Nuclear isn't the most cost-competitive low-emission option", "CSIRO GenCost 2024–25", "Levelised cost analysis"],
          ["Tax cuts", "Modest cuts help with bracket creep but aren't structural reform", "Grattan Institute (2025 Budget analysis)", "Commentary"],
        ]} />
        <Text>These views are listed so you can compare them, not as endorsements. Each study's assumptions drive its result.</Text>
      </Section>

      <Section heading="Factors you may not have considered">
        <Rows rows={[
          { title: "Bracket creep", detail: "Tax thresholds aren't indexed to inflation, so the share of income you pay in tax rises as wages grow. The year table above shows this." },
          { title: "Effective marginal tax rates", detail: "Tax, the Medicare levy, HELP repayments and benefit withdrawal stack up. Someone earning around $70,000 with a HELP debt can lose close to half of each extra dollar." },
          { title: "Intergenerational debt", detail: "Deficits now become interest costs for future taxpayers. The PBO's debt interest figures show this." },
          { title: "Superannuation and retirement", detail: "Super changes affect people decades later. Age Pension recipients are exempt from the new 30% minimum capital gains tax." },
          { title: "Location", detail: "State taxes, stamp duty and energy prices differ by state. Fuel excise matters more in regional areas, where people drive further." },
          { title: "Visa and residency", detail: "Tax residency decides access to the tax-free threshold. Many payments and Medicare need permanent residency or citizenship." },
          { title: "NDIS, carers and disability", detail: "None of the platforms here are costed per household for these. Check the payment rules on Services Australia." },
          { title: "Parental leave and childcare", detail: "These depend heavily on family income tests, which this tool doesn't model." },
          { title: "Private health and Medicare", detail: "The Medicare levy surcharge applies above income thresholds if you don't have private hospital cover." },
          { title: "How sure each estimate is", detail: "Enacted law is most certain, then PBO-costed proposals, then party claims, then uncosted promises." },
        ]} />
      </Section>

      <Section heading="Methodology and limitations">
        <Properties items={[
          { label: "Included", value: "Written party platforms with PBO costings; enacted law; Treasury and Budget papers; ATO tax rates and occupation medians" },
          { label: "Not weighted", value: "The four measures are shown separately. There is no score and no winner." },
          { label: "Uncosted", value: "Listed, but left out of every total" },
          { label: "Money only", value: "Service quality, wait times, the environment and wellbeing aren't measured" },
          { label: "Income data", value: "ATO medians are for 2022–23 and haven't been adjusted for wage growth since" },
          { label: "Simplifications", value: "Single taxpayer; Medicare levy family thresholds not modelled; WATO taper not modelled; state policies excluded" },
          { label: "Party order", value: "Alphabetical" },
        ]} />
      </Section>

      <Section heading="Learn more">
        <LinkCards links={[
          { title: "PBO 2025 Election Commitments Report", site: "Parliamentary Budget Office", href: "https://www.pbo.gov.au/elections/2025-general-election/2025-election-commitments-report" },
          { title: "Grattan Institute", site: "grattan.edu.au", href: "https://grattan.edu.au/report/budget-reboot-how-to-fund-australias-future/" },
          { title: "e61 Institute", site: "e61.in", href: "https://e61.in/wp-content/uploads/2026/09/How-many-housing-investors-pay-more-tax-under-the-reforms.pdf" },
          { title: "ANU Tax and Transfer Policy Institute", site: "anu.edu.au", href: "https://crawford.anu.edu.au/ttpi/research" },
          { title: "RBA education", site: "Reserve Bank of Australia", href: "https://www.rba.gov.au/education/resources/explainers/" },
          { title: "Productivity Commission", site: "pc.gov.au", href: "https://www.pc.gov.au/inquiries-and-research/" },
          { title: "Treasury: 2026–27 tax changes", site: "treasury.gov.au", href: "https://treasury.gov.au/policy-topics/taxation/budget2026-27" },
          { title: "ABC fact checks", site: "abc.net.au", href: "https://www.abc.net.au/news/factcheck" },
          { title: "The Conversation (expert analysis)", site: "theconversation.com", href: "https://theconversation.com/au" },
        ]} />
      </Section>

      <Section heading="Ideas to reduce bias further">
        <Rows rows={[
          { title: "Update when 2027–28 platforms and the next PBO report come out", detail: "The current comparison mixes enacted law (Labor) with 2025 proposals (others)." },
          { title: "Add official family payment calculators", detail: "Model Family Tax Benefit, Child Care Subsidy and pension income tests." },
          { title: "Ask the PBO for distributional costings", detail: "Use PBO or ANU modelling that shows effects by income decile instead of per-person estimates." },
          { title: "Use current wages", detail: "Update ATO occupation medians with ABS wage price index growth." },
          { title: "Let readers flip the baseline", detail: "Show results against 'law before 2025' and against 'current law'." },
          { title: "Get an independent review", detail: "Have a second reviewer check every row against its source." },
        ]} />
      </Section>

      <Section heading="Sources">
        <LinkCards links={[
          { title: "ATO resident tax rates 2026–27", site: "ato.gov.au", href: "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents/" },
          { title: "ATO Taxation Statistics 2022–23, Table 15", site: "data.gov.au", href: "https://data.gov.au/data/dataset/taxation-statistics-2022-23" },
          { title: "Tax Reform No. 1 (WATO, $1,000 deduction, CGT, negative gearing)", site: "Treasury ministers", href: "https://ministers.treasury.gov.au/ministers/jim-chalmers-2022/media-releases/government-introduces-first-tranche-tax-reform" },
          { title: "ATO: negative gearing and CGT reforms are law", site: "ato.gov.au", href: "https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/tax-reform-boosting-home-ownership-reforming-negative-gearing-and-capital-gains-tax" },
          { title: "Bills Digest: Tax Reform No. 1 (Treasury housing estimates)", site: "aph.gov.au", href: "https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/bd/bd2526/26bd067" },
          { title: "HELP 20% cut and repayment thresholds", site: "education.gov.au", href: "https://www.education.gov.au/higher-education-loan-program/help-students/help-indexation-and-debt-reduction" },
          { title: "Key Apprenticeship Program", site: "pm.gov.au", href: "https://www.pm.gov.au/media/building-australias-future-investing-our-apprentices" },
          { title: "PBO: Cost of Living Tax Offset", site: "pbo.gov.au", href: "https://www.pbo.gov.au/elections/2025-general-election/2025-election-commitments-costings/Cost%20of%20Living%20Tax%20Offset" },
          { title: "PBO: Wipe all student debt", site: "pbo.gov.au", href: "https://www.pbo.gov.au/elections/2025-general-election/2025-election-commitments-costings/wipe-all-student-debt" },
          { title: "Budget Paper No. 1, 2026–27", site: "budget.gov.au", href: "https://budget.gov.au/content/bp1/index.htm" },
          { title: "Coalition and Nationals 2025 plan", site: "nationals.org.au", href: "https://www.nationals.org.au/election-policies/our-plan-for-regional-australia" },
          { title: "Greens 2025 platform", site: "greens.org.au", href: "https://greens.org.au/platform" },
          { title: "One Nation policies", site: "onenation.com.au", href: "https://www.onenation.com.au/policies" },
          { title: "Grattan: Hot Property", site: "grattan.edu.au", href: "https://grattan.edu.au/report/hot-property/" },
          { title: "HIA on negative gearing changes", site: "hia.com.au", href: "https://hia.com.au/our-industry/newsroom/industry-policy/2026/04/tax-changes-will-cripple-housing-supply-and-punish-renters" },
          { title: "CSIRO nuclear explainer (GenCost)", site: "csiro.au", href: "https://www.csiro.au/en/news/All/Articles/2024/December/Nuclear-explainer" },
          { title: "Frontier Economics nuclear analysis", site: "frontier-economics.com.au", href: "https://www.frontier-economics.com.au/economic-analysis-of-including-nuclear-power-in-the-nem/" },
          { title: "SBS policy cheat sheet, 2025 election", site: "sbs.com.au", href: "https://www.sbs.com.au/news/article/a-cheat-sheet-of-the-policies-australians-are-being-promised-on-election-day/5jiwzgq5a" },
        ]} />
      </Section>
    </>
  );
}

const EST_DATA: any[] = [{"id":"rep.further-tax-cuts","label":"Republicans: further tax cuts (estimate)","low":0.0,"central":0.039,"high":1.473,"unit":"% GDP/yr","central_bn":12.6,"bn_unit":"USD bn/yr","source_url":"https://www.crfb.org/blogs/obbba-dynamic-score-comes-47-trillion","orientation":"Committee for a Responsible Federal Budget: nonpartisan, fiscal-restraint focus","as_of":"2026-03-11","retrieved":"2026-11-03","confidence":"very low","is_program_size":false},{"id":"rep.deregulation","policy_source_url":"https://prod-static.gop.com/media/RNC2024-Platform.pdf","label":"Republicans: deregulation (estimate)","low":-0.063,"central":0.0,"high":0.063,"unit":"% GDP/yr","central_bn":0,"bn_unit":"USD bn/yr","source_url":"","orientation":"n/a","as_of":"2026-11-03","retrieved":"not verified","confidence":"very low","is_program_size":false},{"id":"rep.energy-supply-plans","policy_source_url":"https://prod-static.gop.com/media/RNC2024-Platform.pdf","label":"Republicans: energy-supply plans (estimate)","low":-0.031,"central":-0.006,"high":0.016,"unit":"% GDP/yr","central_bn":-2,"bn_unit":"USD bn/yr","source_url":"","orientation":"n/a","as_of":"2026-11-03","retrieved":"not verified","confidence":"very low","is_program_size":false},{"id":"dem.drug-price-bills","label":"Democrats: drug-price bills (estimate)","low":-0.074,"central":-0.031,"high":0.0,"unit":"% GDP/yr","central_bn":-9.85,"bn_unit":"USD bn/yr","source_url":"https://www.kff.org/medicare/explaining-the-prescription-drug-provisions-in-the-inflation-reduction-act/","orientation":"KFF: nonpartisan health-policy research; figures are CBO's","as_of":"2022-08 (CBO); CRFB 2026-08-05","retrieved":"2026-11-03","confidence":"low","is_program_size":false},{"id":"dem.grocery-pricing-bills","policy_source_url":"https://www.congress.gov/bill/119th-congress/senate-bill/3892/all-info","label":"Democrats: grocery-pricing bills (estimate)","low":-0.003,"central":0.0,"high":0.003,"unit":"% GDP/yr","central_bn":0,"bn_unit":"USD bn/yr","source_url":"","orientation":"n/a","as_of":"2026-11-03","retrieved":"not verified","confidence":"very low","is_program_size":false},{"id":"lnp.repeal-capital-gains-trust-and-negative-gearing-changes","label":"Coalition: repeal Labor CGT, trust and negative gearing changes (estimate)","low":0.065,"central":0.258,"high":0.271,"unit":"% GDP/yr","central_bn":8.0,"bn_unit":"AUD bn/yr","source_url":"https://budget.gov.au/content/bp1/download/bp1_2026-27.pdf","orientation":"Treasury (official)","as_of":"2026-05-12 (Budget)","retrieved":"2026-11-03","confidence":"medium","is_program_size":false},{"id":"lnp.spending-cap","policy_source_url":"https://www.liberal.org.au/2026/10/26/coalition-will-cut-labors-waste-cut-taxes-and-tackle-the-cost-of-living","label":"Coalition: spending cap (estimate)","low":-0.291,"central":0.0,"high":0.0,"unit":"% GDP/yr","central_bn":0,"bn_unit":"AUD bn/yr","source_url":"","orientation":"n/a","as_of":"2026-11-03","retrieved":"not verified","confidence":"very low","is_program_size":false},{"id":"lnp.surplus-target","policy_source_url":"https://www.liberal.org.au/2026/10/26/coalition-will-cut-labors-waste-cut-taxes-and-tackle-the-cost-of-living","label":"Coalition: surplus target (estimate)","low":-0.485,"central":0.0,"high":0.0,"unit":"% GDP/yr","central_bn":0,"bn_unit":"AUD bn/yr","source_url":"https://budget.gov.au/content/bp1/download/bp1_2026-27.pdf","orientation":"Treasury (official)","as_of":"2026-11-03","retrieved":"not verified","confidence":"very low","is_program_size":false},{"id":"grn.carbon-price","label":"Greens: carbon price ($100/t levy on facilities ≥25kt) (estimate)","low":-0.565,"central":-0.556,"high":-0.485,"unit":"% GDP/yr","central_bn":-17.2,"bn_unit":"AUD bn/yr","source_url":"https://www.pbo.gov.au/elections/2025-general-election/2025-election-commitments-costings/powering-past-coal-and-gas-make-polluters-pay-damage-they-are-doing","orientation":"PBO (independent, official): ECR-2025-3365, standalone costing before interactions (ECR-2025-3901)","as_of":"2025-05 (PBO ECR-2025-3365)","retrieved":"2026-11-09","confidence":"medium","is_program_size":false},{"id":"grn.public-housing","label":"Greens: government-owned property developer (estimate)","low":0.129,"central":0.129,"high":0.995,"unit":"% GDP/yr","central_bn":4.0,"bn_unit":"AUD bn/yr","source_url":"https://www.abc.net.au/news/2024-10-04/greens-public-property-developer-costing-40-billion/104428086","orientation":"PBO via ABC News","as_of":"2024-10-04 / PBO 2025 ECR","retrieved":"2026-11-03","confidence":"medium","is_program_size":false},{"id":"grn.rent-controls","policy_source_url":"https://greens.org.au/news/media-release/housing-battle-lines-drawn-labor-tinkers-while-prices-soar-dutton-sends-prices","label":"Greens: rent controls (estimate)","low":0.0,"central":0.01,"high":0.032,"unit":"% GDP/yr","central_bn":0.3,"bn_unit":"AUD bn/yr","source_url":"","orientation":"n/a","as_of":"2026-11-03","retrieved":"not verified","confidence":"very low","is_program_size":false},{"id":"onp.abolish-climate-department","policy_source_url":"https://www.onenation.org.au/slash-waste","label":"One Nation: abolish climate department (estimate)","low":-0.032,"central":-0.016,"high":-0.006,"unit":"% GDP/yr","central_bn":-0.5,"bn_unit":"AUD bn/yr","source_url":"https://budget.gov.au/content/bp4/download/bp4_11_part_3_expenses_and_net_capital_investment.pdf","orientation":"Treasury/Finance (official)","as_of":"2026-05-12","retrieved":"2026-11-03","confidence":"low","is_program_size":false},{"id":"onp.scrap-sbs","label":"One Nation: scrap SBS funding (estimate)","low":-0.012,"central":-0.011,"high":-0.01,"unit":"% GDP/yr","central_bn":-0.35,"bn_unit":"AUD bn/yr","source_url":"https://www.sbs.com.au/aboutus/wp-content/uploads/2025/08/SBS-Corporate-Plan-2025-26.pdf","orientation":"SBS (official)","as_of":"2026-02 (PAES)","retrieved":"2026-11-03","confidence":"medium","is_program_size":false},{"id":"onp.cut-abc-funding","label":"One Nation: cut ABC funding (regional-only role) (estimate)","low":-0.03,"central":-0.02,"high":-0.01,"unit":"% GDP/yr","central_bn":-0.61,"bn_unit":"AUD bn/yr","source_url":"https://www.infrastructure.gov.au/sites/default/files/documents/2025-26_infra_pbs_03_abc.pdf","orientation":"Dept of Infrastructure PBS (official)","as_of":"2025-26 PBS","retrieved":"2026-11-03","confidence":"low","is_program_size":false},{"id":"onp.cut-some-indigenous-program-funding","label":"One Nation: cut Indigenous program funding (estimate)","low":-0.404,"central":-0.097,"high":-0.01,"unit":"% GDP/yr","central_bn":-3.0,"bn_unit":"AUD bn/yr","source_url":"https://www.onenation.org.au/audit-indigenous-spending-to-close-the-gaps","orientation":"One Nation (party claim) + ANAO (official)","as_of":"2026-27","retrieved":"2026-11-03","confidence":"low","is_program_size":false},{"id":"onp.end-health-and-education-duplication","label":"One Nation: end health/education duplication (estimate)","low":-0.013,"central":-0.006,"high":-0.003,"unit":"% GDP/yr","central_bn":-0.2,"bn_unit":"AUD bn/yr","source_url":"https://www.onenation.org.au/slash-waste","policy_source_url":"https://www.onenation.org.au/slash-waste","orientation":"One Nation (party): review of federal Education and Housing departments to eliminate duplication; no costing","as_of":"2026-11-03","retrieved":"2026-11-03 (policy only; no cost source)","confidence":"very low","is_program_size":false},{"id":"onp.fuel-excise-halving","label":"One Nation: halve fuel excise (estimate)","low":5.5,"central":6.0,"high":6.5,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"https://www.pbo.gov.au/elections/2025-general-election/2025-election-commitments-costings/adjust-fuel-excise-25c-litre-reduction","orientation":"PBO (independent, official)","as_of":"2025 election","retrieved":"2026-11-03","confidence":"medium","is_program_size":false,"page":"explorer"},{"id":"onp.income-splitting","label":"One Nation: income splitting for couples with dependants (estimate)","low":5.9,"central":12.4,"high":12.4,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"https://www.pbo.gov.au/publications-and-data/publications/costings/allow-income-splitting-couples-least-1-dependent-child","orientation":"PBO (independent, official)","as_of":"2025-03-13","retrieved":"2026-11-03","confidence":"medium","is_program_size":false,"page":"explorer"},{"id":"onp.no-gst-on-insurance","label":"One Nation: no GST on insurance (estimate)","low":2.0,"central":3.0,"high":3.5,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"https://www.onenation.org.au/insurance-gst-exempt","orientation":"One Nation (party claim)","as_of":"2026","retrieved":"2026-11-03","confidence":"low","is_program_size":false,"page":"explorer"},{"id":"onp.retiree-threshold","label":"One Nation: $35,000 tax-free threshold for self-funded retirees 67+ (estimate)","low":0.5,"central":1.5,"high":3.0,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"https://www.onenation.org.au/fair-tax-for-retirees","orientation":"One Nation (party)","as_of":"2026","retrieved":"2026-11-03 (design only; no cost source)","confidence":"very low","is_program_size":false,"page":"explorer"},{"id":"onp.defence-3-5pct","label":"One Nation: defence to 3.5% GDP (estimate)","low":10,"central":22.5,"high":35,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"https://www.smh.com.au/politics/federal/pauline-hanson-s-defence-spending-boost-would-cost-extra-225b-budget-office-says-20260621-p608p2.html","orientation":"PBO analysis via SMH","as_of":"2026-06-21","retrieved":"2026-11-03","confidence":"medium","is_program_size":false,"page":"explorer"},{"id":"onp.migration-cut","label":"One Nation: migration cut (budget effect) (estimate)","low":15,"central":28.3,"high":40,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"https://www.theage.com.au/politics/federal/how-one-nation-s-negative-migration-plans-would-drive-up-debt-by-275b-20261018-p61575.html","orientation":"Journalist analysis with PBO Build your own Budget tool (indicative)","as_of":"2026-10-18","retrieved":"2026-11-03","confidence":"low","is_program_size":false,"page":"explorer"},{"id":"lnp.nuclear","label":"Coalition: nuclear plan (system cost, not budget) (estimate)","low":13.2,"central":17.8,"high":32.8,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"https://www.climatecouncil.org.au/resources/economic-meltdown-counting-the-real-cost-of-peter-duttons-nuclear-fantasy/","orientation":"Frontier Economics (commissioned by the Coalition); Climate Council (climate advocacy)","as_of":"2024-12 / 2025","retrieved":"2026-11-03","confidence":"low","is_program_size":false,"page":"explorer"},{"id":"lnp.gas-reservation","policy_source_url":"https://www.nationals.org.au/election-policies/our-plan-to-deliver-australian-gas-for-australians","label":"Coalition: gas reservation (estimate)","low":0,"central":0,"high":0.5,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"","orientation":"n/a","as_of":"2026-11-03","retrieved":"not verified","confidence":"very low","is_program_size":false,"page":"explorer"},{"id":"grn.rent-freeze","label":"Greens: rent freeze (household saving) (estimate)","low":1100,"central":2000,"high":3100,"unit":"AUD per household/yr","central_bn":null,"bn_unit":null,"source_url":"https://www.cotality.com/au/insights/articles/rental-growth-loses-momentum-as-vacancy-rates-rise","policy_source_url":"https://greens.org.au/news/media-release/housing-battle-lines-drawn-labor-tinkers-while-prices-soar-dutton-sends-prices","orientation":"Cotality (industry data): median rent $713/wk (Sep 2026) x rent growth avoided over a 2-year freeze: 2.0% (Cotality Sep qtr annualised), 3.6% (ABS CPI rents), 5.5% (Cotality y/y). $0 for tenants whose rent would not have risen; rents are a state power","as_of":"2026-10-09 (Sep qtr 2026)","retrieved":"2026-11-09","confidence":"low","is_program_size":false,"page":"explorer"},{"id":"haines.regional","label":"Independent (Haines): 15 regional commitments (estimate)","low":1.34,"central":2.05,"high":2.05,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"https://www.pbo.gov.au/elections/2025-general-election/2025-election-commitments-report/independent-member-Indi","orientation":"PBO (independent, official)","as_of":"2025 ECR","retrieved":"2026-11-03","confidence":"medium","is_program_size":false,"page":"explorer"},{"id":"baseline.family-tax-benefit","label":"Family Tax Benefit A+B (program size) (estimate)","low":18.15,"central":18.15,"high":18.15,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"https://www.dss.gov.au/system/files/documents/2026-05/portfolio-budget-statements-2026-27-social-services.pdf","orientation":"Official Budget data: DSS PBS 2026-27 Program 1.1 (A 14.119 + B 4.031)","as_of":"2026-05-12 (Budget)","retrieved":"2026-11-03","confidence":"high","is_program_size":true,"page":"explorer"},{"id":"baseline.child-care-subsidy","label":"Child Care Subsidy (program size) (estimate)","low":16.917,"central":16.917,"high":16.917,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"https://www.education.gov.au/download/20342/2026-27-education-portfolio-budget-statements/44709/2026-27-education-portfolio-budget-statements/pdf","orientation":"Official Budget data: Education PBS 2026-27 Program 1.2","as_of":"2026-05-12 (Budget)","retrieved":"2026-11-03","confidence":"high","is_program_size":true,"page":"explorer"},{"id":"baseline.age-pension","label":"Age Pension (program size) (estimate)","low":68.67,"central":68.67,"high":68.67,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"https://www.dss.gov.au/system/files/documents/2026-05/portfolio-budget-statements-2026-27-social-services.pdf","orientation":"Official Budget data: DSS PBS 2026-27 Program 1.3","as_of":"2026-05-12 (Budget)","retrieved":"2026-11-03","confidence":"high","is_program_size":true,"page":"explorer"},{"id":"baseline.ndis","label":"NDIS (program size) (estimate)","low":56.124,"central":56.124,"high":56.124,"unit":"AUD bn/yr","central_bn":null,"bn_unit":null,"source_url":"https://budget.gov.au/content/bp1/download/bp1_bs-6.pdf","orientation":"Official Budget data: Budget Paper 1 2026-27 Statement 6 Table 6.1.3","as_of":"2026-05-12 (Budget)","retrieved":"2026-11-03","confidence":"high","is_program_size":true,"page":"explorer"},{"id":"state.policies","label":"State and territory policies (household) (estimate)","low":-2000,"central":0,"high":2000,"unit":"AUD per household/yr","central_bn":null,"bn_unit":null,"source_url":"","orientation":"n/a","as_of":"2026-11-03","retrieved":"not verified","confidence":"very low","is_program_size":false,"page":"explorer"}];
const EST_PARTY: Record<string, string> = { rep: "US Republicans", dem: "US Democrats", lnp: "Coalition", grn: "Greens", onp: "One Nation", haines: "Independent (Haines)", baseline: "Current programs (size only)", state: "State policies" };
const estOK = (x: any) => typeof x === "number" && isFinite(x);
const estFmt = (x: any) => estOK(x) ? (x > 0 ? "+" : "") + (Math.abs(x) >= 100 ? Math.round(x).toLocaleString() : String(Math.round(x * 1000) / 1000)) : "not yet sourced";
const estHH = (e: any) => /household/i.test(String(e.unit));
const estNotBudget = (e: any) => /not budget/i.test(String(e.label));
const estPartisan = (o: string) => /party|advoca|partisan|think tank|lobby|union|industry|commissioned/i.test(o || "");
function EstimateBlock({ page }: { page: string }) {
  const ED = EST_DATA.filter((e: any) => (e.page || "sim") === page);
  const parties: string[] = Array.from(new Set(ED.map((e: any) => String(e.id.split(".")[0]))));
  const [pf, setPf] = useState<string>(parties[0]);
  const rows = ED.filter((e: any) => e.id.split(".")[0] === pf);
  const vals = rows.flatMap((e: any) => [e.low, e.central, e.high]).filter(estOK).concat([0]);
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const W = 320, X = (v: number) => 8 + (W - 16) * ((estOK(v) ? v : 0) - lo) / span;
  const summable = rows.filter((e: any) => !e.is_program_size && !estHH(e) && !estNotBudget(e));
  const sum = (k: string) => summable.reduce((a: number, e: any) => a + (estOK(e[k]) ? e[k] : 0), 0);
  return (
    <div data-estimates style={{ border: "1px dashed currentColor", borderRadius: 8, padding: 12, marginTop: 8 }}>
      <div style={{ fontWeight: 600 }}>Estimate: not part of the costed totals above</div>
      <div style={{ fontSize: 13, opacity: 0.8 }}>{page === "sim" ? "Low to high (central) for items left at baseline above. + = cost to the budget, - = saving or revenue. These are not added to the modelled deficit or any chart total." : "Low to high (central) for items with no official costing. + = cost to the budget, - = saving or revenue. Programme sizes, per-household figures and non-budget system costs are shown for context and never added to party totals."}</div>
      <Segmented value={pf} onChange={setPf} options={parties.map((p: string) => ({ value: p, label: EST_PARTY[p] || p }))} />
      <svg data-est-chart viewBox={`0 0 ${W} ${rows.length * 22 + 10}`} width="100%" style={{ maxWidth: 520, display: "block", margin: "8px 0" }} role="img" aria-label="Estimate ranges, dashed">
        <line x1={X(0)} x2={X(0)} y1={0} y2={rows.length * 22 + 10} stroke="currentColor" strokeOpacity={0.4} />
        {rows.map((e: any, i: number) => { const y = 14 + i * 22; return (<g key={e.id}>
          <rect x={Math.min(X(e.low), X(e.high))} y={y - 6} width={Math.max(2, Math.abs(X(e.high) - X(e.low)))} height={12} fill="currentColor" fillOpacity={0.08} stroke="currentColor" strokeDasharray="4 3" strokeOpacity={0.7} />
          <circle cx={X(e.central)} cy={y} r={3.5} fill="currentColor" />
        </g>); })}
      </svg>
      <Table columns={["Item", "Estimate: low to high (central)", "Confidence", "Source", "As of"]} rows={rows.map((e: any) => [
        e.label + (e.is_program_size ? " (programme size, not added to totals)" : estHH(e) ? " (per household, not added to totals)" : estNotBudget(e) ? " (not added to totals)" : ""),
        `${estFmt(e.low)} to ${estFmt(e.high)} (${estFmt(e.central)}) ${e.unit || ""}` + (estOK(e.central_bn) ? ` [about ${estFmt(e.central_bn)} ${e.bn_unit || "bn/yr"}]` : ""),
        (/not verified/i.test(e.retrieved || "") ? "Unverified projection; " : "") + (e.confidence || "not yet graded"),
        (e.source_url ? e.source_url : "not yet sourced") + (e.policy_source_url ? ` | Policy: ${e.policy_source_url}` : "") + (e.orientation && e.orientation !== "n/a" ? ` (${e.orientation}${estPartisan(e.orientation) ? "; partisan or advocacy source" : ""})` : ""),
        e.as_of || "not yet sourced"])} />
      <div data-est-total style={{ fontSize: 13 }}>{summable.length ? `Estimate subtotal for ${EST_PARTY[pf] || pf} (${summable.length} item(s), kept separate from costed totals): ${estFmt(sum("low"))} to ${estFmt(sum("high"))} (${estFmt(sum("central"))}) ${summable[0].unit}` : page === "sim" ? "No summable estimates." : "No summable estimates: programme sizes and per-household figures are context only."}</div>
    </div>
  );
}
