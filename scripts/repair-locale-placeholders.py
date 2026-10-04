#!/usr/bin/env python3
"""Re-translate the locale strings whose `{placeholders}` the MT pass mangled.

Machine translation rewrote `{date}` into `{दिनांक}`, `{类别}`, `{ตัวแทน}` and
similar. src/i18n/utils.ts substitutes on the literal token, so those strings
render the braces to the user instead of the value.

Only the broken keys are re-translated. Everything else in the file is preserved
byte for byte, including key order, and a string that still cannot be fixed is
dropped from the map so t() falls back to English. An English string is correct;
an interpolated-looking string with no interpolation is not.

Usage:
  python3 scripts/repair-locale-placeholders.py            # report only
  python3 scripts/repair-locale-placeholders.py --write    # apply
"""
import ast
import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from placeholder_safe_translate import placeholders_match, translate_protected  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ROOT / 'src/i18n/locales'


# The endpoint has no `fil` code; Filipino is `tl`. Same map the generator uses.
ENDPOINT = {'fil': 'tl'}


def parse_body(txt):
    """Return (header, ordered dict, footer) for a `export const x = {...}` file."""
    m = re.search(r'export const \w+(?::[^=]*)? = \{', txt)
    if not m:
        raise ValueError('no object literal found')
    header = txt[: m.end()]
    obj_src = txt[m.end(): txt.rindex('}')]
    # Some locale files carry whole-line `//` section comments, which
    # ast.literal_eval rejects. Only full-line comments are stripped: a `//`
    # inside a value (a URL) sits on the same line as its key and must survive.
    obj_src = '\n'.join(
        line for line in obj_src.splitlines() if not re.match(r'^\s*//', line)
    )
    # Keys are legal in TypeScript either quoted or as bare identifiers
    # (`Strength:`, `weak:`). Python needs them all quoted. Only touch a bare
    # identifier in key position, never inside a value.
    obj_src = re.sub(r'(?m)^(\s+)([A-Za-z_$][\w$]*)(\s*):', r"\1'\2'\3:", obj_src)
    body = ast.literal_eval('{' + obj_src + '}')
    return header, body, txt[txt.rindex('}'):]


def ts_quote(s):
    """Quote a Python string the way this repo's prettier config emits it."""
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


ENTRY = re.compile(
    # 'key': 'value',   OR   'key':\n    'value',
    r"(?P<head>\{KEY\}\s*:\s*)(?P<value>'(?:\\.|[^'\\])*')(?P<tail>\s*,)",
)


def replace_entry(txt, key, new_value_or_None):
    """Swap one entry's value in place, or delete the entry.

    In-place editing rather than a full rewrite keeps the section comments and
    prettier's existing line wrapping. Returns (text, changed).
    """
    # The key may appear quoted or as a bare identifier; both are legal TS.
    q = re.escape(ts_quote(key))
    bare = re.escape(key) if re.fullmatch(r'[A-Za-z_$][\w$]*', key) else None
    key_alt = f'(?:{q}|{bare})' if bare else q
    pat = re.compile(
        ENTRY.pattern.replace(r'\{KEY\}', key_alt), re.M
    )
    m = pat.search(txt)
    if not m:
        return txt, False
    if new_value_or_None is None:
        # Remove the whole entry, including its trailing newline and indent.
        start = txt.rindex('\n', 0, m.start()) + 1
        end = m.end()
        if end < len(txt) and txt[end] == '\n':
            end += 1
        return txt[:start] + txt[end:], True
    return txt[: m.start('value')] + ts_quote(new_value_or_None) + txt[m.end('value'):], True


async def repair(code, path, write):
    txt = path.read_text()
    try:
        _header, body, _footer = parse_body(txt)
    except ValueError as e:
        print(f'{code}: skipped ({e})')
        return 0, 0
    broken = {k: v for k, v in body.items() if not placeholders_match(k, v)}
    if not broken:
        return 0, 0
    endpoint = ENDPOINT.get(code, code)
    fixed, dropped = 0, 0
    for k, old in broken.items():
        out, ok = await asyncio.to_thread(translate_protected, k, endpoint)
        if ok and out:
            txt, changed = replace_entry(txt, k, out)
        else:
            # Drop it: t() falls back to English, which is correct. Shipping
            # `{एन} मॉडल` to a Hindi user is not.
            txt, changed = replace_entry(txt, k, None)
        if not changed:
            print(f'    !! {code}: could not locate entry {k[:40]!r}')
            continue
        if out and ok:
            fixed += 1
        else:
            dropped += 1
    print(f'{code}: {len(broken)} broken -> {fixed} repaired, {dropped} dropped to English')
    for k, v in list(broken.items())[:2]:
        print(f'    was: {v[:60]!r}')
    if write and (fixed or dropped):
        path.write_text(txt)
    return fixed, dropped


async def main():
    write = '--write' in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    total_fixed = total_dropped = 0
    files = sorted(p for p in LOCALES.glob('*.ts')
                   if p.name != 'en.ts' and '.meta.' not in p.name and '.draft.' not in p.name
                   and 'index' not in p.name)
    for p in files:
        code = p.name[:-3]
        if only and code not in only:
            continue
        f, d = await repair(code, p, write)
        total_fixed += f
        total_dropped += d
    print(f'\ntotal: {total_fixed} repaired, {total_dropped} dropped to English'
          + ('' if write else '  (dry run, pass --write to apply)'))


asyncio.run(main())
