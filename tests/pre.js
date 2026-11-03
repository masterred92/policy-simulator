const L=require("./lib");(async()=>{for(const W of [390,1280]){const t=W<500;const {b,pg,f}=await L.open(W,844);const fe=await (await f.frameElement()).boundingBox();
const tap=async s=>{const r=await f.evaluate(`(()=>{const e=${s};if(!e)return null;e.scrollIntoView({block:"center"});const q=e.getBoundingClientRect();return{x:q.x+q.width/2,y:q.y+q.height/2}})()`);if(!r)return false;if(t)await pg.touchscreen.tap(fe.x+r.x,fe.y+r.y);else await pg.mouse.click(fe.x+r.x,fe.y+r.y);await L.w(800);return true};
await L.go(f,"Parties: compare all");
for(const name of ["US Democrats","US Republicans"]){await tap(`[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="${name}")`);
const tx=await f.evaluate(()=>document.body.innerText);
const btns=await f.evaluate(()=>[...document.querySelectorAll("button")].map(b=>b.textContent.trim()).filter(x=>/simulator|run|load|try/i.test(x)).slice(0,5));
console.log(W,name,"| -7 shown:",/-7 pts \(estimate: range -5 to -8\.5\)/.test(tx),"| pre-ruling shown:",/Pre-ruling figure/.test(tx),"| buttons:",btns.join(" / "));
await pg.screenshot({path:`../screens/merged_${W}_preset_${name.replace(/ /g,"_")}.png`});
const ok=await tap(`[...document.querySelectorAll("button")].find(b=>/in (the )?simulator/i.test(b.textContent))`);await L.w(600);
console.log("   run-in-sim tapped",ok,"| landing:",(await f.evaluate(()=>document.querySelector("[data-changes]")?.innerText||"")).replace(/\s+/g," ").slice(0,170));
await L.go(f,"Parties: compare all");}
await b.close();}})();
