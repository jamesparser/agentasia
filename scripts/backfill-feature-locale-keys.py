#!/usr/bin/env python3
"""Add the en keys the feature-catalog generator skipped, without re-translating.

Why this exists
---------------
`generate-feature-locale-translations.py` read the English catalog with one
regex that only matched single-quoted entries. Three shapes fell through it:

1. Double-quoted entries, used whenever the string itself contains an apostrophe
   ("Soon you'll be able to discover and install community-built apps...").
2. Backtick template literals, used for the multi-line demo scripts in the tour
   video catalogs. Those run past the end of a single line entirely.
3. Anything else that is not `  '...',` on one line.

The type is `Record<(typeof en)[number], string>`, which is total, so a catalog
that never saw those keys cannot satisfy it: `tsc` reports 80 files, four
catalogs x twenty locales, each missing 1 to 5 properties.

Re-running the generator would re-translate roughly 160 000 already-correct
strings to fix 300 missing ones, and would churn every value a reviewer might
have started from. This script instead computes the missing key set per file,
translates only those, and appends them. Existing entries are never touched.

Placeholder integrity is inherited from `placeholder_safe_translate`: a result
that loses or invents a `{token}` is discarded and the key stays in English,
because a broken interpolation is worse than an untranslated string.

Usage:
  python3 scripts/backfill-feature-locale-keys.py --dry-run
  python3 scripts/backfill-feature-locale-keys.py
"""
from __future__ import annotations

import asyncio
import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))

from placeholder_safe_translate import (  # noqa: E402
    placeholders_match,
    protect,
    restore,
    translate,
    translate_protected,
)


def _load(name):
    """Import a tracked sibling script whose filename contains dashes."""
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / f'{name}.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


fill = _load('fill-missing-ui-translations')
js_unescape = fill.js_unescape

QUOTE_ENTRY = re.compile(
    r"^[ \t]*((?:'(?:\\.|[^'])*')|(?:\"(?:\\.|[^\"])*\")|[A-Za-z_$][A-Za-z0-9_$]*)[ \t]*:",
    re.M,
)


def parse_en_keys(path: Path) -> list[str]:
    """Every string literal in `export const en = [...]`, in order."""
    text = path.read_text(encoding='utf-8')
    m = re.search(r'export\s+const\s+en\s*=\s*\[', text)
    if not m:
        raise ValueError('not an array-shaped en catalog')
    keys: list[str] = []
    i, n = m.end(), len(text)
    while i < n:
        ch = text[i]
        if ch in ' \t\r\n,':
            i += 1
            continue
        if ch == ']':
            break
        if ch == '/' and i + 1 < n and text[i + 1] == '/':
            close = text.find('\n', i)
            i = n if close == -1 else close + 1
            continue
        if ch == '/' and i + 1 < n and text[i + 1] == '*':
            close = text.find('*/', i)
            i = n if close == -1 else close + 2
            continue
        if ch in ('"', "'", '`'):
            j, buf = i + 1, []
            while j < n:
                c = text[j]
                if c == '\\':
                    buf.append(text[j:j + 2])
                    j += 2
                    continue
                if c == ch:
                    break
                buf.append(c)
                j += 1
            keys.append(js_unescape(''.join(buf)))
            i = j + 1
            continue
        i += 1
    return list(dict.fromkeys(keys))


def present_keys(path: Path) -> set[str]:
    out = set()
    for token in QUOTE_ENTRY.findall(path.read_text(encoding='utf-8')):
        out.add(fill.unquote(token))
    return out


def tsq(s: str) -> str:
    """One-line TypeScript single-quoted literal. Newlines must be escaped."""
    return (
        "'"
        + s.replace('\\', '\\\\')
        .replace("'", "\\'")
        .replace('\n', '\\n')
        .replace('\r', '\\r')
        .replace('\t', '\\t')
        + "'"
    )


ENDPOINT = {'fil': 'tl'}


async def translate_keys(keys, endpoint):
    """Batch 16 per request, mask placeholders, retry individually on mismatch."""
    out = {}
    groups = [keys[i:i + 16] for i in range(0, len(keys), 16)]

    async def one(group):
        masked = [(g,) + protect(g) for g in group]
        joined = '\n'.join(m for _, m, _ in masked)
        raw = await asyncio.to_thread(translate, joined, endpoint)
        lines = raw.split('\n') if raw else []
        if len(lines) != len(group):
            res = {}
            for g in group:
                t, ok = await asyncio.to_thread(translate_protected, g, endpoint)
                res[g] = t if ok and t else g
            return res
        res = {}
        for (original, _mt, mapping), line in zip(masked, lines):
            restored = restore(line, mapping)
            if not placeholders_match(original, restored):
                retry, ok = await asyncio.to_thread(translate_protected, original, endpoint)
                restored = retry if ok else original
            res[original] = restored
        return res

    sem = asyncio.Semaphore(6)

    async def guarded(g):
        async with sem:
            return await one(g)

    for result in await asyncio.gather(*(guarded(g) for g in groups)):
        out.update(result)
    return out


async def main():
    dry = '--dry-run' in sys.argv
    catalogs = sorted(
        {p.parent for p in (ROOT / 'src').rglob('i18n/en.ts')}, key=str,
    )
    total_files = total_keys = 0
    skipped: list[str] = []
    for d in catalogs:
        try:
            keys = parse_en_keys(d / 'en.ts')
        except ValueError as e:
            print(f'SKIP {d.relative_to(ROOT)}: {e}')
            continue
        locales = sorted(
            p for p in d.glob('*.ts')
            if p.stem not in ('en', 'index') and '.meta.' not in p.name
        )
        have = sorted(p.stem for p in locales)
        rel = str(d.relative_to(ROOT))
        for p in locales:
            missing = [k for k in keys if k not in present_keys(p)]
            if not missing:
                continue
            preview = ', '.join(repr(k[:38]) for k in missing[:4])
            if dry:
                print(f'{rel}/{p.name}: +{len(missing)} [{preview}]')
                total_files += 1
                total_keys += len(missing)
                continue
            values = await translate_keys(missing, ENDPOINT.get(p.stem, p.stem))
            bad = [k for k in missing if not placeholders_match(k, values[k])]
            for k in bad:
                values[k] = k
            text = p.read_text(encoding='utf-8')
            cut = text.rindex('\n}')
            rows = ''.join(f'  {tsq(k)}: {tsq(values[k])},\n' for k in missing)
            p.write_text(text[:cut + 1] + rows + text[cut + 1:], encoding='utf-8')
            total_files += 1
            total_keys += len(missing)
            note = f', {len(bad)} kept in English' if bad else ''
            print(f'{rel}/{p.name}: +{len(missing)}{note}')
            if set(missing) - set(values):
                skipped.append(f'{rel}/{p.name}')
    print(
        f'\n{"would add" if dry else "added"} {total_keys} keys across '
        f'{total_files} files in {len(catalogs)} catalogs'
    )
    if skipped:
        print('files with keys that never got a value:', skipped)


asyncio.run(main())
