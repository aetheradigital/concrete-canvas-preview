#!/usr/bin/env python3
"""Title-case UI label strings inside a page's inline <script> data (tags, titles,
quiz answers, size presets). Questions, hints, aria labels and sentences are skipped."""
import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from titlecase import tc

KEYS = r'(?:tag|best|title|label|name|short|kick|btn|cta|pool|lanai|garage)'
SKIP = re.compile(r'selected finish|Close-up|before:|^a |^an |\?$|\.$')

def fix_js(js):
    def lit(v):
        if SKIP.search(v) or len(v.split()) > 7 or not re.search(r'[a-z]', v):
            return v
        return tc(v)
    js = re.sub(r"(\b" + KEYS + r"\s*:\s*')([^'\\]{2,80})(')", lambda m: m.group(1) + lit(m.group(2)) + m.group(3), js)
    # array data: ['id','Label', ...]  and ['Label', 450]
    js = re.sub(r"(\['[\w-]+',\s*')([^'\\]{2,60})(')", lambda m: m.group(1) + lit(m.group(2)) + m.group(3), js)
    js = re.sub(r"(\[')([^'\\]{2,40})(',\s*\d+\])", lambda m: m.group(1) + lit(m.group(2)) + m.group(3), js)
    return js

def fix_page(s):
    return re.sub(r'(<script\b(?![^>]*\bsrc=)[^>]*>)(.*?)(</script>)', lambda m: m.group(1) + fix_js(m.group(2)) + m.group(3), s, flags=re.S)

if __name__ == '__main__':
    for f in sys.argv[1:]:
        a = open(f, encoding='utf-8').read(); b = fix_page(a)
        if a != b:
            open(f, 'w', encoding='utf-8').write(b); print('updated', f)
