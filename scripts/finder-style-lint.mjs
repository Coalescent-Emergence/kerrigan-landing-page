// Style lint for the finder stylesheet(s): fails (exit 1) when
//  - the same selector is declared twice in the same context (top level, or inside the same
//    @media/@supports condition), so each component keeps one rule block, or
//  - a `vh` length unit is used (it ignores phone browser toolbars; use dvh or svh).
// No dependencies:  node scripts/finder-style-lint.mjs assets/css/finder.css
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: finder-style-lint.mjs <css file>...'); process.exit(2); }

let failed = false;
for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  // Blank out comments, keeping newlines so line numbers stay true.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const problems = [];
  const lineAt = (i) => src.slice(0, i).split('\n').length;

  for (const m of src.matchAll(/[\d.]vh\b/g)) {
    problems.push(`${file}:${lineAt(m.index)}: "vh" unit (${src.slice(Math.max(0, m.index - 12), m.index + 4).trim()}) ignores phone toolbars; use dvh or svh`);
  }

  const seen = new Map(); // context + selector -> first line
  const stack = [];       // enclosing at-rule conditions
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      const head = src.slice(start, i).trim().replace(/\s+/g, ' ');
      if (head.startsWith('@')) {
        stack.push(head.startsWith('@keyframes') || head.startsWith('@font-face') ? head + '#' : head);
      } else if (!stack.some((s) => s.endsWith('#'))) {
        for (const sel of head.split(',').map((s) => s.trim().replace(/\s*([>+~])\s*/g, ' $1 ')).filter(Boolean)) {
          const key = `${stack.join(' / ') || '(top level)'} :: ${sel}`;
          if (seen.has(key)) problems.push(`${file}:${lineAt(i)}: duplicate selector "${sel}" in ${stack.join(' / ') || 'top level'} (first at line ${seen.get(key)})`);
          else seen.set(key, lineAt(i));
        }
        stack.push(head);
      } else stack.push(head);
      start = i + 1;
    } else if (ch === '}') { stack.pop(); start = i + 1; }
    else if (ch === ';') start = i + 1;
  }
  for (const p of problems) console.error(p);
  if (problems.length) failed = true;
  else console.log(`${file}: ok (${seen.size} selectors, no duplicates, no vh)`);
}
process.exit(failed ? 1 : 0);
