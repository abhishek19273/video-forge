"""Generate stylised maps for the map scene (Mercator, SVG)."""
from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GEO = ROOT / "assets" / "us-states.json"
OUT = ROOT / "public" / "assets" / "maps"

W, H = 1000, 900
BOUNDS = (-131.0, 33.0, -109.0, 50.0)  # west, south, east, north
STATES = ["Washington", "Oregon", "California", "Nevada", "Idaho", "Montana", "Wyoming", "Utah"]
ABBR = {
    "Washington": "WA",
    "Oregon": "OR",
    "California": "CA",
    "Nevada": "NV",
    "Idaho": "ID",
    "Montana": "MT",
    "Wyoming": "WY",
    "Utah": "UT",
}


def merc(lat: float) -> float:
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def project(lon: float, lat: float) -> tuple[float, float]:
    west, south, east, north = BOUNDS
    x = (lon - west) / (east - west) * W
    y = (merc(north) - merc(lat)) / (merc(north) - merc(south)) * H
    return x, y


def ring_path(ring: list[list[float]]) -> str:
    pts = [project(lon, lat) for lon, lat in ring]
    return "M " + " L ".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z"


def make(dark: bool = True) -> Path:
    data = json.loads(GEO.read_text(encoding="utf-8"))
    bg = "#07101C" if dark else "#EDF1F6"
    fill = "#0C1A2B" if dark else "#F7FAFE"
    stroke = "#29425F" if dark else "#AEBACA"
    label = "#6F93B8" if dark else "#65758A"
    grid = "#16283D" if dark else "#D5DDE8"

    paths = []
    labels = []
    for feature in data["features"]:
        name = feature["properties"].get("name")
        if name not in STATES:
            continue
        geom = feature["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        d = " ".join(ring_path(poly[0]) for poly in polys)
        paths.append(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="1.4" />')
        # crude centroid: average of the largest ring's points
        ring = max((poly[0] for poly in polys), key=len)
        cx = sum(p[0] for p in ring) / len(ring)
        cy = sum(p[1] for p in ring) / len(ring)
        x, y = project(cx, cy)
        labels.append(
            f'<text x="{x:.0f}" y="{y:.0f}" fill="{label}" font-family="Menlo, monospace" '
            f'font-size="22" letter-spacing="4" text-anchor="middle" opacity="0.75">{ABBR[name]}</text>'
        )

    # graticule every 2 degrees
    west, south, east, north = BOUNDS
    lines = []
    for lon in range(-131, -108, 2):
        x, _ = project(lon, 40)
        lines.append(f'<line x1="{x:.1f}" y1="0" x2="{x:.1f}" y2="{H}" stroke="{grid}" stroke-width="1" opacity="0.55" />')
    for lat in range(34, 51, 2):
        _, y = project(-120, lat)
        lines.append(f'<line x1="0" y1="{y:.1f}" x2="{W}" y2="{y:.1f}" stroke="{grid}" stroke-width="1" opacity="0.55" />')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <rect width="{W}" height="{H}" fill="{bg}" />
  {''.join(lines)}
  {''.join(paths)}
  {''.join(labels)}
  <rect x="1" y="1" width="{W - 2}" height="{H - 2}" fill="none" stroke="{stroke}" stroke-width="2" opacity="0.5" />
</svg>'''
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / ("pnw-dark.svg" if dark else "pnw-light.svg")
    path.write_text(svg, encoding="utf-8")
    return path


def main() -> None:
    print(make(True))
    print(make(False))


if __name__ == "__main__":
    main()
