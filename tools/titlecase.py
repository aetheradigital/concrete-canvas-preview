#!/usr/bin/env python3
"""Title Case for headings, buttons, labels, tags and eyebrow lines.

AP-style rules: capitalize every word except articles, coordinating
conjunctions and prepositions of three letters or fewer, unless the word
starts the line or follows sentence/phrase punctuation (. : ! ? — · |).
Body copy, ad primary text and questions are left alone.

    python3 tools/titlecase.py file.html [file.html ...]   # rewrite in place
    from titlecase import tc, process_html                   # in other tools
"""
import re
import sys

MINOR = {'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
         'as', 'at', 'by', 'if', 'in', 'of', 'on', 'per', 'to', 'via', 'vs', 'vs.'}
PHRASAL = {'lock', 'check', 'log', 'sign', 'fill', 'plug', 'tune', 'opt', 'walk', 'drop', 'move', 'turn', 'hold'}
KEEP = {'sq', 'ft', 'mil', 'mm', 'mph', 'lbs', 'hrs', 'yr', 'yrs', 'ish', 'x', 'e.g.', 'i.e.'}
BREAK_TOK = {'—', '–', '|', '·', '/', '→', '+', '←', '&rarr;', '&middot;', '&mdash;'}


def _cap_word(w, minor_ok, prev):
    m = re.match(r'^([^A-Za-z]*)([A-Za-z].*)$', w)
    if not m:
        return w
    lead, core = m.groups()
    if lead and lead[0] in '[{$#@<':
        return w
    if re.fullmatch(r'[A-Z][^A-Za-z]*', core) or re.search(r'[A-Z]', core[1:]) or '@' in core or '://' in core or '.com' in core:
        return w  # SWFL, iPhone, URLs: leave as written
    bare = re.sub(r'[^A-Za-z.]+$', '', core).lower()
    if bare in KEEP or bare.rstrip('.') in KEEP:
        return w
    if minor_ok and bare.rstrip('.') in MINOR | {'vs.'} and not (bare in ('in', 'on') and prev in PHRASAL):
        return lead + core[0].lower() + core[1:]
    return lead + core[0].upper() + core[1:]


def _word(w, start, prev):
    if '-' in w and not w.startswith('-'):
        parts = w.split('-')
        out = [_cap_word(parts[0], False, prev)]
        for p in parts[1:]:
            b = re.sub(r'[^A-Za-z]', '', p).lower()
            out.append(p if b in ('ish',) else _cap_word(p, b in MINOR, ''))
        return '-'.join(out)
    return _cap_word(w, not start, prev)


def tc_text(text, start=True, prev=''):
    """Title-case one run of plain text. Returns (text, start, prev) so runs split
    by inline tags continue correctly."""
    out = []
    toks = re.split(r'(\s+)', text)
    last = len(toks) - 1 if toks and toks[-1] else -1  # a word that ends the run with no trailing space
    for i, tok in enumerate(toks):
        if not tok or tok.isspace():
            out.append(tok)
            continue
        if re.fullmatch(r'&[#\w]+;', tok):
            out.append(tok)
            start = start or tok in BREAK_TOK
            continue
        if tok in BREAK_TOK or not re.search(r'[A-Za-z]', tok):
            out.append(tok)
            start = start or tok in BREAK_TOK
            continue
        out.append(_word(tok, start or (i == last and len(toks) > 1), prev))
        prev = re.sub(r'[^a-z]', '', tok.lower())
        start = bool(re.search(r'[.:!?]["”’)]?$', tok)) and not tok.lower().endswith('vs.')
    return ''.join(out), start, prev


def tc(s):
    """Title-case a string that may hold inline HTML (<em>, <br>, <span>)."""
    if s is None or not isinstance(s, str):
        return s
    st, prev, out = True, '', []
    for part in re.split(r'(<[^>]+>|&[a-z]+;|&#\d+;)', s):
        if part.startswith('<') or (part.startswith('&') and part.endswith(';')):
            out.append(part)
            if part in ('&mdash;', '&middot;', '&rarr;'):
                st = True
            continue
        t, st, prev = tc_text(part, st, prev)
        out.append(t)
    return ''.join(out)


# ---------------------------------------------------------------- HTML pass
TITLE_TAGS = {'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'label', 'option', 'dt', 'th', 'legend', 'summary', 'title', 'b', 'strong'}
TITLE_CLASSES = {'btn', 'go', 'open', 'cr-btn', 'cr-chip', 'cr-kick', 'cr-tag', 'kick', 'kicker', 'eyebrow', 'label',
                 'tag', 'ccp-lbl', 'chip', 'pill', 'badge', 'cp-tag', 'lp-proof', 'sec-kick', 'tab', 'scn-tab'}
VALUE_CLASSES = {'cp-fact'}  # label/value pairs: the value is a phrase, not a title
BLOCKERS = {'p', 'dd', 'blockquote', 'textarea'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
TOKEN = re.compile(r'(<!--.*?-->|<script\b.*?</script>|<style\b.*?</style>|<textarea\b.*?</textarea>|<[^>]+>)', re.S | re.I)


def process_html(s):
    out, stack = [], []
    for tok in TOKEN.split(s):
        if not tok:
            continue
        if tok.startswith('<'):
            out.append(tok)
            if tok.startswith(('<!', '<script', '<style', '<textarea', '<?')):
                continue
            m = re.match(r'<\s*(/?)\s*([A-Za-z][\w:-]*)', tok)
            if not m:
                continue
            close, name = m.group(1) == '/', m.group(2).lower()
            if close:
                for i in range(len(stack) - 1, -1, -1):
                    if stack[i]['name'] == name:
                        del stack[i:]
                        break
                continue
            if name in VOID or tok.endswith('/>'):
                continue
            cm = re.search(r'\bclass\s*=\s*"([^"]*)"', tok)
            cls = set(cm.group(1).split()) if cm else set()
            nav = name == 'a' and any(e['name'] in ('nav', 'header') for e in stack)
            title = name in TITLE_TAGS or bool(cls & TITLE_CLASSES) or nav
            stack.append({'name': name, 'cls': cls, 'title': title, 'start': True, 'prev': ''})
            continue
        # text node
        idx = next((i for i in range(len(stack) - 1, -1, -1) if stack[i]['title']), None)
        if idx is None or not tok.strip():
            out.append(tok)
            continue
        el = stack[idx]
        if el['name'] in ('b', 'strong') and any(e['name'] in BLOCKERS or e['cls'] & VALUE_CLASSES for e in stack[:idx]):
            out.append(tok)
            continue
        if any(e['name'] in BLOCKERS for e in stack[idx + 1:]):
            out.append(tok)
            continue
        plain = re.sub(r'&[a-z]+;', ' ', tok).strip()
        if plain.endswith('?') or len(plain.split()) > 10 or '{{' in tok and len(plain.split()) == 1:
            out.append(tok)
            el['start'] = False
            continue
        # a run that already opens on a capital starts fresh (e.g. a tag after "Feed Ad B")
        first = re.match(r'\s*[^A-Za-z\s]*([A-Za-z])', tok)
        st = el['start'] or bool(first and first.group(1).isupper() and tok[:1].isspace() is False and tok == tok.lstrip())
        t, el['start'], el['prev'] = tc_text(tok, st, el['prev'])
        out.append(t)
    return ''.join(out)


if __name__ == '__main__':
    for f in sys.argv[1:]:
        src = open(f, encoding='utf-8').read()
        new = process_html(src)
        if new != src:
            open(f, 'w', encoding='utf-8').write(new)
            print('updated', f)
