#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ちえの もり ── ホーム画面の絵（icon.png）を作る唯一の道具（つよくなるオセロの道具と同じ型）。

絵の中身＝みどりの地に 木（はっぱ3つ）。右下に 白い紙と その中の 橙の△・青の○＝「もりで もんだい」が 一目で分かる。文字は入れない。

大きさ＝180×180。透明を持たない（RGB）＝iOS 10 は透明部分を黒で塗るため。
色は src/template.html と同じ名札（--ao / --daidai / --shiro）。

使い方＝ python3 tools/make_icon.py          ← icon.png を作り直す
         python3 tools/make_icon.py --check  ← 作らずに、今ある icon.png を見るだけ
終了コード＝0（できた）/ 1（できなかった）
"""
import math
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT = os.path.join(REPO, 'icon.png')

SIZE = 180
SS = 8
AO = (0x1f, 0x77, 0xd0)
AO_DARK = (0x00, 0x4c, 0x7a)
DAIDAI = (0xf0, 0x93, 0x2b)
SHIRO = (0xff, 0xfd, 0xf7)
SUMI = (0x1b, 0x1b, 0x1b)
MIDORI = (0x2e, 0x8b, 0x57)
HAPPA = (0x8f, 0xd1, 0x6a)
MIKI = (0x7a, 0x4e, 0x2a)


def rot(p, cx, cy, deg):
    a = math.radians(deg)
    x, y = p[0] - cx, p[1] - cy
    return (cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a))


def draw():
    n = SIZE * SS
    im = Image.new('RGB', (n, n), MIDORI)
    d = ImageDraw.Draw(im)
    cx = cy = n / 2.0
    # 木（みき＝茶・はっぱ＝明るい みどりの まる 3つ）
    tw = n * 0.09
    d.rectangle([cx - tw / 2, cy - n * 0.02, cx + tw / 2, cy + n * 0.36], fill=MIKI)
    for (ox, oy, r) in ((-0.17, -0.08, 0.17), (0.17, -0.08, 0.17), (0.0, -0.24, 0.2)):
        d.ellipse([cx + ox * n - r * n, cy + oy * n - r * n, cx + ox * n + r * n, cy + oy * n + r * n], fill=HAPPA, outline=SUMI, width=int(n * 0.012))
    # 白い紙（右下に すこし かたむけて）＝もんだいの かみ
    w, h = n * 0.26, n * 0.2
    px, py = cx + n * 0.16, cy + n * 0.22
    corners = [(px - w / 2, py - h / 2), (px + w / 2, py - h / 2), (px + w / 2, py + h / 2), (px - w / 2, py + h / 2)]
    corners = [rot(p, px, py, -10) for p in corners]
    d.polygon(corners, fill=SHIRO, outline=SUMI, width=int(n * 0.012))
    # 紙の中に 橙の△ と 青の○
    q = h * 0.3
    t = [(px - w * 0.22, py - q), (px - w * 0.22 + q, py + q * 0.7), (px - w * 0.22 - q, py + q * 0.7)]
    d.polygon([rot(p, px, py, -10) for p in t], fill=DAIDAI, outline=SUMI, width=int(n * 0.008))
    c = rot((px + w * 0.22, py), px, py, -10)
    rr = q * 0.85
    d.ellipse([c[0] - rr, c[1] - rr, c[0] + rr, c[1] + rr], outline=AO, width=int(n * 0.03))
    return im.resize((SIZE, SIZE), Image.LANCZOS)


def look(path):
    if not os.path.exists(path):
        return '絵がありません＝' + path
    try:
        with Image.open(path) as im:
            im.verify()
        with Image.open(path) as im:
            if im.size != (SIZE, SIZE):
                return '大きさが %s＝%d×%d でなければなりません' % (im.size, SIZE, SIZE)
            if im.mode != 'RGB':
                return '色の持ち方が %s＝RGB（透明なし）でなければなりません' % im.mode
    except Exception as e:
        return 'こわれています＝' + str(e)
    return ''


def main():
    if '--check' in sys.argv:
        bad = look(OUT)
        if bad:
            sys.exit('✕ ' + bad)
        print('✓ %s ＝ %d×%d・透明なし・こわれていない（%d バイト）' % (OUT, SIZE, SIZE, os.path.getsize(OUT)))
        return
    im = draw()
    im.save(OUT, 'PNG', optimize=True)
    bad = look(OUT)
    if bad:
        sys.exit('書きましたが確かめに落ちました＝' + bad)
    print('できました ＝ %s（%d×%d・%d バイト）' % (OUT, SIZE, SIZE, os.path.getsize(OUT)))


if __name__ == '__main__':
    main()
