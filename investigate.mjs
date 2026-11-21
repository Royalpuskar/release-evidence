import {assess,sha256,CHECKS} from './investigate-engine.mjs';
const $=id=>document.getElementById(id);
let actual='', generation=0, attestation={};
const controls=new Map();
for(const c of CHECKS){
  const label=document.createElement('label'),input=document.createElement('input');
  input.type='checkbox';input.addEventListener('change',()=>{attestation[c.id]=input.checked;render();});
  controls.set(c.id,input);label.append(input,document.createTextNode(c.label));$('checks').append(label);
}
function clearClaims(){attestation={};for(const input of controls.values())input.checked=false;}
function render(){
  const r=assess({expected:$('expected').value,actual,attestations:attestation});
  $('decision').textContent=r.decision;$('decision').classList.toggle('ready',!r.blockers.length);
  $('actual').textContent='Computed digest: '+(actual||'not available');
  $('trail').replaceChildren(...r.rows.map(row=>{
    const li=document.createElement('li');li.textContent=row.label+' — '+row.state.toUpperCase();li.classList.toggle('good',row.state==='pass'||row.state==='attested');return li;
  }));
  const actions=r.blockers.length?r.blockers.map(row=>row.action):['All configured gates have evidence or a manual claim. A human must independently review before release.'];
  $('blockers').replaceChildren(...actions.map(action=>{const li=document.createElement('li');li.textContent=action;return li;}));
  return r;
}
async function inspect(file){
  const current=++generation;actual='';clearClaims();render();
  $('status').textContent=file?'Computing local SHA-256…':'Select a file to compute its SHA-256.';
  if(!file)return;
  try{const digest=await sha256(file);if(current!==generation)return;actual=digest;clearClaims();$('status').textContent='File bytes hashed locally.';}
  catch(error){if(current!==generation)return;clearClaims();$('status').textContent=error.message;}
  render();
}
$('artifact').addEventListener('change',()=>inspect($('artifact').files[0]));
$('expected').addEventListener('input',()=>{clearClaims();render();});
$('sample').addEventListener('click',()=>{$('artifact').value='';$('expected').value='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';inspect(new Blob(['abc']));});
$('receipt').addEventListener('click',()=>{
  const report=render();const blob=new Blob([JSON.stringify({schema:'release-evidence/investigation-v1',createdAt:new Date().toISOString(),trust:'Local digest comparison and unverified user attestations; not authorization',...report},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='evidence-receipt.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
render();
