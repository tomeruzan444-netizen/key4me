import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'src/data/pages');
const fix = (file, pairs) => {
  const fp = path.join(DIR, file);
  let s = fs.readFileSync(fp, 'utf8'); let n = 0;
  for (const [f, r] of pairs) { if (s.includes(f)) { n += s.split(f).length - 1; s = s.split(f).join(r); } else console.log(`  ! not found in ${file}: ${f.slice(0,40)}`); }
  fs.writeFileSync(fp, s); console.log(`${file}: ${n} fixes`);
};

fix('62680.ts', [['קריאת שירות דחופה בחדרה', 'קריאת שירות דחופה בנס ציונה']]);
fix('8446.ts', [['שכפול מפתחות לרכב במודיעין', 'שכפול מפתחות לרכב בנתניה']]);
fix('5589.ts', [['מחיר שכפול מפתח לרכב קרייזלר', 'מחיר שכפול מפתח לרכב קאדילק']]);
fix('2616.ts', [['שכפול מפתחות לרכב סיטרואן', 'שכפול מפתחות לרכב סובארו']]);
fix('282.ts', [['מוסך מורשה של קיה', 'מוסך מורשה של שברולט']]);
fix('228.ts', [['מפתח מקורי לרכב יונדאי הוא יקר יותר', 'מפתח מקורי לרכב מרצדס הוא יקר יותר']]);
fix('8899.ts', [['בי וואי די BDY', 'בי וואי די BYD'], ['BDY', 'BYD']]);
