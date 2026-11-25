#!/usr/bin/env python3
"""
Real-browser (Chromium + SwiftShader WebGL) verification harness for Winston Round 2.
Loaded via CDP Page.setDocumentContent so it works 100% offline even under file:// URL policies.
Outputs JSON report to stdout for tests/09-browser-pixel-determinism-fps.js.
"""
import json
import os
import re
import sys
import tempfile
import time
import numpy as np
from PIL import Image
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service


def count_lower_half_clusters(img_path, min_pct=0.008, merge_dist=38.0):
    im = Image.open(img_path).convert('RGB')
    arr = np.array(im)
    h, w, _ = arr.shape
    # Lower half, central 50% width (excludes side HUD cards in Packet Relay)
    lower = arr[h // 2 :, int(w * 0.25) : int(w * 0.75), :]
    q = (lower // 24) * 24 + 12
    flat = q.reshape(-1, 3)
    vals, counts = np.unique(flat, axis=0, return_counts=True)
    total = flat.shape[0]
    order = np.argsort(-counts)
    clusters = []
    for idx in order:
        if counts[idx] < total * min_pct:
            continue
        c = vals[idx].astype(float)
        if all(np.linalg.norm(c - np.array(cl['rgb'])) >= merge_dist for cl in clusters):
            clusters.append({
                'rgb': [int(x) for x in c.tolist()],
                'pct': round(float(counts[idx] / total * 100.0), 2)
            })
    return clusters


def make_driver():
    opts = Options()
    opts.binary_location = '/usr/bin/chromium'
    opts.add_argument('--headless=new')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-dev-shm-usage')
    opts.add_argument('--window-size=1280,720')
    opts.add_argument('--use-gl=angle')
    opts.add_argument('--use-angle=swiftshader')
    opts.add_argument('--enable-webgl')
    opts.add_argument('--ignore-gpu-blocklist')
    opts.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    return webdriver.Chrome(service=Service('/usr/bin/chromedriver'), options=opts)


def load_html_cdp(driver, html_src):
    frame_id = driver.execute_cdp_cmd('Page.getFrameTree', {})['frameTree']['frame']['id']
    driver.execute_cdp_cmd('Page.setDocumentContent', {'frameId': frame_id, 'html': html_src})


def main():
    html_path = sys.argv[1]
    html_src = open(html_path, 'r', encoding='utf-8').read()
    tmpdir = tempfile.mkdtemp(prefix='winston_browser_')
    out = {'resolution': '1280x720', 'rendererBackend': 'Chromium 156 + ANGLE SwiftShader WebGL'}

    driver = make_driver()
    try:
        # 1. Load clean winston.html
        load_html_cdp(driver, html_src)
        time.sleep(1.4)

        st_relay = driver.execute_script('return window.__WINSTON__.getState();')
        out['useThree'] = bool(st_relay.get('useThree'))
        out['browserParamsHash'] = st_relay.get('paramsHash')

        # Console & network checks
        logs = driver.get_log('browser')
        severe = [l['message'] for l in logs if l['level'] == 'SEVERE']
        net_reqs = driver.execute_script(
            "return performance.getEntriesByType('resource').map(e => e.name);"
        )
        out['consoleErrors'] = severe
        out['networkRequests'] = net_reqs

        # Browser vs Node bit-identical sim check on fixed seeds
        browser_sim = driver.execute_script("""
          const W = window.__WINSTON__.core;
          const t101 = W.runTcpTransfer({ seed: 101, encoding: 'ternary', tcpMode: 'avian', rainLevel: 'dry', payloadName: 'CARPET/main', recordDraws: false });
          const f777 = W.runSingle3DFlight(777, 210, 0.3, null);
          const b1 = W.runBergenScenario(1);
          return {
            t101Hash: W.sha256String(JSON.stringify(t101)),
            f777Hash: W.sha256String(JSON.stringify(f777)),
            b1Hash: W.sha256String(JSON.stringify(b1))
          };
        """)
        out['browserSimHashes'] = browser_sim

        # Pixel test: Packet Relay
        p_relay = os.path.join(tmpdir, 'relay.png')
        driver.save_screenshot(p_relay)
        relay_clusters = count_lower_half_clusters(p_relay)
        out['relayClusters'] = relay_clusters

        # Pixel test: Free Flight
        driver.execute_script("window.__WINSTON__.setMode('free');")
        time.sleep(1.0)
        p_free = os.path.join(tmpdir, 'free.png')
        driver.save_screenshot(p_free)
        free_clusters = count_lower_half_clusters(p_free)
        out['freeClusters'] = free_clusters

        # Frame-time measurements at Low, Medium, High quality (1280x720)
        perf = {}
        for q in ['low', 'medium', 'high']:
            driver.execute_script(f"window.__WINSTON__.setQuality('{q}'); window.__WINSTON__.clearFrameTimes();")
            time.sleep(1.8)
            fts = driver.execute_script('return window.__WINSTON__.getFrameTimes();')
            if fts:
                fts_sorted = sorted(fts)
                mean_ms = sum(fts) / len(fts)
                p50_ms = fts_sorted[len(fts_sorted) // 2]
                p95_ms = fts_sorted[min(len(fts_sorted) - 1, int(0.95 * len(fts_sorted)))]
                perf[q] = {
                    'frames': len(fts),
                    'meanMs': round(mean_ms, 2),
                    'p50Ms': round(p50_ms, 2),
                    'p95Ms': round(p95_ms, 2),
                    'estFps': round(1000.0 / mean_ms, 1)
                }
            else:
                perf[q] = {'frames': 0, 'meanMs': None, 'p50Ms': None, 'p95Ms': None, 'estFps': 0}
        out['frameTimes'] = perf

        # Mutant #16: Flat-ground mutant injected in-memory -> pixel test MUST fail (< 3 clusters)
        # Replace terrain vertex coloring with a single flat blue color AND hide extra ground clutter
        flat_html = html_src.replace(
            'const terrMat = new THREE.MeshLambertMaterial({ vertexColors: true });',
            'const terrMat = new THREE.MeshBasicMaterial({ color: 0x2d6a8a });'
        )
        # Hide trees/fences/puddles/buildings in the flat-ground mutant so ground is truly one flat sheet
        flat_html = flat_html.replace(
            'worldGroup.add(postInst);',
            '/* flat-ground mutant */'
        ).replace(
            'worldGroup.add(pm);',
            '/* flat-ground mutant */'
        ).replace(
            'worldGroup.add(fm);',
            '/* flat-ground mutant */'
        ).replace(
            'worldGroup.add(cm);',
            '/* flat-ground mutant */'
        )
        load_html_cdp(driver, flat_html)
        time.sleep(1.0)
        p_flat = os.path.join(tmpdir, 'flat_mutant.png')
        driver.save_screenshot(p_flat)
        flat_clusters = count_lower_half_clusters(p_flat)
        out['flatMutantClusters'] = flat_clusters

    finally:
        driver.quit()

    print(json.dumps(out))


if __name__ == '__main__':
    main()
