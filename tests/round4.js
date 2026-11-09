// Review10 checks: approved party preset changes (ECN-02, 03, 04, 05; ECN-28 in the Greens preset). Default target is the live page;
// set URL=file:///.../index.html for a local build. 390px uses touch taps, 1280px mouse clicks. Exit 1 on any miss, NaN or console error.
const L=require("./lib");const URL=process.env.URL||"https://us-plus-australia-policy-simulator-bm2t.pages.grok.bot/";
(async()=>{let fails=0;for(const W of [390,1280]){const touch=W<500;const {b,pg,f}=await L.open(W,900,URL);const errs=[];pg.on("console",m=>{if(m.type()==="error")errs.push(m.text())});pg.on("pageerror",e=>errs.push(String(e)));
 const local=URL.startsWith("file");const fe=local?{x:0,y:0}:await (await f.frameElement()).boundingBox();
 const tap=async js=>{const r=await f.evaluate(`(()=>{const e=${js};if(!e)return null;e.scrollIntoView({block:"center"});const q=e.getBoundingClientRect();return{x:q.x+q.width/2,y:q.y+q.height/2}})()`);if(!r)return false;if(touch)await pg.touchscreen.tap(fe.x+r.x,fe.y+r.y);else await pg.mouse.click(fe.x+r.x,fe.y+r.y);await L.w(700);return true;};
 const btn=t=>`[...document.querySelectorAll("button")].find(b=>b.textContent.trim()===${JSON.stringify(t)})`;
 const txt=()=>f.evaluate(()=>document.body.innerText);
 const res={};const ok=(k,v)=>{res[k]=v;if(!v)fails++;};
 await L.go(f,"Parties: compare all");
 await tap(btn("US Republicans"));let t=await txt();
 ok("ECN-02 rep 0.74 for 2027-2031",/\+0\.74% GDP\/yr, 2027 to 2031 only/.test(t));ok("ECN-02 CRFB, not CBO",/Committee for a Responsible Federal Budget/.test(t)&&!/Pre-ruling figure/.test(t)&&!/CBO-based reporting/.test(t));
 ok("ECN-02 condition not met",/Conditional on GOP control; condition not met \(Nov 2026\)/.test(t));
 await tap(btn("Coalition (Lib-Nat)"));t=await txt();
 ok("ECN-03 coalition spending timing",/-0\.19 \/ -0\.27 \/ -0\.27 \/ -0\.29% of GDP/.test(t));ok("ECN-03 coalition tax net of WATO",/-0\.08% GDP\/yr average/.test(t)&&/Net of WATO repeal; starts 2030-31/.test(t));
 await tap(btn("Greens"));t=await txt();
 ok("ECN-04 greens revenue range",/\+0\.9% GDP \(range \+0\.55 to \+1\.5\)/.test(t)&&/federal mechanism not specified/.test(t));
 ok("ECN-28 carbon in greens preset",/PBO costing ECR-2025-3365/.test(t)&&/Net tax lever \+1\.08/.test(t));
 ok("costing table: carbon no longer unsized",!/Carbon price; Public housing/.test(t)&&!/Carbon price: unsized/.test(t));
 await pg.screenshot({path:`../screens/r10_${W}_parties.png`});
 await tap(btn("Coalition (Lib-Nat)"));await tap(btn("Run Coalition (Lib-Nat) in the Simulator"));await L.w(800);t=await txt();
 ok("ECN-05 simulator applies coalition timing",/Fixed timing from the Coalition \(Lib-Nat\) preset: Australian spending 2029 to 2032; Australian taxes 2031 to 2032 only/.test(t));
 await f.evaluate(()=>{const e=[...document.querySelectorAll("p,div")].find(x=>/^Fixed timing from/.test(x.innerText||""));if(e)e.scrollIntoView({block:"center"});});await L.w(300);
 await pg.screenshot({path:`../screens/r10_${W}_sim_timing.png`});
 await tap(btn("Reset to no change"));t=await txt();ok("timing note cleared on reset",!/Fixed timing from/.test(t));
 const nan=await f.evaluate(()=>/\bNaN\b|undefined|Infinity/.test(document.body.innerText+[...document.querySelectorAll("svg")].map(s=>s.innerHTML).join("")));ok("no NaN",!nan);ok("no console errors",errs.length===0);
 console.log(W,JSON.stringify(res),errs.slice(0,3).join(" ; "));await b.close();}
process.exit(fails?1:0);})();
