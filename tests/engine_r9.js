// Review9 engine regression: the current engine must match the round-2 engine (BASE_REF) exactly for every preset and party,
// low/mid/high, Taylor on/off, durations 5/10/permanent, over 100 years. Only AUD/USD may differ, by the new spot ratio.
// Also checks the dormant ECN-05 hook: no party sets `ends`, and setting one does change output.
const fs=require("fs"),path=require("path"),cp=require("child_process"),{transformSync}=require("esbuild");
const load=(s)=>{const end=s.indexOf("\ntype L = { key");const code=s.slice(0,end).replace(/^import .*$/m,"")+"\nmodule.exports={run,PRESETS,PARTIES,ZERO,B};";const m={exports:{}};new Function("module","exports",transformSync(code,{loader:"ts",format:"cjs"}).code)(m,m.exports);return m.exports;};
const REF=process.env.BASE_REF||"a8d2979";
const A=load(cp.execSync(`git show ${REF}:src/simulator.tsx`,{cwd:path.join(__dirname,".."),encoding:"utf8",maxBuffer:1e8}));
const N=load(fs.readFileSync(path.join(__dirname,"../src/simulator.tsx"),"utf8"));
let n=0,bad=0,nan=0;const ratio=N.B.aud/A.B.aud;
const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
const presetsSame=same(A.PRESETS,N.PRESETS)&&same(A.PARTIES.map(p=>p.lv),N.PARTIES.map(p=>p.lv));
const cases=[...A.PRESETS.map(p=>[p.name,p.lv,undefined]),...A.PARTIES.map(p=>[p.id,p.lv,N.PARTIES.find(q=>q.id===p.id).ends])];
for(const [nm,lv,ends] of cases)for(const k of [0.5,1,1.5])for(const react of [false,true])for(const dur of [5,10,Infinity]){
 const o=A.run(lv,k,react,100,dur),p=N.run(lv,k,react,100,dur,ends);
 for(const key of Object.keys(o))for(let i=0;i<100;i++){n++;const a=o[key][i],b=p[key][i];if(!Number.isFinite(b))nan++;
  if(key==="aud"?Math.abs(b-a*ratio)>1e-12:a!==b){bad++;if(bad<5)console.log("DIFF",nm,key,i,a,b);}}}
const on=N.PARTIES.find(p=>p.id==="onp");const hook=!same(N.run(on.lv,1,false,10,10).auDebt,N.run(on.lv,1,false,10,10,{auTax:2029}).auDebt);
const set=N.PARTIES.filter(p=>p.ends).length;
console.log(JSON.stringify({values:n,unexpected_diffs:bad,nan_or_inf:nan,aud_ratio:+ratio.toFixed(6),preset_levers_unchanged:presetsSame,ends_hook_works:hook,parties_with_ends:set}));
process.exit(bad||nan||!presetsSame||!hook||set?1:0);
