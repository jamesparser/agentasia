#!/usr/bin/env python3
"""Generate unreviewed draft UI locale maps from src/i18n/locales/en.ts.

Uses Google's public translation endpoint; outputs are drafts requiring native
review, and they are labelled as such in src/i18n/agentasia-locales.ts.

Placeholder safety lives in placeholder_safe_translate.py. This script only
batches, resumes, and writes.
"""
import asyncio
import ast
import json
import re
import sys
from pathlib import Path

from placeholder_safe_translate import (
    placeholders_match,
    protect,
    restore,
    translate,
    translate_protected,
)

ROOT = Path(__file__).resolve().parents[1]
EN = ROOT / 'src/i18n/locales/en.ts'
OUT = ROOT / 'src/i18n/locales'
TARGETS = {
    'ja': 'ja', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'yue': 'yue', 'vi': 'vi',
    'th': 'th', 'id': 'id', 'ms': 'ms', 'fil': 'tl', 'ceb': 'ceb', 'my': 'my',
    'km': 'km', 'lo': 'lo', 'jv': 'jv', 'su': 'su', 'hi': 'hi', 'bn': 'bn',
    'ur': 'ur', 'pt': 'pt', 'pl': 'pl',
}

# Global catalog is an array of single-quoted strings. Preserve key order.
#
# This used to be bytes(s,'utf8').decode('unicode_escape'), which reinterprets
# every UTF-8 byte as Latin-1: a literal ellipsis in a key ('Capturing…') came
# back as 'Capturingâ\x80¦'. That key can never match at runtime, so 38 of 1033
# strings silently stayed English in every locale this script produced.
# ast.literal_eval applies the same escapes TypeScript uses and leaves real
# UTF-8 alone.
def read_keys():
    """The catalog keys, de-duplicated, in first-seen order.

    en.ts is a plain array and repeats some strings (1052 lines, 1033 unique).
    Emitting one object property per line therefore produced duplicate keys,
    which TypeScript rejects with TS1117: an object literal cannot have the same
    property twice. The array form is fine with repeats; the map form is not.
    """
    seen = set()
    keys = []
    for line in EN.read_text().splitlines():
        m = re.match(r"^\s*'((?:\\.|[^'])*)',?\s*(?://.*)?$", line)
        if not m:
            continue
        try:
            key = ast.literal_eval("'" + m.group(1) + "'")
        except (ValueError, SyntaxError):
            continue
        if key in seen:
            continue
        seen.add(key)
        keys.append(key)
    return keys


KEYS = read_keys()


async def translate_batch(group, target):
    """Translate up to 16 keys in one request, keeping placeholders intact.

    Google preserves newlines between batched strings. If a response comes back
    with a different line count the batch is re-done one string at a time, and a
    string whose translation still fails the placeholder round-trip is left as
    English rather than shipped broken.
    """
    # protect() returns (masked_text, {token: '{name}'}).
    masked = [(g,) + protect(g) for g in group]  # (original, masked_text, mapping)
    joined = '\n'.join(m for _, m, _ in masked)
    raw = await asyncio.to_thread(translate, joined, target)
    lines = raw.split('\n') if raw else []
    if len(lines) != len(group):
        results = []
        for g in group:
            out, ok = await asyncio.to_thread(translate_protected, g, target)
            results.append(out if ok else g)
        return results
    out = []
    for (original, _masked_text, mapping), line in zip(masked, lines):
        restored = restore(line, mapping)
        if not placeholders_match(original, restored):
            retry, ok = await asyncio.to_thread(translate_protected, original, target)
            restored = retry if ok else original
        out.append(restored)
    return out


async def generate(code, target):
    path = OUT / f'{code}.draft.ts'
    progress = path.with_suffix('.json')
    existing = {}
    if progress.exists():
        try:
            existing = json.loads(progress.read_text())
        except json.JSONDecodeError:
            existing = {}
    sem = asyncio.Semaphore(8)

    async def guarded(group):
        async with sem:
            return await translate_batch(group, target)

    missing = [k for k in KEYS if k not in existing]
    groups = [missing[i:i + 16] for i in range(0, len(missing), 16)]
    values = dict(existing)
    # gather() preserves argument order, so one zip per group is exact. The
    # semaphore caps concurrency; the requests themselves run in threads.
    for group, translated in zip(groups, await asyncio.gather(*(guarded(g) for g in groups))):
        values.update(zip(group, translated))
        # Save progress so a long draft run can safely resume.
        progress.write_text(json.dumps(values, ensure_ascii=False, indent=2) + '\n')

    rows = [
        "import type { I18n } from '@/i18n/locales'",
        '',
        f'/** Unreviewed machine-translation draft: {code}. */',
        f'export const {code.replace("-", "_")}: Partial<I18n> = {{',
    ]
    for key in KEYS:
        rows.append('  ' + json.dumps(key, ensure_ascii=False) + ': '
                    + json.dumps(values[key], ensure_ascii=False) + ',')
    rows.append('}')
    path.write_text('\n'.join(rows) + '\n')
    broken = sum(1 for k in KEYS if not placeholders_match(k, values[k]))
    print(f'{code} {len(KEYS)} keys, {broken} with unresolved placeholders', file=sys.stderr)


async def main():
    requested = sys.argv[1:] or list(TARGETS)
    for code in requested:
        if code not in TARGETS:
            raise SystemExit(f'Unknown locale: {code}')
        await generate(code, TARGETS[code])


asyncio.run(main())
