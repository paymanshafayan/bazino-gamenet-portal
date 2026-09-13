#!/usr/bin/env python3
"""
تحلیل رنگ/چیدمان تصویر — «شبه‌بینایی» محلی بدون هیچ کلید/API.
  python3 palette.py <image> [--grid NxM] [--k K]
خروجی JSON: پالت رنگ‌های غالب، روشنایی کل، ماتریس روشنایی/رنگ سلول‌ها (چیدمان تقریبی).
"""
import sys, json
from PIL import Image
import numpy as np

def main():
    path = sys.argv[1]
    grid = (8, 6)
    k = 6
    if '--grid' in sys.argv:
        i = sys.argv.index('--grid'); grid = (int(sys.argv[i+1]), int(sys.argv[i+2]))
    if '--k' in sys.argv:
        i = sys.argv.index('--k'); k = int(sys.argv[i+1])

    im = Image.open(path).convert('RGB')
    W, H = im.size
    small = im.resize((200, int(200 * H / W)))
    arr = np.asarray(small).astype(float)

    # روشنایی کل
    lum = (0.2126*arr[:,:,0] + 0.7152*arr[:,:,1] + 0.0722*arr[:,:,2])
    brightness = round(float(lum.mean()), 1)

    # پالت غالب — کوانتیزه با quantize پیلو
    q = im.convert('P', palette=Image.ADAPTIVE, colors=k).convert('RGB')
    qa = np.asarray(q.resize((200, int(200*H/W)))).reshape(-1, 3)
    orig = arr.reshape(-1, 3)
    pal = []
    for c in np.unique(qa, axis=0):
        mask = (qa == c).all(axis=1)
        share = float(mask.mean())
        mean = orig[mask].mean(axis=0).round().astype(int)
        pal.append({'rgb': [int(x) for x in mean], 'hex': '#%02x%02x%02x' % tuple(mean), 'share': round(share, 3)})
    pal.sort(key=lambda p: -p['share'])

    # ماتریس چیدمان: رنگ متوسط + روشنایی هر سلول
    gx, gy = grid
    cells = []
    for yi in range(gy):
        row = []
        for xi in range(gx):
            cell = arr[int(yi*arr.shape[0]/gy):int((yi+1)*arr.shape[0]/gy),
                       int(xi*arr.shape[1]/gx):int((xi+1)*arr.shape[1]/gx)]
            m = cell.mean(axis=(0,1)).round().astype(int)
            l = round(float((0.2126*cell[:,:,0]+0.7152*cell[:,:,1]+0.0722*cell[:,:,2]).mean()), 0)
            row.append({'hex': '#%02x%02x%02x' % tuple(m), 'lum': int(l)})
        cells.append(row)

    print(json.dumps({
        'size': [W, H], 'brightness': brightness,
        'verdict': 'dark' if brightness < 80 else ('light' if brightness > 170 else 'medium'),
        'palette': pal, 'layout_grid': {'cols': gx, 'rows': gy, 'cells': cells},
    }, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    main()
