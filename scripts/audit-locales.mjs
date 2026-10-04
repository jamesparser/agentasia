// Usage: node scripts/audit-locales.mjs src/i18n/locales
// Counts, per locale: keys present, English passthrough, broken placeholders, brand name changed.
// Missing counts include keys defined outside the one-line format this script reads, so compare locales to each other, not to zero.
import fs from 'node:fs'
const dir=process.argv[2]
const en=fs.readFileSync(dir+'/en.ts','utf8')
const keys=[...en.matchAll(/^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"),?\s*$/gm)].map(m=>(m[1]??m[2]).replace(/\\'/g,"'").replace(/\\\\/g,'\\'))
const un=s=>s.replace(/\\'/g,"'").replace(/\\u([0-9a-f]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/\\\\/g,'\\')
const langs=fs.readdirSync(dir).filter(f=>/^[a-zA-Z-]+\.ts$/.test(f)&&!/^(index|en)\./.test(f)).map(f=>f.slice(0,-3))
const ph=s=>(s.match(/\{[^}]*\}|%[sd]/g)||[]).sort().join('|')
const out={}
for(const l of langs){
  const src=fs.readFileSync(`${dir}/${l}.ts`,'utf8')
  const map=new Map()
  for(const m of src.matchAll(/^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"):\s*(?:\n\s*)?(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)'?),?\s*$/gm)) map.set(un(m[1]??m[2]),un(m[3]??m[4]))
  const r={total:keys.length,present:0,missing:0,same:0,empty:0,placeholder:[],brand:[],dash:0}
  for(const k of keys){
    const v=map.get(k)
    if(v===undefined){r.missing++;continue}
    r.present++
    if(!v.trim())r.empty++
    else if(v===k&&/[a-z]{4}/i.test(k)&&!/^[A-Z0-9 .\-\/+:]+$/.test(k))r.same++
    if(ph(k)!==ph(v))r.placeholder.push(k)
    if(/AgentAsia/.test(k)&&!/AgentAsia/.test(v))r.brand.push(k)
    if(/[–—]/.test(v)&&!/[–—]/.test(k))r.dash++
  }
  out[l]=r
}
for(const [l,r] of Object.entries(out))console.log(l.padEnd(6),`present ${r.present}/${r.total}`,`missing ${r.missing}`,`english-passthrough ${r.same}`,`empty ${r.empty}`,`placeholder ${r.placeholder.length}`,`brand ${r.brand.length}`,`dash ${r.dash}`)
fs.writeFileSync(process.env.HOME+'/audit.json',JSON.stringify(out,null,1))
