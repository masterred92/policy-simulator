// Review9 (Economist round 3) checks. Default target is the live page; set URL=file:///.../index.html for a local build.
// 390px uses touch taps, 1280px mouse clicks. Fails (exit 1) on any missing fix, NaN/undefined text or console error.
const L=require("./lib");const URL=process.env.URL||"https://us-plus-australia-policy-simulator-bm2t.pages.grok.bot/";
(async()=>{let fails=0;for(const W of [390,1280]){const touch=W<500;const {b,pg,f}=await L.open(W,900,URL);const errs=[];pg.on("console",m=>{if(m.type()==="error")errs.push(m.text())});pg.on("pageerror",e=>errs.push(String(e)));
 const local=URL.startsWith("file");const fe=local?{x:0,y:0}:await (await f.frameElement()).boundingBox();
 const tap=async js=>{const r=await f.evaluate(`(()=>{const e=${js};if(!e)return null;e.scrollIntoView({block:"center"});const q=e.getBoundingClientRect();return{x:q.x+q.width/2,y:q.y+q.height/2}})()`);if(!r)return false;if(touch)await pg.touchscreen.tap(fe.x+r.x,fe.y+r.y);else await pg.mouse.click(fe.x+r.x,fe.y+r.y);await L.w(700);return true;};
 const btn=t=>`[...document.querySelectorAll("button")].find(b=>b.textContent.trim()===${JSON.stringify(t)})`;
 const txt=()=>f.evaluate(()=>document.body.innerText+" "+[...document.querySelectorAll("a")].map(a=>a.href).join(" "));
 const res={};const ok=(k,v)=>{res[k]=v;if(!v)fails++;};
 await f.evaluate(()=>{[...document.querySelectorAll('button[aria-expanded="false"]')].forEach(b=>b.click());[...document.querySelectorAll("h2")].filter(h=>/^▸/.test(h.textContent)).forEach(h=>h.click());});await L.w(400);
 let t=await txt();ok("what changed as-of 9 Nov, never today",/What changed \(as of 9 Nov 2026\)/.test(t)&&!/What changed today/.test(t)&&/was scheduled for 4 Nov 2026/.test(t)&&/Democrats won both chambers/.test(t)&&/98\.32/.test(t));
 const warn=await f.evaluate(()=>{window.scrollTo(0,0);const el=[...document.querySelectorAll("div,aside,section,p")].filter(e=>/^Educational toy, not a forecast/.test(e.innerText||"")).pop();if(!el)return "missing";const r=el.getBoundingClientRect();const pts=[[r.left+8,r.top+8],[r.right-8,r.top+8],[r.left+r.width/2,r.top+r.height/2]];return pts.every(([x,y])=>{const h=document.elementFromPoint(x,y);return h&&(el.contains(h)||h.contains(el))})?"clear":"covered";});
 ok("SB-01 warning not covered",warn==="clear");
 ok("scoreboard AUD now 0.689",/Now 0\.689/.test(t));
 await tap(btn("Fed cuts hard"));t=await txt();ok("Fed cuts hard explains yen carry",/yen carry-trade selling/.test(t));
 await tap(btn("Oil collapse"));t=await txt();ok("oil collapse explains volatility",/volatility penalty/.test(t));
 await L.go(f,"Road to Surplus");t=await txt();ok("SB-03 r − g defined",/r − g: the interest rate on government debt minus the economy's growth rate/.test(t));
 await L.go(f,"Data & sources");t=await txt();ok("data rows refreshed",/0\.6894/.test(t)&&/4\.3% y\/y/.test(t)&&/pre-IEEPA ruling/.test(t)&&/agriculture from QCEW/.test(t));
 await L.go(f,"Parties: compare all");await tap(btn("US Republicans"));t=await txt();ok("rep tariff note unsourced",/Party position unsourced/.test(t));
 await tap(btn("Greens"));t=await f.evaluate(()=>document.querySelector("[data-estimates]")?.innerText||"");ok("carbon levy PBO figure",/-17\.2/.test(t)||!/carbon/i.test(t));
 await L.go(f,"Australian household by party");await L.w(500);t=await txt();
 ok("cover note 9 Nov",/What this covers, as of 9 Nov 2026/.test(t));ok("2026 proposal rows",/Greens \(2026 proposal/.test(t)&&/Coalition \(2026 proposal/.test(t));
 ok("Labor low incl WATO ($1,840)",/\$1,840 to/.test(t));ok("HELP 2026-27",/\$69,528/.test(t));ok("+ = cost table",/\+ = cost/.test(t));ok("ANU link",(local||/crawford\.anu\.edu\.au\/ttpi\/research/.test(t))&&!/taxpolicy\.crawford/.test(t)); // the local kit stand-in draws link cards without hrefs
 await tap(`[...document.querySelectorAll("[data-estimates] button")].find(b=>b.textContent.trim()==="Greens")`);t=await f.evaluate(()=>document.querySelector("[data-estimates]").innerText);
 ok("rent freeze 1,100-3,100 (2,000)",/\+1,100 to \+3,100 \(\+2,000\)/.test(t));ok("dental moved out of uncosted",!/dental/i.test(t));
 const nan=await f.evaluate(()=>/\bNaN\b|undefined|Infinity/.test(document.body.innerText+[...document.querySelectorAll("svg")].map(s=>s.innerHTML).join("")));ok("no NaN",!nan);ok("no console errors",errs.length===0);
 await pg.screenshot({path:`../screens/r9_${W}_household.png`});
 console.log(W,JSON.stringify(res),errs.slice(0,3).join(" ; "));await b.close();}
 process.exit(fails?1:0);})();
