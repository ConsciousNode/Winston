#!/usr/bin/env python3
"""Kehai's second browser pass: run one transfer, then enter Free Flight and hold a few keys, screenshotting each.
Usage: python3 browser-modes.py <winston.html> <outdir>"""
import sys, pathlib
from playwright.sync_api import sync_playwright
html = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2])
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1280, "height": 800})
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(html.as_uri()); pg.wait_for_timeout(1500)
    pg.click("text=Run Transfer"); pg.wait_for_timeout(8000)
    pg.screenshot(path=str(out / "winston-transfer.png"))
    log = pg.inner_text("body")
    pg.click("text=Free Flight"); pg.wait_for_timeout(1500)
    for k in ["w", "Space", "a", "d"]:
        pg.keyboard.down(k); pg.wait_for_timeout(700); pg.keyboard.up(k)
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(out / "winston-freeflight.png"))
    b.close()
print("errors:", errs)
i = log.find("TCP STATE"); print(log[i:i+300].replace("\n", " | "))
j = log.find("TRANSFER LOG"); print(log[j:j+400].replace("\n", " | "))
