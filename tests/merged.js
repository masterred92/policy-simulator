const L=require("./lib");(async()=>{for(const W of [390,1280]){const t=W<500;const {b,pg,f}=await L.open(W,844);const errs=[];pg.on("console",m=>{if(m.type()==="error")errs.push(m.text())});pg.on("pageerror",e=>errs.push(String(e)));
const fe=await (await f.frameElement()).boundingBox();
const tap=async js=>{const r=await f.evaluate(js);if(!r)return "MISSING";if(t)await pg.touchscreen.tap(fe.x+r.x,fe.y+r.y);else await pg.mouse.click(fe.x+r.x,fe.y+r.y);await L.w(700);return `${Math.round(r.w)}x${Math.round(r.h)}`};
const P=s=>`(()=>{const e=${s};if(!e)return null;e.scrollIntoView({block:"center"});const q=e.getBoundingClientRect();return{x:q.x+q.width/2,y:q.y+q.height/2,w:q.width,h:q.height}})()`;
const nan=()=>f.evaluate(()=>/\bNaN\b|undefined|Infinity/.test(document.body.innerText+[...document.querySelectorAll("svg")].map(s=>s.innerHTML).join("")));
// horizon chip sizes
const hz=await f.evaluate(()=>[...document.querySelectorAll("button")].filter(b=>/^\s*\d+ yr\s*$/.test(b.textContent)).map(b=>{const r=b.getBoundingClientRect();return b.textContent.trim()+":"+Math.round(r.width)+"x"+Math.round(r.height)}));
// presets
const strip=()=>f.evaluate(()=>document.querySelector("[data-changes]")?.innerText.replace(/\s+/g," ").slice(0,200));
const out=[];for(const name of ["US Democrats","US Republicans"]){await L.go(f,"Parties: compare all");const s0=await f.evaluate(()=>document.body.innerText.length);const sz=await tap(P(`[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="${name}")`));
const notes=await f.evaluate(()=>[...document.querySelectorAll("table")].map(t=>t.innerText).find(x=>/Why \(source\)/.test(x))||"");
out.push(`${name} ${sz}: tariffs row: ${(notes.split("\n").find(l=>/^Tariffs/.test(l))||"-").slice(0,90)} | dividend: ${/Pre-ruling figure/.test(notes)}`);
const run=await tap(P(`[...document.querySelectorAll("button")].find(b=>/Run in Simulator/.test(b.textContent))`));await L.w(500);out.push(` run-in-sim ${run} -> tab strip: ${await strip()}`);}
// new tab
await L.go(f,"Australian household by party");await L.w(600);
const h0=await f.evaluate(()=>document.body.innerText);const segs=await f.evaluate(()=>[...document.querySelectorAll("button")].filter(b=>/years/.test(b.textContent)).map(b=>b.textContent));
const r1=await tap(P(`[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="4 years (PBO forward estimates)")`));const h1=await f.evaluate(()=>document.body.innerText);
const est=await f.evaluate(()=>[...document.querySelectorAll("[data-estimates] button")].map(b=>b.textContent));let ec=[];for(let i=1;i<est.length;i++){const a=await f.evaluate(()=>document.querySelector("[data-estimates]").innerText);const s=await tap(P(`document.querySelectorAll("[data-estimates] button")[${i}]`));const c=await f.evaluate(()=>document.querySelector("[data-estimates]").innerText);ec.push(est[i]+(a!==c?" ok":" NOCHANGE")+" "+s)}
const nuc=await f.evaluate(()=>/government equity/.test(document.body.innerText)&&/\$331bn/.test(document.body.innerText));
await f.evaluate(()=>window.scrollTo(0,0));await pg.screenshot({path:`../screens/merged_${W}_household_tab.png`});
await f.evaluate(()=>document.querySelector("[data-estimates]").scrollIntoView());await pg.screenshot({path:`../screens/merged_${W}_household_estimates.png`});
console.log(W,"HORIZON",hz.join(" "),"\n",out.join("\n "),"\n NEW TAB horizon tap",r1,"changed",h0!==h1,"| est switch:",ec.join(", "),"| nuclear lines",nuc,"| NaN",await nan(),"| console errors",errs.length,errs.slice(0,3).join(" ; "));await b.close();}})();
