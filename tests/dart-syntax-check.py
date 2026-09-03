#!/usr/bin/env python3
"""
بررسی نحوی (syntax) سورس دارت بدون نیاز به Flutter SDK.

چرا: نصب Flutter در این sandbox ممکن نیست (Dart SDK و pub.dev هر دو بسته‌اند).
همین تکنیک در پروژه‌ی Mobilo همین کاربر استفاده شده است — رجوع کنید به
`docs/HANDOFF.md` آن ریپو: «تکیه کن روی (الف) CI به‌عنوان build truth،
(ب) tree-sitter syntax check، (ج) شبیه‌سازی منطق با Python».

این اسکریپت هر فایل .dart را با گرامر رسمی دارت پارس می‌کند و گره‌های ERROR و MISSING
را گزارش می‌دهد. خطای نحوی را قطعی پیدا می‌کند؛ خطای نوع/تحلیل را نه (آن کار `flutter analyze` در CI است).

اجرا:
    python3 -m venv /tmp/tsenv2 && /tmp/tsenv2/bin/pip install tree-sitter tree-sitter-dart
    /tmp/tsenv2/bin/python tests/dart-syntax-check.py [مسیر]
"""
import sys
import pathlib

import tree_sitter_dart
from tree_sitter import Language, Parser

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "flutter_app").resolve()

parser = Parser(Language(tree_sitter_dart.language()))

files = sorted(ROOT.rglob("*.dart"))
if not files:
    print(f"no .dart files under {ROOT}")
    sys.exit(1)

def collect_problems(node, out):
    """گره‌های ERROR و MISSING را جمع می‌کند (پیمایش تکراری، نه بازگشتی)."""
    stack = [node]
    while stack:
        n = stack.pop()
        if n.type == "ERROR" or n.is_missing:
            out.append(n)
            continue          # داخل یک زیردرخت خراب دنبال خطای تودرتو نمی‌گردیم
        if n.has_error:
            stack.extend(n.children)

total_problems = 0
checked = 0
lines_total = 0

for f in files:
    src = f.read_bytes()
    lines_total += src.count(b"\n") + 1
    tree = parser.parse(src)
    checked += 1
    if not tree.root_node.has_error:
        continue
    problems = []
    collect_problems(tree.root_node, problems)
    if not problems:
        continue
    rel = f.relative_to(ROOT.parent)
    for n in problems:
        row = n.start_point[0] + 1
        col = n.start_point[1] + 1
        snippet = src[n.start_byte:n.end_byte][:90].decode("utf8", "replace").replace("\n", " ⏎ ")
        kind = "MISSING" if n.is_missing else "ERROR"
        print(f"{rel}:{row}:{col}  {kind}  {snippet}")
        total_problems += 1

print()
print(f"files parsed : {checked}")
print(f"lines        : {lines_total}")
print(f"syntax errors: {total_problems}")
sys.exit(1 if total_problems else 0)
