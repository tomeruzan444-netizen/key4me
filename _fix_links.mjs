import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'src/data/pages');
const rd = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(DIR, f), s);
let log = [];

// 540 — two dead internal links → nearest real pages
let a = rd('540.ts');
a = a.split('/שכפול-מפתחות-לבית-בחיפה/').join('/מנעולן-בחיפה/');
a = a.split('/פורץ-רכבים-בנשר/').join('/מנעולן-בנשר/');
wr('540.ts', a); log.push('540: fixed 2 dead links');

// 62948 — שכפול-שלט-לרכב (missing) → קידוד-שלט-לרכב
let b = rd('62948.ts');
b = b.split('/שכפול-שלט-לרכב/').join('/קידוד-שלט-לרכב/');
wr('62948.ts', b); log.push('62948: fixed שלט link');

// 53097 — city links all wrongly point to tel-aviv; map by city name
let c = rd('53097.ts');
const cityMap = [
  ['קודן לרכב ביבנה', '/קודן-לרכב-ביבנה/'],
  ['קודן לרכב בהרצליה', '/קודן-לרכב-בהרצליה-מחירי-ניתוק-והתקנה-ב/'],
  ['קודן לרכב ברמת השרון', '/קודן-לרכב-ברמת-השרון/'],
  ['קודן לרכב בלוד', '/ניתוק-קודן-לרכב/'],
];
for (const [city, target] of cityMap) {
  const re = new RegExp('/קודן-לרכב-בתל-אביב/("><br>\\s*)' + city, 'g');
  c = c.replace(re, target + '$1' + city);
}
wr('53097.ts', c); log.push('53097: remapped city links');

// 8715 — wrong door-type links
let d = rd('8715.ts');
d = d.replace('<h2>תיקון דלתות רב בריח</h2>\n<p><a href="/תיקון-דלתות-אלומיניום/"', '<h2>תיקון דלתות רב בריח</h2>\n<p><a href="/פריצת-דלת-רב-בריח/"');
d = d.replace('<h2>תיקון דלתות אלומיניום</h2>\n<p><a href="/תיקון-דלת-ממד/"', '<h2>תיקון דלתות אלומיניום</h2>\n<p><a href="/התקנה-ותיקון-דלתות/"');
wr('8715.ts', d); log.push('8715: fixed door-type links');

console.log(log.join('\n'));
