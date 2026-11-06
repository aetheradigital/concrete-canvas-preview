"""Build the Concrete Canvas ad campaign pages.

python3 tools/ads/build.py   (run from the repo root)

Writes:
  campaigns/index.html              campaign hub
  campaigns/<slug>/index.html       campaign overview: funnel, ads, copy, ideas, launch notes
  <lp>/index.html                   no-menu landing page with two-step form
  thanks/index.html                 shared thank-you page (content picked by ?c=<slug>)
"""
import html, json, os, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
E = html.escape
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,600..900&amp;'
         'family=Sora:wght@400;500;600;700&amp;family=Manrope:wght@400;500;600;700;800&amp;family=Courier+Prime:wght@400;700&amp;display=swap">')
ARROW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
ICONS = {
    'spark': '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
    'drop': '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'shield': '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>',
    'home': '<path d="M3 11l9-7 9 7v10H3z"/><path d="M9 21v-6h6v6"/>',
    'tag': '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    'camera': '<path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/>',
    'wrench': '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    'users': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.6.2 4.5 1.9 5.2 5.4"/>',
    'palette': '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.5-1.5-1.6-1.5-3 0-1 .8-2 2-2H17a4 4 0 0 0 4-4c0-4-4-7-9-7z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="14.5" cy="7" r="1.2"/>',
    'factory': '<path d="M3 21V10l5 3V10l5 3V6h8v15z"/><path d="M7 17h2M12 17h2M17 17h2"/>',
    'check': '<path d="M5 12l5 5 9-10"/>',
}
def icon(k): return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[k]}</svg>'


def fe(scene, finish, color='teal', cls='layer', cycle=None, maxw=900, extra=''):
    c = f' data-cycle="{cycle}"' if cycle else ''
    return f'<div class="{cls}" data-fe="{scene}" data-finish="{finish}" data-color="{color}" data-maxw="{maxw}"{c}{extra}></div>'


def brand(R):
    return f'<div class="cr-brand"><img src="{R}campaigns/assets/avatar.png" alt="">Concrete Canvas</div>'


# ------------------------------------------------------------------ creatives
def creative(c, R, story=False):
    """Return the .cr element for creative dict c."""
    t = c['type']; s = ' story' if story else ''
    chips = ''.join(f'<span class="cr-chip">{E(x)}</span>' for x in c.get('chips', []))
    chips = f'<div class="cr-chips">{chips}</div>' if chips else ''
    btn = f'<span class="cr-btn">{E(c["btn"])}</span>' if c.get('btn') else ''
    sub = f'<p class="cr-sub">{E(c["sub"])}</p>' if c.get('sub') else ''
    kick = f'<div class="cr-kick">{E(c["kick"])}</div>' if c.get('kick') else ''
    h = f'<h3 class="cr-h{" o" if c.get("orange") else ""}">{c["h"]}</h3>' if c.get('h') else ''
    scene = c.get('scene', 'garage'); fin = c.get('finish', 'flake'); colr = c.get('color', 'teal')
    label = E(c.get('alt', 'Ad creative'))
    if t == 'door':
        body = (fe(scene, fin, colr) + '<div class="cr-door"></div><div class="shade top"></div>'
                + '<span class="cr-spark" style="left:30%;top:68%"></span><span class="cr-spark" style="left:72%;top:78%;animation-delay:1.1s"></span>'
                + f'<div class="cr-in">{brand(R)}{kick}{h}{sub}<div style="margin-top:auto">{chips}{btn}</div></div>')
    elif t == 'wipe':
        body = (fe(scene, 'bare', 'teal') + f'<div class="layer cr-wipe" style="z-index:1">{fe(scene, fin, colr)}</div><div class="cr-wipe-line"></div><div class="shade both"></div>'
                + '<span class="cr-tag light cr-ba-lbl b" style="right:5cqw;top:22cqw">Before</span><span class="cr-tag cr-ba-lbl a" style="right:5cqw;top:22cqw;background:var(--teal)">After</span>'
                + f'<div class="cr-in">{brand(R)}{kick}{h}<div style="margin-top:auto">{sub}{chips}{btn}</div></div>')
    elif t == 'cycle':
        body = (fe(scene, fin, colr, cycle=c['cycle']) + '<div class="shade both"></div>'
                + f'<span class="cr-tag light cr-cycle-lbl" data-cycle-label>{E(c.get("first", ""))}</span>'
                + f'<div class="cr-in">{brand(R)}<div style="margin-top:auto"></div>{kick}{h}{sub}{chips}{btn}</div>')
    elif t == 'split':
        body = (f'<div class="cr-split"><div>{fe(scene, "bare", "teal")}<span class="cr-tag light tag">{E(c["left"])}</span></div>'
                f'<div>{fe(scene, fin, colr)}<span class="cr-tag tag" style="background:var(--teal)">{E(c["right"])}</span></div></div>'
                + '<div class="shade top"></div><div class="cr-eyes"><i></i><i></i></div>'
                + f'<div class="cr-in">{brand(R)}{kick}{h}</div>')
    elif t == 'notice':
        lines = ''.join(f'<p>{x}</p>' for x in c['lines'])
        body = (fe(scene, fin, colr) + '<div class="shade bot"></div>'
                + f'<div class="cr-notice"><b>{E(c["title"])}</b>{lines}<span class="stamp">{E(c["stamp"])}</span></div>'
                + f'<div class="cr-in bottom">{h}{btn}</div>')
    elif t == 'spec':
        cells = ''.join(f'<div><small>{E(a)}</small><b>{E(b)}</b></div>' for a, b in c['spec'])
        body = (fe(scene, fin, colr) + '<div class="layer" style="z-index:2;background:linear-gradient(90deg,rgba(6,14,28,.94) 0%,rgba(6,14,28,.82) 55%,rgba(6,14,28,.35) 100%)"></div>'
                + f'<div class="cr-in tight">{brand(R)}{kick}{h.replace("cr-h", "cr-h sm", 1)}<div style="margin-top:auto"></div><div class="cr-spec">{cells}</div>{btn}</div>')
    elif t == 'clock':
        body = (fe(scene, fin, colr) + '<div class="layer" style="z-index:2;background:radial-gradient(circle at 70% 40%,rgba(6,14,28,.35),rgba(6,14,28,.9) 70%)"></div>'
                + f'<div class="cr-in">{brand(R)}{kick}{h}<div style="display:flex;align-items:center;gap:5cqw;margin-top:auto">'
                + f'<div class="cr-clock"><i class="hh"></i><i class="mm"></i></div><div class="cr-time">{c["times"]}</div></div>{sub}{btn}</div>')
    elif t == 'oil':
        body = (fe(scene, fin, colr) + '<div class="shade both"></div><div class="layer" style="z-index:2;background:linear-gradient(0deg,rgba(6,14,28,.75) 0%,rgba(6,14,28,0) 40%)"></div><span class="cr-drop"></span><span class="cr-rag"></span>'
                + f'<div class="cr-in">{brand(R)}{kick}{h}<div style="margin-top:auto">{sub}{chips}{btn}</div></div>')
    elif t == 'list':
        items = ''.join(f'<li>{E(x)}</li>' for x in c['items'])
        body = (fe(scene, fin, colr) + '<div class="layer" style="z-index:2;background:linear-gradient(180deg,rgba(6,14,28,.86) 0%,rgba(6,14,28,.55) 45%,rgba(6,14,28,.88) 100%)"></div>'
                + f'<div class="cr-in">{brand(R)}{kick}{h}<div style="margin-top:auto"></div><ul class="cr-list">{items}</ul>{btn}</div>')
    elif t == 'mls':
        body = ('<div class="layer" style="background:linear-gradient(160deg,#13315C,#0A1A31)"></div>'
                + f'<div class="cr-mls"><div class="ph">{fe(scene, "bare", "teal")}<div class="layer cr-fade" style="z-index:2">{fe(scene, fin, colr)}</div>'
                + f'<span class="badge">{E(c["badge"])}</span><span class="dot">{E(c["dot"])}</span></div>'
                + f'<div class="meta"><div class="price">{E(c["price"])}</div><div class="facts">{c["facts"]}</div></div></div>'
                + f'<div class="cr-in tight">{brand(R)}<div style="margin-top:auto"></div>{h.replace("cr-h", "cr-h sm", 1)}{btn}</div>')
    else:
        raise ValueError(t)
    return f'<div class="cr{s}" role="img" aria-label="{label}">{body}</div>'


def feed(ad, R, platform='Sponsored'):
    cr = creative(ad['creative'], R)
    return (f'<div class="pf{" pf-li" if platform != "Sponsored" else ""}" aria-label="Social feed ad mockup">'
            f'<div class="pf-head"><img src="{R}campaigns/assets/avatar.png" alt=""><div><b>Concrete Canvas</b><small>{E(platform)}</small></div><span class="dots" aria-hidden="true">···</span></div>'
            f'<p class="pf-text">{E(ad["text"])}</p>{cr}'
            f'<div class="pf-foot"><div><small>{E(ad["url"])}</small><b>{E(ad["headline"])}</b><span>{E(ad["desc"])}</span></div><span class="pf-btn">{E(ad["button"])}</span></div></div>')


def story(ad, R):
    cr = creative(ad['creative'], R, story=True)
    return (f'<div class="pf pf-story" aria-label="Story ad mockup"><div class="sbar" aria-hidden="true"><i></i>'
            f'<div><img src="{R}campaigns/assets/avatar.png" alt="">Concrete Canvas <small>Sponsored</small></div></div>{cr}</div>')


def copyblock(rows):
    out = []
    for k, v in rows:
        out.append(f'<div><dt>{E(k)}</dt><dd>{E(v)}</dd><button type="button" data-copy="{E(v)}">Copy</button></div>')
    return f'<div class="cp-copy"><dl>{"".join(out)}</dl></div>'


def search(sa, R):
    links = ''.join(f'<span>{E(x)}</span>' for x in sa['links'])
    return (f'<div class="pf pf-search" aria-label="Search ad mockup"><div class="sp">Sponsored</div>'
            f'<div class="site"><img src="{R}campaigns/assets/avatar.png" alt=""><div><b>Concrete Canvas</b><small>{E(sa["url"])}</small></div></div>'
            f'<h4>{E(" | ".join(sa["headlines"][:3]))}</h4><p>{E(sa["descs"][0])}</p><div class="links">{links}</div></div>')


def page(title, desc, R, body, extra_head='', cls=''):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="icon" href="{R}assets/favicon.png">
{FONTS}
<link rel="stylesheet" href="{R}campaigns/assets/cc-ads.css">
{extra_head}
</head>
<body{f' class="{cls}"' if cls else ''}>
{body}
<script src="{R}assets/floor-engine.js"></script>
<script src="{R}campaigns/assets/cc-ads.js"></script>
</body>
</html>
'''


# ------------------------------------------------------------------ campaign data
from campaigns_data import CAMPAIGNS  # noqa: E402
import sys as _sys  # noqa: E402
_sys.path.insert(0, str(ROOT / 'tools'))
from titlecase import tc, process_html  # noqa: E402

# Title Case for every heading-like field (headlines, buttons, tags, labels).
# Body copy, ad primary text, descriptions, list bullets and questions stay as written.
TC_KEYS = {'label', 'kick', 'h', 'tag', 'button', 'btn', 'headline', 'name', 'title', 'why_kick', 'why_h', 'submit',
           'submit_short', 'steps_h', 'refH', 'refBtn', 'listH', 'listKick', 'hub_kick', 'kicker', 'h1', 'form_title',
           'cta_h', 'cta', 'badge', 'left', 'right', 'first', 'retarget'}
TC_LISTS = {'chips', 'links', 'headlines', 'hub_tags', 'options'}
TC_TUPLES = {'steps': (0,), 'cards': (1,), 'proof': (1,), 'ideas': (0, 1), 'notes': (0,), 'facts': (0,), 'spec': (0, 1), 'options': (0,)}


def _tc_ok(v):
    return isinstance(v, str) and not v.endswith('?') and not re.fullmatch(r'[a-z_]+', v)


def titlecase_data(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in TC_KEYS and _tc_ok(v):
                o[k] = tc(v)
            elif k in TC_TUPLES and isinstance(v, list) and v and isinstance(v[0], (tuple, list)):
                o[k] = [type(t)(tc(x) if i in TC_TUPLES[k] and _tc_ok(x) else x for i, x in enumerate(t)) for t in v]
            elif k in TC_LISTS and isinstance(v, list):
                o[k] = [tc(x) if _tc_ok(x) else x for x in v]
            else:
                titlecase_data(v)
    elif isinstance(o, list):
        for x in o:
            titlecase_data(x)


titlecase_data(CAMPAIGNS)


def campaign_page(c):
    R = '../../'
    lp = c['lp']
    facts = ''.join(f'<div class="cp-fact"><small>{E(k)}</small><b>{E(v)}</b></div>' for k, v in c['facts'])
    ads_html = []
    for ad in c['ads']:
        if ad['kind'] == 'story':
            mock = story(ad, R)
            rows = [('Overlay text', ad['overlay']), ('Button', ad['button'])]
        else:
            mock = feed(ad, R, 'Promoted' if ad['kind'] == 'linkedin' else 'Sponsored')
            rows = [('Primary text', ad['text']), ('Headline', ad['headline']), ('Description', ad['desc']), ('Button', ad['button'])]
        ads_html.append(f'<div class="cp-ad"><h3>{E(ad["label"])} <span>{E(ad["tag"])}</span></h3>{mock}{copyblock(rows)}</div>')
    sa = c['search']
    srows = [(f'Headline {i+1}', h) for i, h in enumerate(sa['headlines'])] + [(f'Description {i+1}', d) for i, d in enumerate(sa['descs'])] + [('Keywords', sa['keywords'])]
    ads_html.append(f'<div class="cp-ad"><h3>Search ad <span>Google</span></h3>{search(sa, R)}{copyblock(srows)}</div>')
    ideas = ''.join(f'<div class="cp-idea"><small>{E(a)}</small><h3 class="disp">{E(b)}</h3><p>{E(d)}</p></div>' for a, b, d in c['ideas'])
    notes = ''.join(f'<div class="cp-note"><h3 class="disp">{E(k)}</h3><ul>{"".join(f"<li>{E(x)}</li>" for x in v)}</ul></div>' for k, v in c['notes'])
    flow = c['flow']
    body = f'''<div class="wrap cp-top"><img src="{R}assets/logo-header.png" alt="Concrete Canvas" width="66" height="64">
  <nav class="cp-crumb" aria-label="Breadcrumb"><a href="{R}">Design preview</a><a href="../">All campaigns</a><span>{E(c["name"])}</span></nav></div>
<main>
  <section class="wrap cp-hero" style="--acc:{c['acc']}">
    <div>
      <span class="kick">{E(c["kicker"])}</span>
      <h1 class="disp">{c["title"]}</h1>
      <p>{E(c["summary"])}</p>
    </div>
    <div class="cp-facts">{facts}</div>
  </section>

  <section class="cp-sec" aria-labelledby="flow-h">
    <div class="wrap">
      <h2 class="disp" id="flow-h">The funnel</h2>
      <p class="lead">{E(flow["lead"])}</p>
      <div class="cp-flow">
        <div class="cp-node"><span class="n">1</span><h3 class="disp">The ads</h3><p>{E(flow["ad"])}</p><span class="metric">Measure: click-through rate, cost per click</span></div>
        <div class="cp-arrow" aria-hidden="true">{ARROW}</div>
        <div class="cp-node"><span class="n">2</span><h3 class="disp">Landing page</h3><p>{E(flow["lp"])}</p><a class="go" href="{R}{lp}/">Open landing page →</a><span class="metric">Measure: form completion rate, calls</span></div>
        <div class="cp-arrow" aria-hidden="true">{ARROW}</div>
        <div class="cp-node"><span class="n">3</span><h3 class="disp">Thank-you page</h3><p>{E(flow["ty"])}</p><a class="go" href="{R}thanks/?c={c["slug"]}">Open thank-you page →</a><span class="metric">Measure: {E(flow["kpi"])}</span></div>
      </div>
      <div class="cp-loop"><b>Didn’t convert?</b><span>{E(flow["retarget"])}</span>{ARROW}<span>back to the landing page</span></div>
    </div>
  </section>

  <section class="cp-sec" aria-labelledby="ads-h">
    <div class="wrap">
      <h2 class="disp" id="ads-h">The ads</h2>
      <p class="lead">Mockups are shown in generic platform frames. The floors are live renders and the creatives animate, so each one also works as a short video ad. Copy is ready to paste.</p>
      <div class="cp-ads">{"".join(ads_html)}</div>
    </div>
  </section>

  <section class="cp-sec" aria-labelledby="ideas-h">
    <div class="wrap">
      <h2 class="disp" id="ideas-h">Campaign ideas beyond the feed</h2>
      <p class="lead">{E(c["ideas_lead"])}</p>
      <div class="cp-ideas">{ideas}</div>
    </div>
  </section>

  <section class="cp-sec" aria-labelledby="land-h">
    <div class="wrap">
      <h2 class="disp" id="land-h">Where the ads land</h2>
      <p class="lead">A single-purpose page with no menu: one offer, one form, and a phone number. Built in the Concrete Canvas brand so the click feels like the same company from ad to booking.</p>
      <div class="cp-land">
        <article class="cp-card"><div class="shot"><iframe src="{R}{lp}/" title="Landing page preview" loading="lazy" tabindex="-1" aria-hidden="true" scrolling="no"></iframe></div>
          <div class="body"><h3 class="disp">Landing page</h3><p>{E(c["lp_blurb"])}</p><a class="open" href="{R}{lp}/">Open landing page →</a></div></article>
        <article class="cp-card"><div class="shot"><iframe src="{R}thanks/?c={c["slug"]}" title="Thank-you page preview" loading="lazy" tabindex="-1" aria-hidden="true" scrolling="no"></iframe></div>
          <div class="body"><h3 class="disp">Thank-you page</h3><p>{E(c["ty_blurb"])}</p><a class="open" href="{R}thanks/?c={c["slug"]}">Open thank-you page →</a></div></article>
      </div>
    </div>
  </section>

  <section class="cp-sec" aria-labelledby="notes-h">
    <div class="wrap">
      <h2 class="disp" id="notes-h">Launch notes</h2>
      <p class="lead">What it takes to run this for real. Budgets, offers and numbers in brackets are for Concrete Canvas to set.</p>
      <div class="cp-notes">{notes}</div>
    </div>
  </section>
</main>
<footer class="wrap cp-foot"><span>Campaign preview only. Ads are mockups; forms are not connected.</span><span>Concrete Canvas · Turning concrete into art</span></footer>'''
    return page(f'Ad campaign: {c["name"]} | Concrete Canvas', c['summary'], R, body)


def landing_page(c):
    R = '../'
    L = c['landing']
    ticks = ''.join(f'<li>{E(x)}</li>' for x in L['ticks'])
    chips = ''.join(f'<span>{E(x)}</span>' for x in L['chips'])
    opts = ''.join(f'<label><input type="radio" name="project" value="{E(a)}">{E(a)}<small>{E(b)}</small></label>' for a, b in L['options'])
    fields = []
    for f in L['fields']:
        name, label, typ, req = f['name'], f['label'], f.get('type', 'text'), f.get('required', False)
        r = ' required' if req else ''
        full = ' class="full"' if f.get('full') else ''
        ac = f' autocomplete="{f["ac"]}"' if f.get('ac') else ''
        if typ == 'select':
            o = ''.join(f'<option>{E(x)}</option>' for x in f['options'])
            fields.append(f'<label{full}>{E(label)}<select name="{name}" data-label="{E(label.lower())}"{r}>{o}</select></label>')
        else:
            fields.append(f'<label{full}>{E(label)}<input type="{typ}" name="{name}" data-label="{E(label.lower())}"{ac}{r}></label>')
    cards = ''.join(f'<div class="lp-card"><span class="ic">{icon(i)}</span><h3 class="disp">{E(h)}</h3><p>{E(p)}</p></div>' for i, h, p in L['cards'])
    proof = ''.join(f'<div><b>{E(a)}</b><span>{E(b)}</span></div>' for a, b in L['proof'])
    steps = ''.join(f'<li><b>{E(a)}</b><span>{E(b)}</span></li>' for a, b in L['steps'])
    faq = ''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in L['faq'])
    sh = L['show']
    picks = ''
    if sh.get('picker'):
        fins = ''.join(f'<button type="button" data-pick-finish="{k}" aria-pressed="false">{E(v)}</button>' for k, v in sh['finishes'])
        cols = ''.join(f'<button type="button" data-pick-color="{k}" aria-pressed="false" aria-label="{E(n)}" title="{E(n)}"></button>' for k, n in sh['colors'])
        picks = f'<div class="lp-picks"><div><div class="lbl">Finish</div><div class="lp-pills">{fins}</div></div><div><div class="lbl">Color</div><div class="lp-sw">{cols}</div></div><p style="margin:0;color:var(--muted);font-size:15px">{E(sh["note"])}</p><a class="btn btn-orange" href="#start" style="align-self:flex-start">{E(sh["cta"])}</a></div>'
    else:
        picks = f'<div class="lp-picks"><h3 class="disp" style="margin:0;font-size:24px">{E(sh["title"])}</h3><p style="margin:0;color:var(--muted)">{E(sh["note"])}</p><a class="btn btn-orange" href="#start" style="align-self:flex-start">{E(sh["cta"])}</a></div>'
    viewid = ' id="lpView"' if sh.get('picker') else ''
    body = f'''<header class="lp-top"><div class="wrap"><img src="{R}assets/logo-header.png" alt="Concrete Canvas" width="64" height="62"><a class="tel" href="tel:"><span>Questions? Call</span> <b>[PHONE]</b></a></div></header>
<main>
  <section class="lp-hero" aria-labelledby="lp-h">
    {fe(L["hero"][0], L["hero"][1], L["hero"][2], cls="bg", maxw=1280)}
    <div class="wrap">
      <div>
        <span class="kick">{E(L["kick"])}</span>
        <h1 class="disp" id="lp-h">{L["h1"]}</h1>
        <p class="sub">{E(L["sub"])}</p>
        <ul class="lp-ticks">{ticks}</ul>
        <div class="lp-chips">{chips}</div>
      </div>
      <form class="lp-form" id="lpForm" action="{R}thanks/" data-campaign="{c["slug"]}" novalidate>
        <div class="steps"><b>{E(L["form_title"])}</b><span>Step <i id="lpNum" style="font-style:normal">1</i> of 2</span></div>
        <div class="bar"><i id="lpBar"></i></div>
        <fieldset id="lpStep1"><legend>{E(L["legend"])}</legend><div class="lp-opts">{opts}</div>
          <div class="act"><button type="button" class="btn btn-ink" id="lpNext">Next →</button></div></fieldset>
        <fieldset id="lpStep2" hidden><legend>{E(L["legend2"])}</legend><div class="fields">{"".join(fields)}</div>
          <input type="hidden" name="choice" id="lpChoice">
          <div class="act"><button type="button" class="back" id="lpBack">← Back</button><button type="submit" class="btn btn-orange">{E(L["submit"])}</button></div></fieldset>
        <p class="err" id="lpErr" role="alert"></p>
        <p class="fine">{E(L["fine"])}</p>
      </form>
    </div>
  </section>

  <section class="lp-sec"><div class="wrap">
    <span class="kick">{E(L["why_kick"])}</span>
    <h2 class="disp">{E(L["why_h"])}</h2>
    <p class="lead">{E(L["why_p"])}</p>
    <div class="lp-cards">{cards}</div>
  </div></section>

  <section class="lp-sec" style="padding-top:0"><div class="wrap lp-show">
    <div class="lp-view"{viewid}>{fe(sh["scene"], sh["finish"], sh["color"], cls="layer", maxw=1280)}<span class="tag" id="lpViewTag">{E(sh.get("tag", ""))}</span></div>
    {picks}
  </div></section>

  <section class="lp-sec" style="padding-top:0"><div class="wrap"><div class="lp-proof">{proof}</div></div></section>

  <section class="lp-sec" style="padding-top:0"><div class="wrap">
    <span class="kick">How it works</span>
    <h2 class="disp">{E(L["steps_h"])}</h2>
    <ol class="lp-steps">{steps}</ol>
  </div></section>

  <section class="lp-sec" style="padding-top:0"><div class="wrap lp-faq">
    <span class="kick">Quick answers</span>
    <h2 class="disp">Before you book.</h2>
    {faq}
  </div></section>

  <section class="lp-sec" style="padding-top:0"><div class="wrap"><div class="lp-cta">
    <div><h2 class="disp">{E(L["cta_h"])}</h2><p>{E(L["cta_p"])}</p></div>
    <a class="btn btn-orange" href="#start">{E(L["submit"])}</a>
  </div></div></section>
</main>
<footer class="wrap lp-foot"><span>© 2026 Concrete Canvas · Licensed &amp; insured · [LICENSE #]</span><span>Preview only — this form isn’t connected yet.</span></footer>
<div class="lp-callbar"><a class="btn btn-ghost" style="color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35)" href="tel:">Call [PHONE]</a><a class="btn btn-orange" href="#start">{E(L["submit_short"])}</a></div>'''
    return page(f'{L["title"]} | Concrete Canvas', L['sub'], R, body, cls='lp')


def thanks_page():
    R = '../'
    data = {c['slug']: c['thanks'] for c in CAMPAIGNS}
    body = f'''<header class="lp-top"><div class="wrap"><img src="{R}assets/logo-header.png" alt="Concrete Canvas" width="64" height="62"><a class="tel" href="tel:"><span>Questions? Call</span> <b>[PHONE]</b></a></div></header>
<main>
  <section class="ty-hero">
    <div class="bg" data-fe="garage" data-finish="metallic" data-color="navy" data-maxw="1280" id="tyBg"></div>
    <div class="wrap">
      <div class="ok">{icon("check").replace('stroke-width="2"', 'stroke-width="3" width="30" height="30"')}</div>
      <span class="kick" style="color:var(--mango)" id="tyKick">Request received</span>
      <h1 class="disp" id="tyH"></h1>
      <p id="tyP"></p>
    </div>
  </section>
  <section class="lp-sec"><div class="wrap">
    <span class="kick">What happens next</span>
    <h2 class="disp">Here’s the plan.</h2>
    <ol class="lp-steps" id="tySteps"></ol>
  </div></section>
  <section class="lp-sec" style="padding-top:0"><div class="wrap" style="max-width:880px">
    <span class="kick" id="tyListKick">Before we visit</span>
    <h2 class="disp" id="tyListH"></h2>
    <ul class="ty-list" id="tyList"></ul>
  </div></section>
  <section class="lp-sec" style="padding-top:0"><div class="wrap"><div class="ty-ref">
    <div><h2 class="disp" id="tyRefH"></h2><p id="tyRefP"></p></div>
    <a class="btn btn-orange" id="tyRefBtn" href="sms:?&body=">Share with a friend</a>
  </div></div></section>
</main>
<footer class="wrap lp-foot"><span>© 2026 Concrete Canvas</span><span>Preview only.</span></footer>
<script>
(function(){{
  var D={json.dumps(data, ensure_ascii=False)};
  var q=new URLSearchParams(location.search), k=q.get('c'), d=D[k]||D['{CAMPAIGNS[0]["slug"]}'], n=(q.get('n')||'').replace(/[<>]/g,'').slice(0,30);
  var $=function(i){{return document.getElementById(i)}};
  $('tyH').textContent=n?n+', '+d.h:d.h.charAt(0).toUpperCase()+d.h.slice(1); $('tyP').textContent=d.p; $('tyKick').textContent=d.kick||'Request received';
  $('tySteps').innerHTML=d.steps.map(function(s){{return '<li><b></b><span></span></li>'}}).join('');
  [].forEach.call($('tySteps').children,function(li,i){{li.children[0].textContent=d.steps[i][0];li.children[1].textContent=d.steps[i][1]}});
  $('tyListH').textContent=d.listH; $('tyListKick').textContent=d.listKick||'Before we visit';
  $('tyList').innerHTML=d.list.map(function(){{return '<li></li>'}}).join('');
  [].forEach.call($('tyList').children,function(li,i){{li.textContent=d.list[i]}});
  $('tyRefH').textContent=d.refH; $('tyRefP').textContent=d.refP; $('tyRefBtn').textContent=d.refBtn;
  $('tyRefBtn').href='sms:?&body='+encodeURIComponent(d.refSms);
  var bg=$('tyBg'); bg.setAttribute('data-finish',d.bg[0]); bg.setAttribute('data-color',d.bg[1]); bg.setAttribute('data-fe',d.bg[2]||'garage');
  document.title=d.h+' | Concrete Canvas';
}})();
</script>'''
    return page('Request received | Concrete Canvas', 'Thanks for your request.', R, body, cls='lp')


def hub_page():
    R = '../'
    cards = []
    for c in CAMPAIGNS:
        hero = next(a for a in c['ads'] if a['kind'] != 'story')
        tags = ''.join(f'<span>{E(x)}</span>' for x in c['hub_tags'])
        cards.append(f'<article class="cp-hubcard">{creative(hero["creative"], R)}<div class="body"><span class="kick" style="margin:0;color:{c["acc"]}">{E(c["hub_kick"])}</span>'
                     f'<h2 class="disp">{E(c["name"])}</h2><p>{E(c["hub_blurb"])}</p><div class="tags">{tags}</div>'
                     f'<a class="open" href="{c["slug"]}/">Open campaign →</a></div></article>')
    body = f'''<div class="wrap cp-top"><img src="{R}assets/logo-header.png" alt="Concrete Canvas" width="66" height="64">
  <nav class="cp-crumb" aria-label="Breadcrumb"><a href="{R}">Design preview</a><span>Ad campaigns</span></nav></div>
<main class="wrap">
  <section class="cp-hero" style="grid-template-columns:minmax(0,1fr)">
    <div><span class="kick">Paid social + search</span>
      <h1 class="disp">Five campaigns. <em>Five audiences.</em></h1>
      <p style="max-width:760px">Each campaign has its own offer, animated ads, ready-to-paste copy, a search ad, ideas beyond the feed, a dedicated landing page and a thank-you page. Every floor in the ads is a live render, so colors and finishes can be swapped to match the season or the promotion.</p></div>
  </section>
  <section class="cp-hub" aria-label="Campaigns">{"".join(cards)}</section>
</main>
<footer class="wrap cp-foot"><span>Campaign preview only. Ads are mockups; forms are not connected.</span><span>Concrete Canvas · Turning concrete into art</span></footer>'''
    return page('Ad campaigns | Concrete Canvas', 'Five paid advertising campaigns for Concrete Canvas.', R, body)


def write(rel, text):
    p = ROOT / rel; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(process_html(text))
    print('wrote', rel)


if __name__ == '__main__':
    write('campaigns/index.html', hub_page())
    for c in CAMPAIGNS:
        write(f'campaigns/{c["slug"]}/index.html', campaign_page(c))
        write(f'{c["lp"]}/index.html', landing_page(c))
    write('thanks/index.html', thanks_page())
