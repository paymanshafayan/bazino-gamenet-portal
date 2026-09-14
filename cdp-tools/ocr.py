#!/usr/bin/env python3
# OCR اسکرین‌شات با RapidOCR (مدل داخل پکیج، آفلاین) — متن + مختصات برای بازسازی چیدمان
# نصب (بعد از هر ریبیلد سندباکس): pip3 install --break-system-packages rapidocr-onnxruntime opencv-python-headless pillow
import sys, json
from rapidocr_onnxruntime import RapidOCR

path = sys.argv[1]
engine = RapidOCR()
result, _ = engine(path)
if not result:
    print(json.dumps({"text": "", "lines": 0}, ensure_ascii=False))
    sys.exit(0)

lines = []
for box, text, score in result:
    xs = [p[0] for p in box]; ys = [p[1] for p in box]
    lines.append({
        "t": text,
        "x": int(min(xs)), "y": int(min(ys)),
        "w": int(max(xs) - min(xs)), "h": int(max(ys) - min(ys)),
        "s": round(float(score), 2),
    })
lines.sort(key=lambda l: (l["y"] // 14, l["x"]))
print(json.dumps({"lines": len(lines), "items": lines}, ensure_ascii=False, indent=1))
