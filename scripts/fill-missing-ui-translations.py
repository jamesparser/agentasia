#!/usr/bin/env python3
"""Fill only the untranslated UI strings in src/i18n/locales/<code>.ts.

Why this exists
---------------
`generate-draft-ui-translations.py` writes a *separate* `.draft.ts` per locale
and translates every key from scratch. Two problems with using it here: nothing
imports `.draft.ts`, and translating every key would overwrite the human work
already sitting in the real locale files. This script instead appends only the
keys the locale is actually missing, and leaves every existing entry untouched.

Machine translation is still not review
---------------------------------------
`AGENTASIA_LOCALE_STATUS` in src/i18n/agentasia-locales.ts is deliberately left
alone. These locales stay 'fallback': a Google translation is not a reviewed
translation, and src/i18n/locales.ts documents that content must not claim a
locale is complete before its pack has been reviewed. Filling the strings makes
the UI readable in the target language; it does not make it certified, and the
status flag keeps saying so.

Placeholder integrity
---------------------
A `{productName}` that Google drops or reorders is not a cosmetic problem - the
runtime interpolates by name, so a lost placeholder renders a literal brace
expression at the user. Every candidate is checked for the exact placeholder set
of its key; failures are retried one at a time and, if still wrong, skipped so
the key keeps its English fallback rather than shipping broken.
"""

from __future__ import annotations

import asyncio
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EN = ROOT / "src/i18n/locales/en.ts"
OUT = ROOT / "src/i18n/locales"

# Same target map as generate-draft-ui-translations.py.
TARGETS = {
    "ja": "ja", "zh-CN": "zh-CN", "zh-TW": "zh-TW", "yue": "yue", "vi": "vi",
    "th": "th", "id": "id", "ms": "ms", "fil": "tl", "ceb": "ceb", "my": "my",
    "km": "km", "lo": "lo", "jv": "jv", "su": "su", "hi": "hi", "bn": "bn",
    "ur": "ur",
    # The five locales AGENTASIA_LOCALE_STATUS calls 'reviewed' still need the
    # strings added after their pack was reviewed; excluding them here would
    # leave new UI text in English on exactly the locales that are shipped as
    # complete.
    "de": "de", "es": "es", "fr": "fr", "ko": "ko", "ar": "ar",
}

KEY_LINE = re.compile(r"^\s*'((?:\\.|[^'])*)',?\s*(?://.*)?$")
ENTRY = re.compile(
    r"^\s*((?:\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*'))\s*:\s*"
    r"((?:\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')(?:\s*\+\s*(?:\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*'))*)\s*,?\s*$"
)
# A key is either a quoted string or a bare identifier at the start of a
# line, followed by a colon. Bare identifiers do appear in these files
# (`Scientists: '...'`), and missing them caused re-added duplicate keys.
KEY_AT_LINE_START = re.compile(
    r"^[ \t]*((?:\"[^\"]*\"|\x27(?:\\.|[^\x27\\])*\x27|[A-Za-z_$][A-Za-z0-9_$]*))[ \t]*:",
    re.M,
)

PLACEHOLDER = re.compile(r"\{[A-Za-z_][A-Za-z0-9_]*\}")
# Characters Google sometimes strips that must survive: the app renders them.
KEEP_CHARS = ("%", "$", "#", "*", "_", "|", "\n")


def en_keys() -> list[str]:
    keys: list[str] = []
    for line in EN.read_text(encoding="utf-8").splitlines():
        m = KEY_LINE.match(line)
        if m:
            keys.append(js_unescape(m.group(1)))
    return list(dict.fromkeys(keys))


def js_unescape(body: str) -> str:
    """Decode JS string escapes without destroying non-ASCII.

    bytes(body, 'utf8').decode('unicode_escape') is the tempting one-liner and
    it is wrong: it turns every multi-byte character into mojibake, which is how
    the `...` -> `\u00e2\u0080\u00a6` corruption got into these files in the
    first place. Keys containing a curly apostrophe then failed to match their
    English counterpart and looked untranslated when they were not.
    """
    out: list[str] = []
    i = 0
    simple = {
        "n": "\n", "t": "\t", "r": "\r", "\\": "\\", "\x27": "\x27",
        '"': '"', "0": "\0", "b": "\b", "f": "\f", "v": "\v",
    }
    while i < len(body):
        ch = body[i]
        if ch == "\\" and i + 1 < len(body):
            nxt = body[i + 1]
            if nxt == "u" and i + 6 <= len(body):
                hexs = body[i + 2 : i + 6]
                try:
                    out.append(chr(int(hexs, 16)))
                    i += 6
                    continue
                except ValueError:
                    pass
            if nxt in simple:
                out.append(simple[nxt])
                i += 2
                continue
            out.append(nxt)
            i += 2
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def unquote(token: str) -> str:
    token = token.strip()
    if not token:
        return token
    if token[0] == '"':
        try:
            return json.loads(token)
        except Exception:
            return token
    if token[0] == "\x27":
        return js_unescape(token[1:-1])
    return token  # bare identifier key


def existing_keys(code: str) -> set[str]:
    """Keys are a quoted string at the start of a line followed by a colon.

    Entries wrap onto two lines when the value is long, so a line-by-line
    key:value match silently misses them - which duplicated keys that already
    existed and made the object literal invalid.
    """
    path = OUT / f"{code}.ts"
    if not path.exists():
        return set()
    text = path.read_text(encoding="utf-8")
    found: set[str] = set()
    for m in KEY_AT_LINE_START.finditer(text):
        try:
            found.add(unquote(m.group(1)))
        except Exception:
            continue
    return found


def sq(value: str) -> str:
    """Emit a single-quoted JS string matching the files' existing style."""
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


async def request(text: str, target: str) -> str:
    url = (
        "https://translate.googleapis.com/translate_a/single"
        f"?client=gtx&sl=en&tl={urllib.parse.quote(target)}&dt=t&q="
        + urllib.parse.quote(text)
    )

    def go() -> str:
        with urllib.request.urlopen(url, timeout=25) as r:
            return "".join(x[0] for x in json.load(r)[0] if x and x[0])

    for attempt in range(4):
        try:
            return await asyncio.to_thread(go)
        except Exception:
            if attempt == 3:
                return text
            await asyncio.sleep(1 + attempt * 2)
    return text


def placeholders(text: str) -> set[str]:
    return set(PLACEHOLDER.findall(text))


def ok_translation(key: str, value: str) -> bool:
    if not value or not value.strip():
        return False
    if placeholders(key) != placeholders(value):
        return False
    # A key that never had a newline must not gain one from a batch response.
    if "\n" in key and value.count("\n") != key.count("\n"):
        return False
    if "\n" not in key and "\n" in value:
        return False
    return True


async def translate_batch(group: list[str], target: str) -> list[str]:
    """Translate a group; fall back to one-by-one if line counts drift."""
    joined = "\n".join(group)
    out = await request(joined, target)
    lines = out.split("\n")
    if len(lines) == len(group):
        return lines
    return list(await asyncio.gather(*(request(k, target) for k in group)))


async def fill(code: str, limit: int | None, sem: asyncio.Semaphore) -> dict:
    target = TARGETS[code]
    keys = en_keys()
    have = existing_keys(code)
    missing = [k for k in keys if k not in have]
    if limit:
        missing = missing[:limit]

    groups = [missing[i : i + 16] for i in range(0, len(missing), 16)]
    results: dict[str, str] = {}
    skipped: list[str] = []

    async def run(group: list[str]) -> None:
        async with sem:
            try:
                translated = await translate_batch(group, target)
            except Exception:
                translated = group
            for key, value in zip(group, translated):
                if ok_translation(key, value):
                    results[key] = value
                else:
                    # Retry alone: batch alignment is the usual culprit.
                    try:
                        solo = await request(key, target)
                    except Exception:
                        solo = key
                    if ok_translation(key, solo):
                        results[key] = solo
                    else:
                        skipped.append(key)

    await asyncio.gather(*(run(g) for g in groups))

    if results:
        path = OUT / f"{code}.ts"
        text = path.read_text(encoding="utf-8")
        idx = text.rstrip().rfind("}")
        assert idx > 0, f"{code}: no closing brace"
        block = "".join(
            f"  {sq(k)}: {sq(v)},\n" for k, v in sorted(results.items())
        )
        path.write_text(text[:idx] + block + text[idx:], encoding="utf-8")

    return {
        "locale": code,
        "en_keys": len(keys),
        "before": len(have),
        "added": len(results),
        "skipped": len(skipped),
        "missing_after": len(missing) - len(results),
    }


async def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    limit = None
    for a in sys.argv[1:]:
        if a.startswith("--limit="):
            limit = int(a.split("=")[1])
    codes = args or list(TARGETS)
    for c in codes:
        if c not in TARGETS:
            raise SystemExit(f"Unknown locale: {c}")

    sem = asyncio.Semaphore(6)
    print(f"{'locale':8} {'en keys':>8} {'had':>6} {'added':>6} {'skip':>5} {'missing after':>14}")
    total_added = total_skip = 0
    for c in codes:
        r = await fill(c, limit, sem)
        total_added += r["added"]
        total_skip += r["skipped"]
        print(
            f"{r['locale']:8} {r['en_keys']:>8} {r['before']:>6} {r['added']:>6} "
            f"{r['skipped']:>5} {r['missing_after']:>14}"
        )
    print(f"\nadded {total_added} translations, skipped {total_skip} unsafe ones")


if __name__ == "__main__":
    asyncio.run(main())
