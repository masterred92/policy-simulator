// Start screen (country choice) checks. 390px = touch taps, 1280px = mouse clicks, real input at the element's centre.
// Checks: the page opens on the choice; each choice is >=44px, not covered and opens the Simulator set to that country; the Country row
// switches later and returns to the start screen; no NaN, no console errors. For a local build (URL=file://...) it also checks that
// links carrying ?country=, #us/#au/#both or ?tab= skip the start screen. Screenshots: ../screens/landing_<TAG>_<W>.png. Exit 1 on any miss.
process.env.KEEP_LANDING="1";
const L=require("./lib");const w=L.w;const URL=process.env.URL||"https://us-plus-australia-policy-simulator-bm2t.pages.grok.bot/";const TAG=process.env.TAG||"landing";
const local=URL.startsWith("file");let fails=0;const out={};
const ok=(c,m)=>{if(!c){fails++;console.log("FAIL",m);}};
const state=(f)=>f.evaluate(()=>{const t=document.body.innerText;return{landing:!!document.querySelector("[data-landing]"),cards:[...document.querySelectorAll("[data-country]")].map(b=>b.getAttribute("data-country")),
 usM:t.includes("US growth"),auM:t.includes("Aus growth"),sw:!!document.querySelector("[data-country-switch]"),nan:/\bNaN\b|undefined%|Infinity/.test(t),
 tabSel:[...document.querySelectorAll("select")].some(s=>[...s.options].some(o=>o.textContent==="Sectors")),
 pressed:[...document.querySelectorAll("[data-chip^='home-']")].filter(b=>b.getAttribute("aria-pressed")==="true").map(b=>b.getAttribute("data-chip"))};});
const want={us:[true,false],au:[false,true],both:[true,true]};
const checkW=(W,s,c,how)=>{ok(!s.landing,`${W} ${how}: still on the start screen`);ok(s.sw,`${W} ${how}: no Country row`);ok(s.usM===want[c][0]&&s.auM===want[c][1],`${W} ${how}: scoreboard US ${s.usM} Aus ${s.auM}`);ok(s.pressed.join()===`home-${c}`,`${W} ${how}: pressed ${s.pressed}`);ok(!s.nan,`${W} ${how}: NaN`);};
(async()=>{for(const W of [390,1280]){const touch=W<500;const {b,pg,f}=await L.open(W,900,URL);const errs=[];pg.on("console",m=>{if(m.type()==="error")errs.push(m.text())});pg.on("pageerror",e=>errs.push(String(e)));
 const off=async()=>{if(local)return{x:0,y:0};const r=await (await f.frameElement()).boundingBox();return{x:r.x,y:r.y};};
 const hit=async(sel,name)=>{const st=await f.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return null;e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2,covered:!(top===e||e.contains(top))};},sel);
  if(!st){ok(false,`${W} ${name}: not found`);return;}ok(st.w>=44&&st.h>=44,`${W} ${name}: target ${Math.round(st.w)}x${Math.round(st.h)}`);ok(!st.covered,`${W} ${name}: covered`);
  const o=await off();if(touch)await pg.touchscreen.tap(o.x+st.cx,o.y+st.cy);else await pg.mouse.click(o.x+st.cx,o.y+st.cy);await w(700);return st;};
 const r={};
 let s=await state(f);ok(s.landing,`${W}: start screen not shown first`);ok(!s.tabSel,`${W}: tab menu shown on the start screen`);ok(s.cards.join()==="us,au,both",`${W}: choices ${s.cards}`);
 await f.evaluate(()=>scrollTo(0,0));await pg.screenshot({path:`../screens/landing_${TAG}_${W}.png`});
 const sizes={};for(const c of ["us","au","both"])sizes[c]=await f.evaluate(c=>{const r=document.querySelector(`[data-country="${c}"]`).getBoundingClientRect();return`${Math.round(r.width)}x${Math.round(r.height)}`;},c);r.card_sizes=sizes;
 const check=(s,c,how)=>checkW(W,s,c,how);
 // 1. each start-screen choice, back to the start screen with the Country row in between
 for(const c of ["us","au","both"]){await hit(`[data-country="${c}"]`,`card ${c}`);s=await state(f);check(s,c,`card ${c}`);r[`card_${c}`]=!s.landing&&s.usM===want[c][0]&&s.auM===want[c][1];
  await hit(`[data-chip="home-start"]`,"Start screen");s=await state(f);ok(s.landing,`${W}: Start screen did not return to the choice`);}
 // 2. switch later with the Country row
 await hit(`[data-country="au"]`,"card au");for(const c of ["us","both","au"]){await hit(`[data-chip="home-${c}"]`,`switch ${c}`);s=await state(f);check(s,c,`switch ${c}`);r[`switch_${c}`]=s.usM===want[c][0]&&s.auM===want[c][1];}
 // 3. Australia choice carries to the Parties tab and Road to Surplus
 await L.go(f,"Parties: compare all");let t=await f.evaluate(()=>document.body.innerText);r.parties_au_only=t.includes("Compare all Australian parties")&&!t.includes("Compare all US parties");ok(r.parties_au_only,`${W}: Parties not Australia-only`);
 await hit(`[data-chip="home-both"]`,"switch both (parties)");t=await f.evaluate(()=>document.body.innerText);ok(t.includes("Compare all Australian parties")&&t.includes("Compare all US parties"),`${W}: Parties not both after switch`);
 r.errors=errs.length;ok(!errs.length,`${W}: console errors ${errs.slice(0,3)}`);out[W]=r;await b.close();}
 // 4. links that carry a country or tab skip the start screen (local build: the published host does not pass the address into its frame)
 if(local){for(const [q,c,tab] of [["?country=au","au",""],["#us","us",""],["#both","both",""],["?country=US&tab=data","us","Data & sources"],["?tab=parties","both","Parties: compare all"],["","",""]]){
   const {b,f}=await L.open(1280,900,URL+q);const s=await state(f);const tabNow=await f.evaluate(()=>{const s=[...document.querySelectorAll("select")].find(s=>[...s.options].some(o=>o.textContent==="Sectors"));return s?s.options[s.selectedIndex].textContent:"";});
   if(c===""){ok(s.landing,"no-param link should show the start screen");}else{if(tab){ok(!s.landing&&s.sw&&s.pressed.join()===`home-${c}`&&!s.nan,`link ${q}: landing ${s.landing} pressed ${s.pressed}`);}else checkW(1280,s,c,`link ${q}`);if(tab)ok(tabNow===tab,`link ${q}: tab ${tabNow}`);}
   out[`link ${q||"(none)"}`]=c===""?(s.landing?"start screen":"FAIL"):(!s.landing?`opened ${c}${tab?" / "+tabNow:""}`:"FAIL");await b.close();}}
 console.log(JSON.stringify({fails,...out},null,1));process.exit(fails?1:0);})();
