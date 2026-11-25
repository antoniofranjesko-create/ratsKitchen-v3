// Free automatic art: fetches one image per card picture from Pollinations (no account, no key),
// saves it into tools/print/art/ under the name the card builder looks for, then you rebuild the PDF.
// Run on your own computer (needs Node 18+ and internet):
//   node tools/print/gen_art.js          -> fetches every missing image (about 70; ~20 min, the free tier allows 1 request per ~15 s)
//   node tools/print/gen_art.js poach    -> (re)fetches only keys containing "poach"
//   node tools/print/build_cards.js      -> rebuilds the PDF with the new art
// Delete an image from art/ and rerun to get a new one; change SEED in prompts.js for a different batch.
const fs = require('fs'), path = require('path');
const ART = path.join(__dirname, 'art'); fs.mkdirSync(ART, { recursive: true });
const WAIT = 16000, only = process.argv[2];

const { jobs, urlFor } = require('./prompts');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const todo = jobs.filter(j => (!only || j.file.includes(only)) && (only || !fs.existsSync(path.join(ART, j.file + '.jpg'))));
  console.log(`${todo.length} images to fetch (${jobs.length} in total).`);
  for (const [i, j] of todo.entries()) {
    const url = urlFor(j);
    for (let tries = 0; tries < 4; tries++) {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        fs.writeFileSync(path.join(ART, j.file + '.jpg'), Buffer.from(await r.arrayBuffer()));
        console.log(`[${i + 1}/${todo.length}] ${j.file}.jpg`); break;
      } catch (e) { console.log(`  ${j.file}: ${e.message}, retrying`); await sleep(WAIT * 2); }
    }
    await sleep(WAIT);
  }
  console.log('Done. Now run: node tools/print/build_cards.js');
})();
