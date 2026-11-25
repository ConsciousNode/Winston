#!/usr/bin/env python3
"""Kehai's real-browser check for Winston delivery 1 (Playwright Chromium). Loads winston.html from file://, records
console/page errors and network requests, screenshots the opening view, lists the visible text, and greps it for
control-binding spoilers. Usage: python3 browser-check.py <winston.html> <outdir>"""
import sys, pathlib, re, json
from playwright.sync_api import sync_playwright
html = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(exist_ok=True)
errs, reqs = [], []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1280, "height": 800})
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("request", lambda r: reqs.append(r.url) if not r.url.startswith(("file:", "data:", "blob:")) else None)
    pg.goto(html.as_uri()); pg.wait_for_timeout(3000)
    pg.screenshot(path=str(out / "winston-open.png"))
    text = pg.inner_text("body")
    buttons = pg.eval_on_selector_all("button, select, option, a", "es => es.map(e => (e.innerText || e.value || '').trim()).filter(Boolean)")
    b.close()
bind = re.compile(r"\[[A-Z]\]|\bpress\b|\bWASD\b|\bhold (shift|space)\b|\bspace\s*(=|to|:)|\bkey(s|board)?\s*:", re.I)
hits = [l for l in text.splitlines() if bind.search(l)]
print(json.dumps({"errors": errs, "externalRequests": reqs, "controls": buttons[:40], "bindingHits": hits}, indent=1))
(out / "visible-text.txt").write_text(text)
