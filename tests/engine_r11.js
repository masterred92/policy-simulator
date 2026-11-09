// Engine regression for review10 + the 9 Nov 2026 data refresh + inputs matched to the Data rows (party presets approved: ECN-02, 03, 04, 05 incl. One Nation fuel excise, 28 in the Greens preset).
// Compares the current engine with BASE_REF (default b697469) over every scenario preset and party, low/mid/high,
// Taylor on/off, durations 5/10/permanent, 100 years. Scenario presets and unchanged parties must match exactly;
// the engine with no schedule must match exactly; changed parties are listed with what moved. Also checks schedule timing.
const fs=require("fs"),path=require("path"),cp=require("child_process"),{transformSync}=require("esbuild");
const load=(s)=>{const end=s.indexOf("\ntype L = { key");const code=s.slice(0,end).replace(/^import .*$/m,"")+"\nmodule.exports={run,PRESETS,PARTIES,ZERO,B};";const m={exports:{}};new Function("module","exports",transformSync(code,{loader:"ts",format:"cjs"}).code)(m,m.exports);return m.exports;};
const REF=process.env.BASE_REF||"b697469";
const REFSRC=cp.execSync(`git show ${REF}:src/simulator.tsx`,{cwd:path.join(__dirname,".."),encoding:"utf8",maxBuffer:1e8});
// 9 Nov 2026: engine starting values changed by the data refresh (US 10-year yield 4.91 -> 4.88) and by matching the inputs to the
// Data rows (China CPI 0.9 -> 0.7, euro-area HICP 3.8 -> 4.0, UK GDP 1.0 -> 1.2). The reference gets the same constants so the
// comparison isolates the preset changes; the effect of the new starting values on the no-change baseline is reported separately.
const INPUTS=[["y10: 4.91,","y10: 4.88,"],["cnPi: 0.9,","cnPi: 0.7,"],["euPi: 3.8,","euPi: 4.0,"],["ukG: 1.0,","ukG: 1.2,"]];
const patch=(s,list)=>list.reduce((x,[a,b])=>{if(!x.includes(a))throw new Error("reference has no "+a);return x.replace(a,b);},s);
const A0=load(REFSRC),A1=load(patch(REFSRC,INPUTS.slice(0,1))),A=load(patch(REFSRC,INPUTS));
const N=load(fs.readFileSync(path.join(__dirname,"../src/simulator.tsx"),"utf8"));
const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
const sch=(p)=>{if(!p.sched)return undefined;const o={};for(const k of Object.keys(p.sched))if(p.lv[k]!==0)o[k]={s:(p.schedPart&&p.schedPart[k]!==undefined)?p.schedPart[k]:p.lv[k],p:p.sched[k]};return Object.keys(o).length?o:undefined;};
let n=0,bad=0,nan=0;const fails=[];
const cmp=(nm,o,p)=>{for(const key of Object.keys(o))for(let i=0;i<100;i++){n++;if(!Number.isFinite(p[key][i]))nan++;if(o[key][i]!==p[key][i]){bad++;if(bad<5)console.log("DIFF",nm,key,i,o[key][i],p[key][i]);}}};
const grid=(f)=>{for(const k of [0.5,1,1.5])for(const react of [false,true])for(const dur of [5,10,Infinity])f(k,react,dur);};
// 1. scenario presets identical; engine without a schedule identical for every old and new lever set
const lvSets=[...A.PRESETS.map(p=>["preset "+p.name,p.lv]),...A.PARTIES.map(p=>["old "+p.id,p.lv]),...N.PARTIES.map(p=>["new-noschedule "+p.id,p.lv])];
for(const [nm,lv] of lvSets)grid((k,r,d)=>cmp(nm,A.run(lv,k,r,100,d),N.run(lv,k,r,100,d)));
const presetsSame=same(A.PRESETS,N.PRESETS);
// 2. parties: unchanged ones identical with their (absent) schedule; changed ones listed
const moved={};
for(const p of N.PARTIES){const a=A.PARTIES.find(q=>q.id===p.id);const changed=!same(a.lv,p.lv)||!!p.sched;
 grid((k,r,d)=>{const o=A.run(a.lv,k,r,100,d),q=N.run(p.lv,k,r,100,d,sch(p));for(const key of Object.keys(q))for(const v of q[key])if(!Number.isFinite(v))nan++;if(!changed)cmp("party "+p.id,o,q);});
 if(changed){const o=A.run(a.lv,1,false,20,10),q=N.run(p.lv,1,false,20,10,sch(p));const ks=p.country==="US"?["usG","usPi","usU","def","debt"]:["auG","auPi","auU","auDef","auDebt"];
  moved[p.id]={lv_before:Object.fromEntries(Object.entries(a.lv).filter(([,v])=>v)),lv_after:Object.fromEntries(Object.entries(p.lv).filter(([,v])=>v)),sched:p.sched||null,
   mid_default:Object.fromEntries(ks.map(x=>[x,{yr2:[+o[x][1].toFixed(2),+q[x][1].toFixed(2)],yr10:[+o[x][9].toFixed(2),+q[x][9].toFixed(2)],yr20:[+o[x][19].toFixed(2),+q[x][19].toFixed(2)]}]))};}}
// 3. timing checks
const Z=N.run(N.ZERO,1,false,20,10);const P=(id)=>N.PARTIES.find(p=>p.id===id);
const lnp=P("lnp"),rep=P("rep");const L=N.run(lnp.lv,1,false,20,10,sch(lnp)),R=N.run(rep.lv,1,false,20,10,sch(rep));
const t1=same([L.auG[0],L.auG[1],L.auDef[0],L.auDef[1]],[Z.auG[0],Z.auG[1],Z.auDef[0],Z.auDef[1]]); // Coalition: nothing in 2027-2028
const t2=L.auDef[2]<Z.auDef[2]; // savings from 2029
const R5=N.run(rep.lv,1,false,20,5,sch(rep)),RP=N.run(rep.lv,1,false,20,Infinity,sch(rep));
const t3=same(R.def,R5.def)&&same(R.def,RP.def); // Republican dividend ignores the duration setting
const t4=Math.abs(R.def[5]-Z.def[5])<Math.abs(R.def[1]-Z.def[1]); // after 2031 the extra deficit is smaller than while it is paid
const cnt=N.PARTIES.filter(p=>p.sched).map(p=>p.id);
// One Nation (ECN-05): fuel part fixed 2028-2030; other tax items follow the duration setting. Compare with the same lever set
// where the tax lever is only the other items and has no schedule: equal in 2027 and from 2031, different 2028-2030.
const onp=P("onp"),fuel=onp.schedPart.auTax,other=onp.lv.auTax-fuel;const near=(a,b)=>Math.abs(a-b)<1e-9;
const O=N.run(onp.lv,1,false,20,10,sch(onp)),Oo=N.run({...onp.lv,auTax:other},1,false,20,10);
const onpYears=Object.keys(onp.sched.auTax).map(Number);
const t5=near(O.auDef[0],Oo.auDef[0])&&near(O.auG[0],Oo.auG[0]); // 2027: no fuel cut
const t6=[1,2,3].every(i=>O.auDef[i]>Oo.auDef[i]+0.1); // 2028-2030: bigger deficit while the fuel cut is on
const t7=Math.abs(O.auDef[4]-Oo.auDef[4])<Math.abs(O.auDef[3]-Oo.auDef[3])/2; // from 2031 the gap closes (only lagged effects remain)
const O5=N.run(onp.lv,1,false,20,5,sch(onp)),Oo5=N.run({...onp.lv,auTax:other},1,false,20,5);
const t8=[1,2,3].every(i=>near(O5.auDef[i]-Oo5.auDef[i],O.auDef[i]-Oo.auDef[i])||Math.abs((O5.auDef[i]-Oo5.auDef[i])-(O.auDef[i]-Oo.auDef[i]))<0.05); // fuel part does not depend on the duration setting
const onp_check={total:onp.lv.auTax,fuel,other:+other.toFixed(2),fuel_years:onpYears,yr_2027_same_as_other_only:t5,fuel_years_bigger_deficit:t6,gap_closes_2031:t7,fuel_ignores_duration:t8,
 auDef_2027_2032:[O.auDef.slice(0,6).map(v=>+v.toFixed(3)),Oo.auDef.slice(0,6).map(v=>+v.toFixed(3))]};
// effect of new starting values on the no-change baseline (mid, Taylor off, duration 10)
const eff=(X,Y)=>{const b0=X.run(X.ZERO,1,false,30,10),b1=Y.run(Y.ZERO,1,false,30,10),o={};
 for(const key of Object.keys(b0)){const d=b0[key].map((v,i)=>b1[key][i]-v);const mx=Math.max(...d.map(Math.abs));if(mx>1e-12)o[key]={yr1:+d[0].toFixed(3),yr2:+d[1].toFixed(3),yr10:+d[9].toFixed(3),yr30:+d[29].toFixed(3),max_abs:+mx.toFixed(3)};}return o;};
const y10_effect=eff(A0,A1),inputs_effect=eff(A1,A);
const refY10=A0.B.y10,newY10=N.B.y10;
// Europe table (runEU): UK Bank Rate 3.75 -> 4.00 and Iceland's budget balance 0.0 -> 0.1% surplus. Compares the no-change baseline
// of every country between PREV_REF (default c54b052, before the inputs were matched) and the current source.
const loadAll=(s)=>{const code=s.replace(/^import [\s\S]*?;$/gm,"").replace(/^export default /m,"")+"\nmodule.exports={run,runEU,EU,ZERO};";const m={exports:{}};new Function("module","exports",transformSync(code,{loader:"tsx",format:"cjs",jsx:"transform"}).code)(m,m.exports);return m.exports;};
const PREV=process.env.PREV_REF||"c54b052";
const EP=loadAll(cp.execSync(`git show ${PREV}:src/simulator.tsx`,{cwd:path.join(__dirname,".."),encoding:"utf8",maxBuffer:1e8})),EN=loadAll(fs.readFileSync(path.join(__dirname,"../src/simulator.tsx"),"utf8"));
const eu_effect={};{const bp=EP.run(EP.ZERO,1,false,10,10),bn=EN.run(EN.ZERO,1,false,10,10);
 for(const c of EN.EU){const cp0=EP.EU.find(x=>x.id===c.id);const o0=EP.runEU(cp0,EP.ZERO,{},1,bp,bp,10,10),o1=EN.runEU(c,EN.ZERO,{},1,bn,bn,10,10);const e={};
  for(const key of Object.keys(o1)){for(const v of o1[key])if(!Number.isFinite(v))nan++;const d=o0[key].map((v,i)=>o1[key][i]-v);const mx=Math.max(...d.map(Math.abs));if(mx>1e-12)e[key]={yr1:[+o0[key][0].toFixed(2),+o1[key][0].toFixed(2)],yr2:[+o0[key][1].toFixed(2),+o1[key][1].toFixed(2)],yr5:[+o0[key][4].toFixed(2),+o1[key][4].toFixed(2)],yr10:[+o0[key][9].toFixed(2),+o1[key][9].toFixed(2)]};}
  if(Object.keys(e).length)eu_effect[c.id]=e;}}
const res={values:n,unexpected_diffs:bad,nan_or_inf:nan,scenario_presets_unchanged:presetsSame,parties_with_schedule:cnt,coalition_nothing_2027_28:t1,coalition_saves_from_2029:t2,rep_ignores_duration:t3,rep_stops_after_2031:t4,y10:[refY10,newY10],y10_effect_on_baseline:y10_effect,inputs_matched:INPUTS.slice(1).map(x=>x.join(" -> ")),inputs_effect_on_baseline:inputs_effect,onp_ecn05:onp_check,eu_baseline_effect:eu_effect,moved};
console.log(JSON.stringify(res,null,1));
process.exit(bad||nan||!presetsSame||!t1||!t2||!t3||!t4||!t5||!t6||!t7||!t8?1:0);
