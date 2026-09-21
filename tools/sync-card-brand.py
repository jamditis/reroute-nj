#!/usr/bin/env python3
"""Sync self-contained card branding after editing the SVGs or card stylesheet.

Authoring utility only. The deployed site does not run Python or need a build.
"""
import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    card_path = ROOT / "card.html"
    card = card_path.read_text(encoding="utf-8")
    for selector, asset in [
        (".card-attribution a::before", "logo.svg"),
        (".theme-dark .card-attribution a::before", "logo-reverse.svg"),
    ]:
        svg = (ROOT / "img" / asset).read_bytes()
        uri = "data:image/svg+xml;base64," + base64.b64encode(svg).decode("ascii")
        pattern = r"(?m)^(    " + re.escape(selector) + r' \{[^\n]*url\(")[^"]+("\)[^\n]*)$'
        card, count = re.subn(pattern, lambda m: m[1] + uri + m[2], card)
        if count != 1:
            raise ValueError("Expected one card logo rule: " + selector)
    style = re.search(r"<style>\n([\s\S]*?)\n  </style>", card)
    if not style:
        raise ValueError("Card stylesheet was not found")
    embed_path = ROOT / "js" / "embed.js"
    embed = embed_path.read_text(encoding="utf-8")
    begin = "      '  <style>\\n' +"
    end = "      '  </style>\\n' +"
    start = embed.index(begin)
    finish = embed.index(end, start) + len(end)
    lines = ["  <style>"] + style[1].splitlines() + ["  </style>"]
    replacement = "\n".join(
        "      '" + line.replace("\\", "\\\\").replace("'", "\\'") + "\\n' +"
        for line in lines
    )
    # Validate every source before replacing either file.
    card_path.write_text(card, encoding="utf-8")
    embed_path.write_text(embed[:start] + replacement + embed[finish:], encoding="utf-8")


if __name__ == "__main__":
    main()
