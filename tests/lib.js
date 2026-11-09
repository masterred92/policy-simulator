const p=require("puppeteer-core");const w=ms=>new Promise(r=>setTimeout(r,ms));
exports.w=w;
exports.open=async(W,H=900,url="https://us-plus-australia-policy-simulator-bm2t.pages.grok.bot/")=>{const b=await p.launch({executablePath:process.env.CHROME||"/usr/bin/google-chrome",args:["--no-sandbox","--allow-file-access-from-files"]});const pg=await b.newPage();
 await pg.setViewport({width:W,height:H,isMobile:W<500,hasTouch:W<500,deviceScaleFactor:W<500?2:1});if(W<500)await pg.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
 const errs=[];pg.on("pageerror",e=>errs.push(e.message));
 await pg.goto(url+(url.startsWith("file")?"":"?t="+Date.now()),{waitUntil:"networkidle2",timeout:60000});let f;
 for(let i=0;i<60&&!f;i++){for(const fr of pg.frames())if(await fr.$("select,button").catch(()=>null)&&(url.startsWith("file")||fr!==pg.mainFrame()))f=fr;await w(500);}
 // Start screen (country choice): pick HOME (default "both", the full two-country view) unless KEEP_LANDING is set
 if(f&&!process.env.KEEP_LANDING&&await f.$("[data-landing]").catch(()=>null)){await f.evaluate(c=>document.querySelector(`[data-country="${c}"]`).click(),process.env.HOME_PICK||"both");for(let i=0;i<40&&await f.$("[data-landing]");i++)await w(250);await w(500);}
 return{b,pg,f,errs};};
exports.go=async(f,name)=>{await f.evaluate(n=>{const s=[...document.querySelectorAll("select")].find(s=>[...s.options].some(o=>o.textContent==="Sectors"));const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set;set.call(s,[...s.options].find(o=>o.textContent===n).value);s.dispatchEvent(new Event("change",{bubbles:true}));},name);await w(700);};
