import math


def _attr(d: dict) -> str:
    return " ".join(f'{k}="{v}"' for k, v in d.items())


def svg_wrap(content: str, width: int = 80, height: int = 80, viewBox: str | None = None) -> str:
    vb = viewBox or f"0 0 {width} {height}"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="{vb}">{content}</svg>'
    )


def circle(cx: int, cy: int, r: int, fill: str = "#333", stroke: str = "none", sw: int = 0) -> str:
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def rect(x: int, y: int, w: int, h: int, fill: str = "#333", stroke: str = "none", sw: int = 0,
         rx: int = 0) -> str:
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}" rx="{rx}"/>')


def polygon(sides: int, cx: int, cy: int, r: int, rotation: float = 0,
            fill: str = "#333", stroke: str = "none", sw: int = 0) -> str:
    points = []
    for i in range(sides):
        angle = math.radians(rotation + i * 360 / sides)
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        points.append(f"{x:.2f},{y:.2f}")
    return (f'<polygon points="{" ".join(points)}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}"/>')


def triangle(cx: int, cy: int, r: int, fill: str = "#333", stroke: str = "none", sw: int = 0,
             rotation: float = -90) -> str:
    return polygon(3, cx, cy, r, rotation=rotation, fill=fill, stroke=stroke, sw=sw)


def square(x: int, y: int, size: int, fill: str = "#333", stroke: str = "none", sw: int = 0) -> str:
    return rect(x, y, size, size, fill=fill, stroke=stroke, sw=sw)


def pentagon(cx: int, cy: int, r: int, fill: str = "#333", stroke: str = "none", sw: int = 0) -> str:
    return polygon(5, cx, cy, r, rotation=-90, fill=fill, stroke=stroke, sw=sw)


def hexagon(cx: int, cy: int, r: int, fill: str = "#333", stroke: str = "none", sw: int = 0) -> str:
    return polygon(6, cx, cy, r, rotation=0, fill=fill, stroke=stroke, sw=sw)


def star(cx: int, cy: int, r_outer: int, r_inner: int, points: int = 5,
         fill: str = "#FFD700", stroke: str = "none", sw: int = 0) -> str:
    pts = []
    for i in range(points * 2):
        angle = math.radians(-90 + i * 180 / points)
        r = r_outer if i % 2 == 0 else r_inner
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        pts.append(f"{x:.2f},{y:.2f}")
    return (f'<polygon points="{" ".join(pts)}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}"/>')


def arrow(x1: int, y1: int, x2: int, y2: int, color: str = "#333", sw: int = 2) -> str:
    return (
        f'<defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" '
        f'orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="{color}"/></marker></defs>'
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
        f'stroke-width="{sw}" marker-end="url(#arr)"/>'
    )


def crescent(cx: int, cy: int, r: int, fill: str = "#333") -> str:
    x = cx - r
    y = cy - r
    d = 2 * r
    offset = r * 0.35
    return (
        f'<path d="M {cx},{cy - r} '
        f'A {r},{r} 0 1,1 {cx},{cy + r} '
        f'A {r * 0.7:.1f},{r * 0.7:.1f} 0 1,0 {cx},{cy - r} Z" '
        f'fill="{fill}" transform="rotate(30, {cx}, {cy})"/>'
    )


def text_label(x: int, y: int, text: str, size: int = 14, fill: str = "#222",
               anchor: str = "middle", weight: str = "normal") -> str:
    return (f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" '
            f'text-anchor="{anchor}" font-weight="{weight}" '
            f'font-family="monospace">{text}</text>')


def grid_cell(x: int, y: int, w: int, h: int, content: str,
              bg: str = "#F5F5F5", border: str = "#CCC") -> str:
    return (
        rect(x, y, w, h, fill=bg, stroke=border, sw=1)
        + content
    )


def blank_cell(x: int, y: int, w: int, h: int, bg: str = "#FFFDE7", border: str = "#CCC") -> str:
    return rect(x, y, w, h, fill=bg, stroke=border, sw=2)


COLORS = {
    "blue": "#4A90E2",
    "red": "#E74C3C",
    "green": "#27AE60",
    "yellow": "#F39C12",
    "purple": "#8E44AD",
    "gray": "#7F8C8D",
    "white": "#FFFFFF",
    "black": "#2C3E50",
    "orange": "#E67E22",
    "pink": "#FF6B9D",
}
