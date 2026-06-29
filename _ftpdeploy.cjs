// Resilient FTPS uploader: reconnects on ECONNRESET, uploads dir-by-dir.
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

const SD = process.argv[2];
const c = JSON.parse(fs.readFileSync(path.join(SD, 'ftpcreds.json'), 'utf8'));
const REMOTE_BASE = '/domains/keyforme.co.il/public_html';
const LOCAL = 'dist';

function walk(dir, rel, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const lp = path.join(dir, e.name);
    const rp = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) walk(lp, rp, acc);
    else acc.push({ local: lp, relDir: rel, name: e.name });
  }
  return acc;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function connect() {
  const client = new ftp.Client(45000);
  await client.access({ host: c.host, user: c.user, password: c.password, port: c.port, secure: c.secure, secureOptions: { rejectUnauthorized: false } });
  return client;
}

(async () => {
  let files = walk(LOCAL, '', []);
  const SKIP = (process.env.SKIP || '').split(',').filter(Boolean);
  if (SKIP.length) files = files.filter(f => !SKIP.some(s => f.relDir === s || f.relDir.startsWith(s + '/')));
  // group by relative dir
  const byDir = {};
  for (const f of files) (byDir[f.relDir] ||= []).push(f);
  const dirs = Object.keys(byDir).sort();
  console.log(`Total: ${files.length} files in ${dirs.length} dirs`);

  let client = await connect();
  let done = 0;
  for (let d = 0; d < dirs.length; d++) {
    const dir = dirs[d];
    const remoteDir = dir ? REMOTE_BASE + '/' + dir : REMOTE_BASE;
    let tries = 0;
    while (true) {
      try {
        await client.ensureDir(remoteDir);
        for (const f of byDir[dir]) { await client.uploadFrom(f.local, f.name); done++; }
        break;
      } catch (e) {
        tries++;
        if (tries > 6) { console.log(`FATAL on dir "${dir}": ${e.message}`); throw e; }
        console.log(`  reconnect (${tries}) on "${dir}": ${e.message}`);
        try { client.close(); } catch {}
        await sleep(2000);
        client = await connect();
      }
    }
    if ((d + 1) % 20 === 0 || d === dirs.length - 1) console.log(`  dirs ${d + 1}/${dirs.length} | files ${done}/${files.length}`);
  }
  client.close();
  console.log(`DONE: uploaded ${done}/${files.length} files`);
})().catch(e => { console.log('SCRIPT ERROR:', e.message); process.exit(1); });
