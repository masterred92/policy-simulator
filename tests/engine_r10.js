// Review10 engine regression (also covers the 9 Nov 2026 data refresh) (party presets approved: ECN-02, 03, 04, 05, 28 in the Greens preset).
// Compares the current engine with BASE_REF (default b697469) over every scenario preset and party, low/mid/high,
// Taylor on/off, durations 5/10/permanent, 100 years. Scenario presets and unchanged parties must match exactly;
// the engine with no schedule must match exactly; changed parties are listed with what moved. Also checks schedule timing.
const fs=require("fs"),path=require("path"),cp=require("child_process"),{transformSync}=require("esbuild");
const load=(s)=>{const end=s.indexOf("\ntype L = { key");const code=s.slice(0,end).replace(/^import .*$/m,"")+"\nmodule.exports={run,PRESETS,PARTIES,ZERO,B};";const m={exports:{}};new Function("module","exports",transformSync(code,{loader:"ts",format:"cjs"}).code)(m,m.exports);return m.exports;};
const REF=process.env.BASE_REF||"b697469";
const REFSRC=cp.execSync(`git show ${REF}:src/simulator.tsx`,{cwd:path.join(__dirname,".."),encoding:"utf8",maxBuffer:1e8});
// 9 Nov 2026 data refresh: the only engine constant changed is the US 10-year yield (4.91 -> 4.88). The reference gets the same
// constant so the comparison isolates the preset changes; the yield's own effect is reported separately (y10_effect).
const A0=load(REFSRC),A=load(REFSRC.replace("y10: 4.91,","y10: 4.88,"));
const N=load(fs.readFileSync(path.join(__dirname,"../src/simulator.tsx"),"utf8"));
const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
const sch=(p)=>{if(!p.sched)return undefined;const o={};for(const k of Object.keys(p.sched))if(p.lv[k]!==0)o[k]={s:p.lv[k],p:p.sched[k]};return Object.keys(o).length?o:undefined;};
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
// effect of the yield refresh alone on the no-change baseline (mid, Taylor off, duration 10)
const b0=A0.run(A0.ZERO,1,false,30,10),b1=A.run(A.ZERO,1,false,30,10);const y10_effect={};
for(const key of Object.keys(b0)){const d=b0[key].map((v,i)=>b1[key][i]-v);const mx=Math.max(...d.map(Math.abs));if(mx>1e-12)y10_effect[key]={yr1:+d[0].toFixed(3),yr2:+d[1].toFixed(3),yr10:+d[9].toFixed(3),yr30:+d[29].toFixed(3),max_abs:+mx.toFixed(3)};}
const refY10=A0.B.y10,newY10=N.B.y10;
const res={values:n,unexpected_diffs:bad,nan_or_inf:nan,scenario_presets_unchanged:presetsSame,parties_with_schedule:cnt,coalition_nothing_2027_28:t1,coalition_saves_from_2029:t2,rep_ignores_duration:t3,rep_stops_after_2031:t4,y10:[refY10,newY10],y10_effect_on_baseline:y10_effect,moved};
console.log(JSON.stringify(res,null,1));
process.exit(bad||nan||!presetsSame||!t1||!t2||!t3||!t4?1:0);
