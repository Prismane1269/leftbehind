#!/usr/bin/env python3
"""
Build a printable challenge poster with an inline QR code.

    python3 qr.py                                  # the 2026 challenge page
    python3 qr.py https://example.com/my-site      # your own deployment

Writes:
    qr/spaceapps-poster.html   poster, QR embedded as inline SVG (opens offline)
    qr/spaceapps-qr.svg        the bare QR code, for slides or a print run

To make a printable PDF, open the poster and print it (it has its own print
styles: white background, dark text). A rendered A4 copy ships alongside as
qr/spaceapps-poster.pdf.

The QR is baked into the HTML, so the site never needs the network at runtime
and the repo never needs a dependency at runtime either — `segno` is only used
here, when you regenerate the poster:

    pip install segno
"""
import os
import sys

import segno

DEFAULT_URL = ("https://www.spaceappschallenge.org/2026/challenges/"
               "abandoned-but-not-forgotten-storytelling-about-nasas-discarded-"
               "equipment-on-the-moon-and-mars/")
ROOT = os.path.dirname(os.path.abspath(__file__))


def qr_svg(url, scale=6, border=3, dark="#04060b", light="#ffffff"):
    """One <svg> element, no XML prologue, safe to drop straight into HTML."""
    qr = segno.make(url, error="m")
    svg = qr.svg_inline(scale=scale, border=border, dark=dark, light=light)
    return svg if isinstance(svg, str) else svg.decode("utf-8")


POSTER = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title} — challenge poster</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root{{--ink:#eef3fb;--ink-2:#b9c6da;--ink-3:#7d8ea6;--bg:#04060b;--line:rgba(255,255,255,.14);
    --mono:"SFMono-Regular",ui-monospace,Menlo,Consolas,monospace;
    --font:"Inter","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);line-height:1.55;
    display:grid;place-items:center;min-height:100vh;padding:28px}}
  .poster{{width:min(900px,100%);border:1px solid var(--line);border-radius:22px;padding:clamp(26px,4vw,54px);
    background:radial-gradient(120% 140% at 8% 0%,rgba(11,61,145,.38),transparent 58%),
      radial-gradient(100% 120% at 96% 100%,rgba(252,61,33,.18),transparent 58%),#05080f}}
  .row{{display:grid;grid-template-columns:1fr auto;gap:clamp(22px,3.6vw,50px);align-items:center}}
  .kicker{{font-family:var(--mono);font-size:.68rem;letter-spacing:.3em;text-transform:uppercase;color:var(--ink-3);
    display:flex;gap:10px;align-items:center;margin:0 0 16px}}
  .kicker::before{{content:"";width:22px;height:1px;background:#fc3d21}}
  h1{{margin:0;font-size:clamp(1.9rem,4.4vw,3.1rem);letter-spacing:-.03em;line-height:1.02;font-weight:600;max-width:18ch}}
  .lede{{color:var(--ink-2);margin:18px 0 0;max-width:44ch;font-size:.98rem}}
  .facts{{display:flex;gap:26px;flex-wrap:wrap;margin-top:26px;font-family:var(--mono)}}
  .facts b{{display:block;font-size:1.15rem}}
  .facts span{{font-size:.6rem;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}}
  .qr{{background:#fff;padding:14px;border-radius:16px;width:clamp(180px,26vw,254px);
    box-shadow:0 30px 80px -40px rgba(125,179,255,.85)}}
  .qr svg{{display:block;width:100%;height:auto}}
  .qr-cap{{margin:12px 0 0;text-align:center;font-family:var(--mono);font-size:.58rem;letter-spacing:.16em;
    text-transform:uppercase;color:var(--ink-3)}}
  .foot{{margin-top:30px;padding-top:18px;border-top:1px solid var(--line);display:flex;justify-content:space-between;
    gap:16px;flex-wrap:wrap;font-family:var(--mono);font-size:.62rem;color:var(--ink-3)}}
  .url{{word-break:break-all;max-width:52ch}}
  @media (max-width:720px){{.row{{grid-template-columns:1fr}}.qr{{margin-inline:auto}}}}
  @media print{{body{{background:#fff;color:#04060b;padding:0}}
    .poster{{box-shadow:none;border-color:#ccc;background:#fff}}
    .lede,.foot,.kicker{{color:#444}} .facts span,.qr-cap{{color:#666}}}}
</style>
</head>
<body>
  <article class="poster">
    <div class="row">
      <div>
        <p class="kicker">NASA Space Apps Challenge 2026</p>
        <h1>Abandoned but not Forgotten</h1>
        <p class="lede">Storytelling about the NASA equipment we left on the Moon, on Mars and in deep space — and the science it made possible. Written for school-age space fans. Built as a 3D, works-offline web story.</p>
        <div class="facts">
          <div><b>18</b><span>machines told</span></div>
          <div><b>6</b><span>you can turn in 3D</span></div>
          <div><b>1966 → today</b><span>years of leaving things behind</span></div>
        </div>
      </div>
      <div>
        <div class="qr">{qr}</div>
        <p class="qr-cap">Scan to open the challenge</p>
      </div>
    </div>
    <div class="foot">
      <span class="url">{url}</span>
      <span>Hackathon weekend: 14–15 November 2026</span>
    </div>
  </article>
</body>
</html>
"""


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    out_dir = os.path.join(ROOT, "qr")
    os.makedirs(out_dir, exist_ok=True)

    poster = POSTER.format(title="Abandoned but not Forgotten", url=url, qr=qr_svg(url))
    poster_path = os.path.join(out_dir, "spaceapps-poster.html")
    with open(poster_path, "w", encoding="utf-8") as fh:
        fh.write(poster)

    qr_path = os.path.join(out_dir, "spaceapps-qr.svg")
    segno.make(url, error="m").save(qr_path, scale=8, border=3, dark="#04060b", light="#ffffff")

    print("poster :", os.path.relpath(poster_path, ROOT))
    print("qr code:", os.path.relpath(qr_path, ROOT))
    print("target :", url)


if __name__ == "__main__":
    main()
