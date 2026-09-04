/**
 * i18n tooling — extract / apply / audit
 *
 *   tsx scripts/i18n-extract.mts extract  <out.json>  [files...]
 *       finds every `language === 'fa' ? A : B` (and nested ru/tr variants),
 *       writes {id, file, fa, en, ru?, tr?} entries (source text of each branch).
 *
 *   tsx scripts/i18n-extract.mts apply    <in.json>   [files...]
 *       replaces each ternary with L(language, { fa: A, en: B, ru: C, tr: D })
 *       where C/D come from the JSON (source expressions, e.g. quoted strings or
 *       template literals). Entries lacking ru/tr are skipped.
 *
 *   tsx scripts/i18n-extract.mts audit    [files...]
 *       prints remaining bilingual ternaries; exit 1 if any.
 */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const [, , cmd, ...rest] = process.argv;

function listFiles(args: string[]): string[] {
  if (args.length) return args;
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !/\.d\.ts$/.test(e.name)) out.push(p);
    }
  };
  walk('src');
  return out.filter(f => !f.includes('/utils/translations') && !f.endsWith('LanguageMenu.tsx') && !f.endsWith('i18n.ts'));
}

type Entry = { id: string; file: string; start: number; end: number; fa: string; en: string; ru?: string; tr?: string };

function langOf(cond: ts.Expression): string | null {
  // language === 'xx'  (optionally parenthesized)
  while (ts.isParenthesizedExpression(cond)) cond = cond.expression;
  if (ts.isBinaryExpression(cond) && cond.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
    const l = cond.left, r = cond.right;
    if (ts.isIdentifier(l) && l.text === 'language' && ts.isStringLiteral(r)) return r.text;
  }
  return null;
}

function strip(e: ts.Expression): ts.Expression {
  while (ts.isParenthesizedExpression(e)) e = e.expression;
  return e;
}

/** Flatten `language==='fa' ? A : (language==='ru' ? B : (language==='tr' ? C : D))` */
function flatten(node: ts.ConditionalExpression, src: ts.SourceFile): Record<string, string> | null {
  const out: Record<string, string> = {};
  let cur: ts.Expression = node;
  while (ts.isConditionalExpression(cur)) {
    const l = langOf(cur.condition);
    if (!l) return null;
    out[l] = strip(cur.whenTrue).getText(src);
    cur = strip(cur.whenFalse);
  }
  if (!out.fa) return null;
  // whatever is left is the default (english)
  out.en = out.en ?? cur.getText(src);
  return out;
}

function collect(file: string): Entry[] {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const entries: Entry[] = [];
  let n = 0;
  const visit = (node: ts.Node) => {
    if (ts.isConditionalExpression(node)) {
      const flat = flatten(node, sf);
      if (flat) {
        entries.push({ id: `${path.basename(file)}#${n++}`, file, start: node.getStart(sf), end: node.getEnd(), fa: flat.fa, en: flat.en, ru: flat.ru, tr: flat.tr });
        return; // don't descend into nested branches
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return entries;
}

if (cmd === 'extract') {
  const [out, ...files] = rest;
  const all = listFiles(files).flatMap(collect);
  fs.writeFileSync(out, JSON.stringify(all.map(({ start, end, ...e }) => e), null, 2));
  console.log(`extracted ${all.length} entries → ${out}`);
} else if (cmd === 'apply') {
  const [inp, ...files] = rest;
  const data: Entry[] = JSON.parse(fs.readFileSync(inp, 'utf8'));
  const byId = new Map(data.map(e => [e.id, e]));
  let applied = 0, skipped = 0;
  for (const file of listFiles(files)) {
    const entries = collect(file);
    if (!entries.length) continue;
    let text = fs.readFileSync(file, 'utf8');
    // apply from the end so offsets stay valid
    for (const e of [...entries].reverse()) {
      const t = byId.get(e.id);
      if (!t || !t.ru || !t.tr || t.fa !== e.fa || t.en !== e.en) { skipped++; continue; }
      const repl = `L(language, { fa: ${e.fa}, en: ${e.en}, ru: ${t.ru}, tr: ${t.tr} })`;
      text = text.slice(0, e.start) + repl + text.slice(e.end);
      applied++;
    }
    if (!/from ['"][^'"]*utils\/i18n['"]/.test(text) && text.includes('L(language,')) {
      const rel = path.relative(path.dirname(file), 'src/utils/i18n').replace(/\\/g, '/');
      const imp = `import { L } from '${rel.startsWith('.') ? rel : './' + rel}';\n`;
      // after the last complete import declaration (AST-based, multi-line safe)
      const sf2 = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      let pos = 0;
      for (const st of sf2.statements) if (ts.isImportDeclaration(st)) pos = st.getEnd();
      const nl = text.indexOf('\n', pos);
      pos = nl === -1 ? text.length : nl + 1;
      text = text.slice(0, pos) + imp + text.slice(pos);
    }
    fs.writeFileSync(file, text);
  }
  console.log(`applied ${applied}, skipped ${skipped}`);
} else if (cmd === 'audit') {
  const all = listFiles(rest).flatMap(collect);
  for (const e of all) console.log(`${e.file}: ${e.fa.slice(0, 40)} | ${e.en.slice(0, 40)}`);
  console.log(`\n${all.length} bilingual ternaries remaining`);
  process.exit(all.length ? 1 : 0);
} else {
  console.error('usage: extract <out.json> | apply <in.json> | audit');
  process.exit(2);
}
