import fs from 'node:fs';
import path from 'node:path';
const D = path.join(process.cwd(), 'src/data/pages');
const rd = f => fs.readFileSync(path.join(D, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(D, f), s);
const edits = {
  '110.ts': [['מחירים זולים ושירות אמין | ראו מחירון', 'מחיר זול ושירות אמין | KEY4ME']],
  '688.ts': [
    ['היתרונות של דלתות רב בריח מנעולן בקריות מציגה את יתרונות הדלתות | KEY4ME', 'היתרונות של דלתות רב בריח - מדריך מקיף | KEY4ME'],
    ['ניתר למצוא', 'ניתן למצוא'],
  ],
  '19638.ts': [["המפתח לא מסתובב בסוויץ' ? אנחנו נוכל לתקן - מחיר זול בכל הארץ", "המפתח לא מסתובב בסוויץ'? תיקון מהיר בכל הארץ | KEY4ME"]],
  '20266.ts': [['metaDesc: `תנאי שימוש`', 'metaDesc: `התנאים וההגבלות לשימוש באתר ובשירותי קי פור מי. כאן תמצאו את תנאי השימוש המלאים שלנו.`']],
  '6993.ts': [['וכמה מנעולן מנעולן רכב?', 'וכמה מנעולן רכב?']],
  '8418.ts': [
    ['שכפול מפתח לרכב בירושלים - החל מ 300 ש"ח { לחצו למחיר }', 'שכפול מפתח לרכב בירושלים - החל מ-300 ש"ח | KEY4ME'],
    ['ב*ירושלים', 'בירושלים'],
  ],
  '30013.ts': [
    ['metaTitle: `עמוד תודה`', 'metaTitle: `תודה שפניתם אלינו - קי פור מי`'],
    ['להשאיר לנו באתר איזי ביקורת', 'להשאיר לנו ביקורת באתר איזי'],
  ],
};
let log = [];
for (const [f, pairs] of Object.entries(edits)) {
  let s = rd(f); const before = s;
  for (const [a, b] of pairs) { if (s.includes(a)) s = s.split(a).join(b); else log.push(`${f} MISS: ${a.slice(0,25)}`); }
  if (s !== before) { wr(f, s); log.push(`${f} ✓`); }
}
console.log(log.join('\n'));
