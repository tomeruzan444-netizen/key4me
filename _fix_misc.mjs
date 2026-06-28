import fs from 'node:fs';
import path from 'node:path';
const D = path.join(process.cwd(), 'src/data/pages');
const rd = f => fs.readFileSync(path.join(D, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(D, f), s);
let log = [];

// 680 — wrong phone number -> brand mobile
let a = rd('680.ts');
let b = a.split('+972559687997').join('+972545418449');
if (b !== a) { wr('680.ts', b); log.push('680 phone ✓'); }

// 301 / 301_ — Hyundai i25 does not exist (=> i20), i35 does not exist (=> ix35)
for (const f of ['301.ts', '301_.ts']) {
  a = rd(f);
  b = a.split('i25/i20').join('i20').split('i25 / i20').join('i20')
       .split('i25').join('i20')
       .split('i30 / i35').join('i30 / ix35').split('i30/i35').join('i30/ix35');
  if (b !== a) { wr(f, b); log.push(`${f} models ✓`); }
}
console.log(log.join('  |  '));
