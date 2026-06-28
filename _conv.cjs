const sharp = require('sharp');
(async () => {
  for (const f of ['newkeybannerimg-1','../2024/07/Car-locksmith-']) {
    try {
      const src = 'public/wp-content/uploads/2025/05/' + f + '.webp';
      const meta = await sharp(src).metadata();
      console.log(f, meta.width + 'x' + meta.height);
      await sharp(src).resize(560).png().toFile('_preview_' + f.replace(/[^a-z0-9]/gi,'_') + '.png');
    } catch(e){ console.log('ERR', f, e.message); }
  }
})();
