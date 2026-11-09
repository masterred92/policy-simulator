// Inputs vs Data rows (added 9 Nov 2026). Every model starting value that has a row in "Data & sources" must show the same
// number in that row. The Data rows are written from the inputs in code (B, EU, BRENT, IRON); this test fails if anyone
// types a number back into a row, changes an input without its row, adds an input with no row, or drops a row.
// Run: node tests/inputs_match.js   (exits 1 on any mismatch)
const fs=require("fs"),path=require("path"),{transformSync}=require("esbuild");
const src=fs.readFileSync(path.join(__dirname,"../src/simulator.tsx"),"utf8");
const code=src.replace(/^import [\s\S]*?;$/gm,"").replace(/^export default /m,"")+"\nmodule.exports={B,EU,DATA,BANKS,BRENT,IRON,FISCAL,GROUPS};";
const m={exports:{}};new Function("module","exports",transformSync(code,{loader:"tsx",format:"cjs",jsx:"transform"}).code)(m,m.exports);
const {B,EU,DATA,BANKS,BRENT,IRON,FISCAL,GROUPS}=m.exports;
const eu=(id)=>EU.find(c=>c.id===id);const f1=(x)=>x.toFixed(1),f2=(x)=>x.toFixed(2);
const row=(label)=>{const r=DATA.find(d=>d[0]===label);return r?r[1]:undefined;};
let fails=0,n=0;const ok=(cond,msg)=>{n++;if(!cond){fails++;console.log("FAIL",msg);}};
// [Data row label, input name, expected text in the row]
const MAP=[
 ["US GDP growth","B.usG",`${B.usG}%`],["US CPI inflation","B.usPi",`${B.usPi}%`],["US unemployment","B.usU",`${B.usU}%`],
 ["Fed funds (effective)","B.fed",`${f2(B.fed)}%`],["US 10y yield","B.y10",`${B.y10}%`],["US deficit","B.def",`${B.def}% GDP`],
 ["US debt held by public","B.debt",`${B.debt}% GDP`],["US gross debt","B.usGross",`${B.usGross}% GDP`],
 ["Aus GDP growth","B.auG",`${B.auG}%`],["Aus CPI inflation, quarterly","B.auPi",`${B.auPi}%`],["Aus unemployment","B.auU",`${B.auU}%`],
 ["RBA cash rate","B.rba",`${f2(B.rba)}%`],["AUD/USD","B.aud",B.aud.toFixed(4)],["Aus net / gross debt","B.auDebt",`${B.auDebt}% /`],
 ["Aus deficit","B.auDef",`${f1(B.auDef)}% GDP`],["China GDP / CPI","B.cnG",`${B.cnG}% /`],["China GDP / CPI","B.cnPi",`/ ${B.cnPi}%`],
 ["Yuan / yen per US$","B.cny",`${f2(B.cny)} /`],["Yuan / yen per US$","B.jpy",`/ ${B.jpy}`],
 ["Euro area GDP / HICP","B.euG",`${B.euG}% /`],["Euro area GDP / HICP","B.euPi",`/ ${f1(B.euPi)}%`],["ECB deposit rate","B.ecb",`${f2(B.ecb)}%`],
 ["Japan GDP","B.jpG",`${B.jpG}%`],["Japan CPI / BoJ rate","B.jpPi",`${B.jpPi}% /`],["Japan CPI / BoJ rate","B.boj",`/ ${f2(B.boj)}%`],
 ["UK GDP growth","B.ukG",`${B.ukG}% y/y`],["UK CPI / Bank Rate","B.ukPi",`${B.ukPi}% /`],["UK CPI / Bank Rate","B.boe",`/ ${f2(B.boe)}%`],
 ["UK unemployment","EU uk.u",`${eu("uk").u}%`],["UK borrowing (deficit)","EU uk.def",`${eu("uk").def}% GDP`],["UK net debt","EU uk.debt",`${f1(eu("uk").debt)}% GDP`],
 ["Brent oil (futures settle)","BRENT.usd",`$${BRENT.usd}`],["Brent oil (EIA daily spot)","BRENT.spot",`$${BRENT.spot}`],
 ["Iron ore (61% fines, CFR Qingdao)","IRON.usd",`US$${IRON.usd}/dmt`],
 ["France / Spain / Germany GDP","EU fr/es/de.g",["fr","es","de"].map(i=>`${eu(i).g}%`).join(" / ")],
 ["Finland / Sweden GDP","EU fi/se.g",["fi","se"].map(i=>`${eu(i).g}%`).join(" / ")],
 ["Norway mainland GDP","EU no.g",`${eu("no").g}% y/y`],["Denmark GDP","EU dk.g",`${eu("dk").g}% y/y`],["Iceland GDP","EU is.g",`${eu("is").g}% y/y`],
 ["Iceland budget 2027","EU is.def",(eu("is").def<=0?"Surplus":"Deficit")+` ISK 5bn (${Math.abs(eu("is").def)}% GDP)`],["Iceland budget 2027","EU is.debt",`about ${eu("is").debt}% GDP`],
 ["Inflation FR / ES / DE / FI / SE / DK / NO / IS","EU *.pi",["fr","es","de","fi","se","dk","no","is"].map(i=>f1(eu(i).pi)).join(" / ")+"%"],
 ["Jobless FR / ES / DE / FI / SE / DK / NO / IS","EU *.u",["fr","es","de","fi","se","dk","no","is"].map(i=>f1(eu(i).u)).join(" / ")+"%"],
 ["Deficit / debt FR, ES, DE, FI, SE, DK","EU *.def/debt",["fr","es","de","fi","se","dk"].map(i=>`${f1(eu(i).def)}/${f1(eu(i).debt)}`).join(", ")],
 ["Riksbank / Norges Bank / CB Iceland / Nationalbanken","EU se/no/is/dk.rate",["se","no","is","dk"].map(i=>f2(eu(i).rate)).join(" / ")+"%"],
];
for(const [label,name,want] of MAP){const v=row(label);ok(v!==undefined,`missing Data row "${label}" for ${name}`);if(v!==undefined)ok(v.includes(want),`${name}: Data row "${label}" shows "${v}", input gives "${want}"`);}
// every B key must have a Data row (B.y10 etc.); a new input without a row fails here
const mapped=new Set(MAP.map(x=>x[1]));for(const k of Object.keys(B))ok(mapped.has("B."+k),`B.${k} has no Data row in the test map`);
// euro-area members use the ECB rate; UK uses Bank Rate; Norway's deficit is a different measure (non-oil structural), not compared
for(const c of EU.filter(c=>c.bank==="ecb"&&c.id!=="dk"))ok(c.rate===B.ecb,`EU ${c.id}.rate ${c.rate} != B.ecb ${B.ecb}`);
ok(eu("uk").rate===B.boe,`EU uk.rate ${eu("uk").rate} != B.boe ${B.boe}`);ok(eu("uk").g===B.ukG&&eu("uk").pi===B.ukPi,"EU uk g/pi != B.ukG/B.ukPi");
// central-bank cards, slider hints and Road to Surplus starting debt
for(const b of BANKS)ok(b.now===`${f2(EU.find(c=>c.bank===b.key).rate)}%`,`BANKS ${b.key} now ${b.now}`);
const hint=(k)=>GROUPS.flatMap(g=>g.levers).find(l=>l.key===k).hint;
ok(hint("fed").includes(`${f2(B.fed)}%`),"fed hint");ok(hint("rba").includes(`${f2(B.rba)}%`),"rba hint");ok(hint("boj").includes(`${f2(B.boj)}%`),"boj hint");
ok(hint("boe").includes(`${f2(B.boe)}%`),"boe hint");ok(hint("oil").includes(`$${BRENT.usd}`),"oil hint");ok(hint("china").includes(`US$${IRON.usd}`),"china hint");
ok(FISCAL.find(x=>x.id==="US").debt===B.debt,"Road to Surplus US debt != B.debt");ok(FISCAL.find(x=>x.id!=="US").debt===B.auDebt,"Road to Surplus Aus debt != B.auDebt");
// no Data row value may be a hard-coded number that should come from an input: the source rows above must be templates
for(const label of new Set(MAP.map(x=>x[0]))){const i=src.indexOf(`["${label}", "`);ok(i<0,`Data row "${label}" is a hard-coded string in the source; write it from the input`);}
console.log(JSON.stringify({checks:n,fails,rows_mapped:new Set(MAP.map(x=>x[0])).size,inputs:Object.keys(B).length}));
process.exit(fails?1:0);
