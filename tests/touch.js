// Real-input test: 390px = mobile touch emulation (tap / touch-drag), 1280px = mouse click / mouse drag.
// Per control: hit target >=44px, not covered (elementFromPoint), no pointer-events/touch-action block, real input changes output; sliders must not scroll the page sideways.
const L=require("./lib");const w=L.w;const TAG=process.env.TAG||"before";const URL=process.env.URL||"https://us-plus-australia-policy-simulator-bm2t.pages.grok.bot/";const ONLY=process.env.ONLY;
const SNAP=()=>document.body.innerText+"#"+[...document.querySelectorAll("svg")].map(e=>e.innerHTML.length).join()+"#"+[...document.querySelectorAll("[aria-expanded],[aria-pressed],[aria-selected]")].map(e=>e.getAttribute("aria-expanded")+e.getAttribute("aria-pressed")+e.getAttribute("aria-selected")).join("")+"#"+[...document.querySelectorAll("input")].map(i=>i.value).join();
(async()=>{const all={};for(const W of (process.env.WS||"390,1280").split(",").map(Number)){const touch=W<500;const {b,pg,f}=await L.open(W,900,URL);const local=URL.startsWith("file");
 const tabs=local?[""]:await f.evaluate(()=>[...[...document.querySelectorAll("select")].find(s=>[...s.options].some(o=>o.textContent==="Sectors")).options].map(o=>o.textContent));
 const off=async()=>{if(local)return{x:0,y:0};const fe=await f.frameElement();const r=await fe.boundingBox();return{x:r.x,y:r.y};};
 const per={};
 for(const tn of tabs){if(ONLY&&tn!==ONLY)continue;if(tn)await L.go(f,tn);
  // open all collapsibles so their controls are tested
  await f.evaluate(async()=>{for(let k=0;k<3;k++){document.querySelectorAll('button[aria-expanded="false"]').forEach(b=>b.click());await new Promise(r=>setTimeout(r,300));}});
  const tag=()=>f.evaluate(()=>{const els=[...document.querySelectorAll("button,select,input,[role=slider],[role=tab]")].filter(e=>!(e.tagName==="SELECT"&&[...e.options].some(o=>o.textContent==="Sectors"))&&e.getClientRects().length);els.forEach((e,i)=>e.setAttribute("data-tt",i));return els.length;});
  const n=await tag();
  // Country row: after a control changes the country or opens the start screen, go back to "Both" (the state the controls were listed in) and re-tag
  const restore=async()=>{const st=await f.evaluate(()=>({landing:!!document.querySelector("[data-landing]"),both:document.querySelector('[data-chip="home-both"]')?.getAttribute("aria-pressed")==="true"}));if(!st.landing&&st.both)return;
   if(st.landing)await f.evaluate(()=>document.querySelector('[data-country="both"]').click());else await f.evaluate(()=>document.querySelector('[data-chip="home-both"]').click());await w(500);
   if(tn)await L.go(f,tn);await f.evaluate(async()=>{for(let k=0;k<3;k++){document.querySelectorAll('button[aria-expanded="false"]').forEach(b=>b.click());await new Promise(r=>setTimeout(r,300));}});await tag();};
  const res=[];
  for(let i=0;i<n;i++){
   const st=await f.evaluate((i)=>{const e=document.querySelector(`[data-tt="${i}"]`);if(!e)return null;e.scrollIntoView({block:"center",inline:"nearest"});const T=(e.type==="checkbox"&&e.getBoundingClientRect().width<8)?(e.closest("label")||e.parentElement):e;const r=T.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;const top=document.elementFromPoint(cx,cy);
    let blk="";for(let a=T;a;a=a.parentElement){const cs=getComputedStyle(a);if(cs.pointerEvents==="none")blk+="pointer-events:none@"+a.tagName+" ";if(e.type==="range"&&(cs.touchAction==="none"&&a!==e))blk+="";}
    const ta=getComputedStyle(e).touchAction;const lab=(e.getAttribute("aria-label")||e.textContent||e.closest("label")?.textContent||e.type).trim().slice(0,45);
    return{tag:e.tagName,type:e.type,lab,w:r.width,h:r.height,cx,cy,covered:!(top===T||T.contains(top)||top===e),coveredBy:top?top.tagName+"."+(top.textContent||"").trim().slice(0,20):"none",blk,ta,val:e.value,min:e.min,max:e.max,sx:scrollX};},i);
   if(!st)continue;const o=await off();const X=o.x+st.cx,Y=o.y+st.cy;const fails=[];
   if(st.h<44||(st.w<44&&st.tag!=="INPUT"))fails.push(`target ${Math.round(st.w)}x${Math.round(st.h)}`);
   if(st.covered)fails.push("covered by "+st.coveredBy);if(st.blk)fails.push(st.blk);
   if(touch&&st.type==="range"&&/^(pan-y|none|pinch-zoom)$/.test(st.ta)===false&&st.ta!=="auto"&&st.ta!=="manipulation"&&st.ta!=="pan-x")fails.push("touch-action "+st.ta);
   const before=await f.evaluate(SNAP);let changed=false,hScroll=false,mainScroll0=await pg.evaluate(()=>scrollX);
   if(st.type==="range"){const left=o.x+st.cx-st.w/2+8,right=o.x+st.cx+st.w/2-8;const frac=(Number(st.val)-Number(st.min))/(Number(st.max)-Number(st.min)||1);const sx=left+(right-left)*frac;const tx=frac>0.5?left+ (right-left)*0.1:left+(right-left)*0.9;
     if(touch){await pg.touchscreen.touchStart(sx,Y);for(let k=1;k<=8;k++){await pg.touchscreen.touchMove(sx+(tx-sx)*k/8,Y);await w(20);}await pg.touchscreen.touchEnd();}
     else{await pg.mouse.move(sx,Y);await pg.mouse.down();for(let k=1;k<=8;k++){await pg.mouse.move(sx+(tx-sx)*k/8,Y);await w(15);}await pg.mouse.up();}
     await w(350);const after=await f.evaluate((i)=>{const e=document.querySelector(`[data-tt="${i}"]`);return{v:e.value,sx:scrollX}},i);hScroll=after.sx!==st.sx||(await pg.evaluate(()=>scrollX))!==mainScroll0;if(after.v===st.val)fails.push("drag did not move slider");if(hScroll)fails.push("drag scrolled page sideways");}
   else if(st.tag==="SELECT"){/* native picker: tap must focus it; then choose option via keyboard like a user */ if(touch)await pg.touchscreen.tap(X,Y);else await pg.mouse.click(X,Y);await w(150);const foc=await f.evaluate(i=>document.activeElement===document.querySelector(`[data-tt="${i}"]`),i);if(!foc)fails.push("tap did not focus select");await pg.keyboard.press("Escape");await f.evaluate(i=>{const e=document.querySelector(`[data-tt="${i}"]`);const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set;const o=[...e.options].find(o=>o.value!==e.value);if(o){set.call(e,o.value);e.dispatchEvent(new Event("change",{bubbles:true}));}},i);}
   else if(st.tag==="INPUT"&&st.type!=="checkbox"&&st.type!=="range"){if(touch)await pg.touchscreen.tap(X,Y);else await pg.mouse.click(X,Y);await w(150);const foc=await f.evaluate(i=>document.activeElement===document.querySelector(`[data-tt="${i}"]`),i);if(!foc)fails.push("tap did not focus input");await pg.keyboard.down("Control");await pg.keyboard.press("a");await pg.keyboard.up("Control");await pg.keyboard.type("123456");}
   else {if(touch)await pg.touchscreen.tap(X,Y);else await pg.mouse.click(X,Y);}
   await w(450);const after=await f.evaluate(SNAP);changed=after!==before;
   if(!changed&&st.tag==="BUTTON"){const sib=await f.evaluate(i=>{const e=document.querySelector(`[data-tt="${i}"]`);const s=[...e.parentElement.querySelectorAll(":scope > button")].find(x=>x!==e);if(!s)return false;s.click();return true;},i);if(sib){await w(400);const mid=await f.evaluate(SNAP);const st2=await f.evaluate(i=>{const e=document.querySelector(`[data-tt="${i}"]`);const r=e.getBoundingClientRect();return{cx:r.left+r.width/2,cy:r.top+r.height/2}},i);if(touch)await pg.touchscreen.tap(o.x+st2.cx,o.y+st2.cy);else await pg.mouse.click(o.x+st2.cx,o.y+st2.cy);await w(400);changed=(await f.evaluate(SNAP))!==mid;}}
   if(!changed)fails.push("real input changed nothing");
   res.push({lab:st.lab,tag:st.tag,type:st.type,fails});await restore();}
  const bad=res.filter(r=>r.fails.length);per[tn||"page"]={controls:res.length,ok:res.length-bad.length,fail:bad.length,bad:bad.map(r=>`${r.tag}${r.type==="range"?"(range)":""} "${r.lab}": ${r.fails.join("; ")}`)};
  console.log(W,tn||"page",res.length,"ok",res.length-bad.length,"fail",bad.length);
  await f.evaluate(()=>scrollTo(0,0));await pg.screenshot({path:`../screens/touch_${TAG}_${W}_${(tn||"parties_explorer").replace(/\W+/g,"_")}.png`});
 }
 all[W]=per;await b.close();}
 require("fs").writeFileSync(`../touch_${TAG}${process.env.SUF||""}.json`,JSON.stringify(all,null,1));
})();
