import fs from 'node:fs';
import path from 'node:path';
const D = path.join(process.cwd(), 'src/data/pages');
const rd = f => fs.readFileSync(path.join(D, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(D, f), s);
let log = [];

// 696 — "אור מנעולים קולגה שלנו" (text promo of a competitor)
let a = rd('696.ts');
let b = a.replace(/ל?\s*אור\s+מנעולים\s+קולגה\s+שלנו/g, 'אלינו בכל שעה');
if (b !== a) { wr('696.ts', b); log.push('696 ✓'); } else log.push('696 MISS');

// 61614 — golf motors sentence
a = rd('61614.ts');
b = a.replace(/\s*לדוגמה,?\s*באתר של גולף מוטורס[\s\S]*?כמו בעיות נעילה\./g, '');
if (b !== a) { wr('61614.ts', b); log.push('61614 ✓'); } else log.push('61614 MISS');

// 61617 — kalnoitstar scooter promo segment
a = rd('61617.ts');
b = a.replace(/\s*במקרים בהם אתם זקוקים לפתרון מהיר בשטח, ניתן גם לשקול רכישת קלנועית[\s\S]*?תקלות חוזרות\.<\/span>/g, '</span>');
if (b !== a) { wr('61617.ts', b); log.push('61617 ✓'); } else log.push('61617 MISS');

// Generic: unwrap external competitor <a> wrappers, keep inner text
for (const [f, host] of [['58345.ts','brickstone\\.co\\.il'], ['540.ts','mul-t-lock\\.co\\.il']]) {
  a = rd(f);
  const re = new RegExp(`<a [^>]*href="https?://(?:www\\.)?${host}[^"]*"[^>]*>([\\s\\S]*?)</a>`, 'gi');
  b = a.replace(re, '$1');
  if (b !== a) { wr(f, b); log.push(`${f} ✓`); } else log.push(`${f} MISS`);
}

console.log(log.join('  |  '));
