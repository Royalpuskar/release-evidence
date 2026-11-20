
function obj(v){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Expected an object');return v;}
function arr(v,label='array'){if(!Array.isArray(v)||v.length>500)throw Error(label+' must be an array with at most 500 items');return v;}
function str(v){if(typeof v!=='string'||!v.trim()||v.length>100000)throw Error('Expected nonempty text (max 100000 characters)');return v;}
function num(v,label='number',min=-1e12){if(typeof v!=='number'||!Number.isFinite(v)||v<min||Math.abs(v)>1e12)throw Error(label+' must be a finite number in range');return v;}
function bool(v){if(typeof v!=='boolean')throw Error('Expected a boolean');return v;}
function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))throw Error('Expected YYYY-MM-DD');const t=Date.parse(v+'T00:00:00Z');if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==v)throw Error('Invalid calendar date');return t;}
export function run(x){obj(x);if(JSON.stringify(x).length>200000)throw Error('Input exceeds 200 KB limit');

const rows=[];for(const c of arr(x.checks,'checks')){str(c.name);bool(c.passed);rows.push({item:c.name,kind:'check',result:c.passed?'pass':'fail'});}const seen=new Set();for(const a of arr(x.artifacts,'artifacts')){str(a.path);for(const h of [a.expected,a.actual])if(typeof h!=='string'||!/^[0-9a-f]{64}$/i.test(h))throw Error('SHA-256 must be 64 hex characters');rows.push({item:a.path,kind:'artifact',result:seen.has(a.path)?'duplicate':a.expected.toLowerCase()===a.actual.toLowerCase()?'pass':'mismatch'});seen.add(a.path);}return {metrics:{items:rows.length,passed:rows.length>0&&rows.every(r=>r.result==='pass'),issues:rows.filter(r=>r.result!=='pass').length},rows};

}
