import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const edits = {
  'src/data/pages/171.ts':   [['ניסיון של מעל 7 שנים', 'ניסיון של מעל 15 שנים']],
  'src/data/pages/253.ts':   [['ניסיון של מעל 7 שנים', 'ניסיון של מעל 15 שנים']],
  'src/data/pages/2751.ts':  [['וותק של מעל 10 שנים', 'וותק של מעל 15 שנים']],
  'src/data/pages/4139.ts':  [['פועלת כבר למעלה מ-20 שנה', 'פועלת כבר למעלה מ-15 שנה']],
  'src/data/pages/53097.ts': [['כבר למעלה מ-10 שנים', 'כבר למעלה מ-15 שנים']],
  'src/data/pages/62250.ts': [['ניסיון של מעל עשור', 'ניסיון של מעל 15 שנים']],
  'src/data/pages/62266.ts': [['ניסיון של מעל עשור', 'ניסיון של מעל 15 שנים']],
  'src/data/pages/62923.ts': [['ניסיון של למעלה מעשור', 'ניסיון של למעלה מ-15 שנים']],
  'src/data/pages/62955.ts': [['כבר למעלה מעשור', 'כבר למעלה מ-15 שנה']],
  'src/pages/index.astro':   [["m: '+10', label: 'שנות ניסיון'", "m: '+15', label: 'שנות ניסיון'"]],
};
let log = [];
for (const [rel, pairs] of Object.entries(edits)) {
  const fp = path.join(root, rel);
  let s = fs.readFileSync(fp, 'utf8'); const before = s;
  for (const [a, b] of pairs) { if (s.includes(a)) s = s.split(a).join(b); else log.push(`${rel} MISS: ${a}`); }
  if (s !== before) { fs.writeFileSync(fp, s); log.push(`${rel} ✓`); }
}
console.log(log.join('\n'));
