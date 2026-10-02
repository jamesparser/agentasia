#!/usr/bin/env python3
"""Fill in the locale files each feature i18n catalog is missing.

The global catalog (src/i18n/locales) ships 23 languages. Every one of the 30
per-feature catalogs ships 5: ar, de, es, fr, ko. A feature catalog's type is
`Record<(typeof en)[number], string>`, i.e. total, so a language is either fully
present or absent, and absent means those screens render English.

The practical effect contradicts the product's whole premise. The languages with
no feature coverage are Thai, Vietnamese, Khmer, Lao, Burmese, Javanese,
Sundanese, Filipino, Cebuano, Bengali, Urdu, Hindi, Chinese, Portuguese and
Polish, which is the population AgentAsia exists for. The six locales that are
marked "reviewed" are English, Arabic, German, Spanish, French and Korean: the
machine-drafted Southeast and South Asian locales get the translated chrome and
an English app underneath it.

Output is unreviewed machine draft, same as the global drafts, and is labelled as
such in the file header. Existing files are never overwritten.

Usage:
  python3 scripts/generate-feature-locale-translations.py            # all catalogs
  python3 scripts/generate-feature-locale-translations.py --dry-run  # report only
"""
import asyncio
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from placeholder_safe_translate import (  # noqa: E402
    placeholders_match,
    protect,
    restore,
    translate,
    translate_protected,
)

ROOT = Path(__file__).resolve().parents[1]

# Codes the app supports, from the `languages` map in src/i18n/locales.ts.
def supported_codes():
    src = (ROOT / 'src/i18n/locales.ts').read_text()
    body = src[src.index('export const languages'): src.index('} as const')]
    codes = re.findall(r"^\s{2}'?([A-Za-z-]{2,5})'?:\s*'", body, re.M)
    return [c for c in codes if c != 'en']


# The endpoint has no `fil`; Filipino is `tl`.
ENDPOINT = {'fil': 'tl'}


def tsq(s):
    """Emit a TypeScript single-quoted literal.

    Newlines have to be escaped, not passed through: several catalogs hold
    multi-line demo strings (a tour script line with the whole example reply in
    one key), and a raw newline inside a single-quoted literal is an
    unterminated-string syntax error. The first version of this escaped only
    `\\` and `'` and produced 1479 broken files.
    """
    return (
        "'"
        + s.replace('\\', '\\\\')
        .replace("'", "\\'")
        .replace('\n', '\\n')
        .replace('\r', '\\r')
        .replace('\t', '\\t')
        + "'"
    )


def read_keys(en_path):
    txt = en_path.read_text()
    m = re.search(r'export const en = \[(.*?)\n\]', txt, re.S)
    if not m:
        raise ValueError('unexpected en.ts shape')
    keys, seen = [], set()
    for line in m.group(1).splitlines():
        km = re.match(r"^\s*'((?:\\.|[^'])*)',?\s*(?://.*)?$", line)
        if not km:
            continue
        try:
            key = eval("'" + km.group(1) + "'")  # noqa: S307 - controlled input
        except Exception:
            continue
        if key in seen:
            continue
        seen.add(key)
        keys.append(key)
    return keys


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


def render(code, keys, values):
    rows = [
        "import { en } from './en'",
        '',
        'type I18n = Record<(typeof en)[number], string>',
        '',
        f'/** Unreviewed machine-translation draft: {code}. Needs native review. */',
        f'export const {code.replace("-", "_")}: I18n = {{',
    ]
    for k in keys:
        rows.append(f'  {tsq(k)}: {tsq(values[k])},')
    rows.append('} as const')
    return '\n'.join(rows) + '\n'


def write_index(d, codes):
    """Rebuild index.ts.

    `zh-CN` and `zh-TW` are valid filenames but not valid identifiers, so the
    import binds the underscore form and the object entry has to be a quoted key
    pointing at it. Emitting `zh-CN,` shorthand is a syntax error, which is what
    the first version of this did.
    """
    imports = ["import { en } from './en'"]
    entries = ['  en,']
    for c in codes:
        ident = c.replace('-', '_')
        imports.append(f"import {{ {ident} }} from './{c}'")
        entries.append(f'  {ident},' if ident == c else f"  '{c}': {ident},")
    text = '\n'.join(
        imports + ['', 'const localI18n = {'] + entries + ['} as const', '', 'export default localI18n']
    )
    (d / 'index.ts').write_text(text + '\n')


async def main():
    dry = '--dry-run' in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    all_codes = supported_codes()
    catalogs = sorted(
        {p.parent for p in (ROOT / 'src').rglob('i18n/en.ts')},
        key=lambda p: str(p),
    )
    total_files = 0
    for d in catalogs:
        if only and not any(o in str(d) for o in only):
            continue
        try:
            keys = read_keys(d / 'en.ts')
        except ValueError as e:
            print(f'SKIP {d}: {e}')
            continue
        have = sorted(
            p.stem for p in d.glob('*.ts')
            if p.stem not in ('en', 'index') and '.meta.' not in p.name
        )
        missing = [c for c in all_codes if c not in have]
        if not missing:
            continue
        rel = str(d.relative_to(ROOT / 'src'))
        print(f'{rel}: {len(keys)} keys, {len(have)} locales, adding {len(missing)}: {", ".join(missing)}')
        if dry:
            total_files += len(missing)
            continue
        for code in missing:
            endpoint = ENDPOINT.get(code, code)
            values = await translate_keys(keys, endpoint)
            bad = [k for k in keys if not placeholders_match(k, values[k])]
            for k in bad:
                values[k] = k  # English beats a broken interpolation
            out = d / f'{code}.ts'
            out.write_text(render(code, keys, values))
            total_files += 1
            if bad:
                print(f'    {code}: {len(bad)} strings kept in English')
        write_index(d, sorted(have + missing))
    print(f'\n{"would write" if dry else "wrote"} {total_files} locale files across {len(catalogs)} catalogs')


asyncio.run(main())
