import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'src/data/pages');

let files = 0, n = 0;
for (const name of fs.readdirSync(DIR)) {
  if (!name.endsWith('.ts') || name === '_type.ts') continue;
  const fp = path.join(DIR, name);
  let s = fs.readFileSync(fp, 'utf8'); const before = s;
  // Collapse stray backslash runs before an apostrophe/quote (migration artifact: צ'יפ, ש"ח)
  s = s.replace(/\\+(?='יפ)/g, '');
  s = s.replace(/\\+(?="ח)/g, '');
  // English placeholders never filled in
  s = s.replace(/at \[phone number\] or \[email address\]/gi, 'at 054-541-8449');
  s = s.replace(/\[number of years\]/gi, 'over 10');
  s = s.replace(/ or \[email address\]/gi, '');
  s = s.replace(/\[phone number\]/gi, '054-541-8449');
  s = s.replace(/\[email address\]/gi, '');
  if (s !== before) { fs.writeFileSync(fp, s); files++; n++; }
}
console.log(`Escapes/placeholders fixed in ${files} files.`);
