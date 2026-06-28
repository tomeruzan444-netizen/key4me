import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'src/data/pages');
const rd = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(DIR, f), s);

// 678 — reversed meaning
let a = rd('678.ts');
a = a.replace('בלי הקוד המדויק ניתן לנהוג ברכב', 'בלי הקוד המדויק לא ניתן לנהוג ברכב');
wr('678.ts', a); console.log('678 done');

// 636 — remove stray wrong in-content <h1>
let b = rd('636.ts');
b = b.replace('<h1>החלפת צילינדר רב בריח</h1>\n', '');
wr('636.ts', b); console.log('636 done');

// 455 — heading about קיה on a חיפה page
let c = rd('455.ts');
c = c.replace('מהו מחיר שכפול מפתח לרכב קיה?', 'כמה עולים שירותי מנעולן בחיפה?');
wr('455.ts', c); console.log('455 done');

// 19638 — national page, drop "בירושלים"
let d = rd('19638.ts');
d = d.split("בסוויץ' בירושלים").join("בסוויץ'");
wr('19638.ts', d); console.log('19638 done');

// 301 + 301_ — irrelevant door-repair paragraph under Hyundai pricing heading
const HYUNDAI = '<p>מחיר שכפול מפתח ליונדאי משתנה בהתאם לדגם, לשנתון ולסוג המפתח (רגיל, עם שלט או שלט חכם). בטבלה שלהלן תמצאו טווחי מחירים מעודכנים לכל דגם.</p>';
for (const f of ['301.ts', '301_.ts']) {
  let s = rd(f);
  const re = /<p>ישנן בעיות רבות המצריכות תיקון ושיפוץ דלתות פנים[\s\S]*?<\/p>/;
  if (re.test(s)) { s = s.replace(re, HYUNDAI); wr(f, s); console.log(f + ' door-paragraph replaced'); }
  else console.log(f + ' door-paragraph NOT found');
}
