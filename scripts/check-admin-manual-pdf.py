"""Optional structural PDF QA: pip install pymupdf. No network or database access."""
import json
from pathlib import Path
import pymupdf

root = Path(__file__).resolve().parents[1]
doc = pymupdf.open(root / 'public/admin-manual/bazino-admin-manual.pdf')
empty, overflow = [], []
all_text = ''
for index, page in enumerate(doc):
    # Footer is excluded when checking for effectively empty content.
    blocks = [b for b in page.get_text('blocks') if b[1] < page.rect.height - 30]
    text = ''.join(b[4] for b in blocks)
    all_text += text
    if len(text.strip()) < 90:
        empty.append(index + 1)
    if any(b[0] < -1 or b[1] < -1 or b[2] > page.rect.width + 1 or b[3] > page.rect.height + 1 for b in blocks):
        overflow.append(index + 1)
report = {
    'pages': len(doc),
    'outlineEntries': len(doc.get_toc()),
    'internalLinks': sum(link.get('kind') in (pymupdf.LINK_GOTO, pymupdf.LINK_NAMED) and 0 <= link.get('page', -1) < len(doc) for page in doc for link in page.get_links()),
    'nearEmptyPages': empty,
    'textOutsidePage': overflow,
    'persianTextExtractable': sum('\u0600' <= c <= '\u06ff' for c in all_text) > 10000,
}
(root / 'docs/admin-manual/pdf-validation.json').write_text(json.dumps(report, indent=2), encoding='utf8')
print(json.dumps(report, indent=2))
assert not empty and not overflow and report['persianTextExtractable']
assert report['internalLinks'] >= 33
