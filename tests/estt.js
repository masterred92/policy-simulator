const puppeteer=require("puppeteer-core");const L=require("./lib");
(async()=>{for(const live of (process.env.LIVE?[1]:[0]))for(const W of [390,1280]){const t=W<500;let b,pg,f;
if(live){({b,pg,f}=await L.open(W,844));await L.go(f,"Parties: compare all");}else{b=await puppeteer.launch({executablePath:"/usr/bin/google-chrome",args:["--no-sandbox"]});pg=await b.newPage();await pg.setViewport({width:W,height:844,isMobile:t,hasTouch:t});await pg.goto("file://"+__dirname+"/pt.html");await new Promise(r=>setTimeout(r,800));f=pg.mainFrame();}
const fe=live?await (await f.frameElement()).boundingBox():{x:0,y:0};
const st=()=>f.evaluate(()=>{const e=document.querySelector("[data-estimates]");return{t:e.innerText,svg:e.querySelector("svg").innerHTML,nan:/NaN|undefined|null/.test(e.querySelector("svg").innerHTML+e.innerText)}});
const btns=await f.evaluate(()=>[...document.querySelectorAll("[data-estimates] button")].map(b=>b.textContent));const out=[];
for(let i=0;i<btns.length;i++){const s0=await st();const r=await f.evaluate(i=>{const e=document.querySelectorAll("[data-estimates] button")[i];e.scrollIntoView({block:"center"});const q=e.getBoundingClientRect();return{x:q.x+q.width/2,y:q.y+q.height/2,w:q.width,h:q.height}},i);
if(t)await pg.touchscreen.tap(fe.x+r.x,fe.y+r.y);else await pg.mouse.click(fe.x+r.x,fe.y+r.y);await new Promise(r=>setTimeout(r,600));const s1=await st();
out.push(`${btns[i]}:${i==0?"(default)":(s0.svg!==s1.svg||s0.t!==s1.t)?"changed":"NO CHANGE"}${s1.nan?" NaN!":""} ${Math.round(r.w)}x${Math.round(r.h)}`);
await f.evaluate(()=>document.querySelector("[data-estimates]").scrollIntoView());await pg.screenshot({path:`../screens/est_${live?"live":"local_explorer"}_${W}_${i}.png`});}
const u=await st();console.log(live?"LIVE sim":"LOCAL explorer",W,out.join(" | "),"| unverified shown:",/Unverified projection/.test(u.t),"| subtotal:",u.t.match(/Estimate subtotal[^\n]*/)?.[0]||u.t.match(/No summable[^\n]*/)?.[0]);await b.close();}})();
