#!/usr/bin/env python3
"""Generate unreviewed draft UI locale maps from src/i18n/locales/en.ts.
Uses Google's public translation endpoint; outputs are drafts requiring native review.
"""
import asyncio, json, re, sys, urllib.parse, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
EN=ROOT/'src/i18n/locales/en.ts'
OUT=ROOT/'src/i18n/locales'
TARGETS={'ja':'ja','zh-CN':'zh-CN','zh-TW':'zh-TW','yue':'yue','vi':'vi','th':'th','id':'id','ms':'ms','fil':'tl','ceb':'ceb','my':'my','km':'km','lo':'lo','jv':'jv','su':'su','hi':'hi','bn':'bn','ur':'ur'}
# Global catalog is an array of single-quoted strings. Preserve key order and escapes.
keys=[]
for line in EN.read_text().splitlines():
    m=re.match(r"^\s*'((?:\\.|[^'])*)',?\s*(?://.*)?$", line)
    if m: keys.append(bytes(m.group(1),'utf8').decode('unicode_escape'))

async def request(text, target):
    url='https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl='+urllib.parse.quote(target)+'&dt=t&q='+urllib.parse.quote(text)
    def go():
        with urllib.request.urlopen(url, timeout=20) as r: return ''.join(x[0] for x in json.load(r)[0])
    for attempt in range(4):
        try: return await asyncio.to_thread(go)
        except Exception:
            await asyncio.sleep(1 + attempt*2)
    return text

async def generate(code,target):
    path=OUT/f'{code}.draft.ts'
    existing={}
    sem=asyncio.Semaphore(8)
    async def batch(group):
        # Google preserves line breaks for UI-label batches. If a translation
        # changes line count, safely fall back to individual requests.
        async with sem: translated=await request('\n'.join(group),target)
        lines=translated.split('\n')
        if len(lines)!=len(group):
            return await asyncio.gather(*(request(key,target) for key in group))
        return lines
    missing=[k for k in keys if k not in existing]
    groups=[missing[i:i+16] for i in range(0,len(missing),16)]
    values=dict(existing)
    for group in groups:
        values.update(zip(group, await batch(group)))
        # Save progress so a long draft run can safely resume.
        path.with_suffix('.json').write_text(json.dumps(values,ensure_ascii=False,indent=2)+'\n')
    rows=['import type { I18n } from \'@/i18n/locales\'','',f'/** Unreviewed machine-translation draft: {code}. */',f'export const {code.replace("-", "_")}: Partial<I18n> = {{']
    for key in keys:
        rows.append('  '+json.dumps(key,ensure_ascii=False)+': '+json.dumps(values[key],ensure_ascii=False)+',')
    rows.append('}')
    path.write_text('\n'.join(rows)+'\n')
    print(code, len(keys), file=sys.stderr)

async def main():
    requested=sys.argv[1:] or list(TARGETS)
    for code in requested:
        if code not in TARGETS: raise SystemExit(f'Unknown locale: {code}')
        await generate(code,TARGETS[code])
asyncio.run(main())
