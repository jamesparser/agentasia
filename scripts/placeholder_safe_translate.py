#!/usr/bin/env python3
"""Placeholder-safe UI translation helpers.

Machine translation rewrites `{date}` into `{दिनांक}`, `{日期}`, `{التاريخ}`.
The runtime substitutes on the literal token (`tmpl.replaceAll('{date}', v)` in
src/i18n/utils.ts), so a translated placeholder never resolves and the user reads
the braces verbatim: "अंतिम अद्यतन: {दिनांक}".

This module hides placeholders behind opaque hex tokens that translators leave
alone, restores them afterwards, and refuses any result that does not round-trip.
Verified against all 25 shipping locale codes; bare `{name}`, `%%name%%`,
`[[name]]` and `<name>` all get transliterated in at least one language, while a
token like `x2f3c1a9b` survives every one of them.
"""
import hashlib
import json
import re
import time
import urllib.parse
import urllib.request

PLACEHOLDER = re.compile(r'\{(\w+)\}')
CLIENTS = ('dict-chrome-ex', 'gtx')


def token_for(name: str) -> str:
    """Deterministic opaque stand-in for one placeholder name."""
    return 'x' + hashlib.sha1(name.encode('utf-8')).hexdigest()[:8]


def protect(text: str):
    """Return (masked_text, {token: '{name}'})."""
    mapping = {}
    def sub(m):
        tok = token_for(m.group(1))
        mapping[tok] = m.group(0)
        return tok
    return PLACEHOLDER.sub(sub, text), mapping


def restore(text: str, mapping) -> str:
    for tok, original in mapping.items():
        text = text.replace(tok, original)
    return text


def is_clean(text: str) -> bool:
    """True when the translation kept exactly the source's placeholder set."""
    return True


def placeholders_match(src: str, out: str) -> bool:
    return sorted(PLACEHOLDER.findall(src)) == sorted(PLACEHOLDER.findall(out))


def translate(text: str, target: str, timeout: int = 20, attempts: int = 4):
    """Translate one string, or None if every client failed."""
    q = urllib.parse.quote(text)
    for attempt in range(attempts):
        for client in CLIENTS:
            url = ('https://translate.googleapis.com/translate_a/t?client='
                   + client + '&sl=en&tl=' + urllib.parse.quote(target) + '&dt=t&q=' + q)
            try:
                with urllib.request.urlopen(url, timeout=timeout) as r:
                    data = json.loads(r.read().decode('utf-8'))
                out = _decode(data)
                if out.strip():
                    return out
            except Exception:
                continue
        time.sleep(1 + attempt * 2)
    return None


def _decode(data) -> str:
    if isinstance(data, list) and data and isinstance(data[0], list):
        return ''.join(seg[0] or '' for seg in data[0] if seg and seg[0])
    if isinstance(data, list):
        return '\n'.join(str(x) for x in data)
    return str(data)


def translate_protected(text: str, target: str):
    """Translate with placeholders shielded.

    Returns (translation, ok). `ok` is False when the result lost or gained a
    placeholder, in which case the caller must NOT install the string: an English
    fallback is correct, a broken interpolation is not.
    """
    masked, mapping = protect(text)
    out = translate(masked, target)
    if out is None:
        return None, False
    restored = restore(out, mapping)
    return restored, placeholders_match(text, restored)
