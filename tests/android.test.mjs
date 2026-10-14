import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { androidAssetName } from '../src/lib/androidTheme.js';
import { bubblePatchBounds } from '../src/lib/ninePatch.js';
import { CELL01R, CELL02R, CELL01S, CELL02S, SLOTS, BG_SLOTS, BUBBLE_SLOTS, scaledCells, CHAR_SCALE, CHAR_GAP } from '../src/constants/themeSpec.js';
import { validatedImages, createBuildServer } from '../server/android-build.mjs';
import { readFileSync } from 'node:fs';
import { buildApk, getSigningKey, readZip, THEME_IMAGES } from '../src/lib/apk.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
async function archive(extra = {}) {
  const zip = new JSZip();
  for (const name of ['theme_icon.png', ...['me','you'].flatMap(s => ['01','02'].map(n => `theme_chatroom_bubble_${s}_${n}_image.9.png`))]) {
    zip.file(`src/main/theme/drawable-xxhdpi/${name}`, png);
  }
  for (const [name, value] of Object.entries(extra)) zip.file(name, value);
  return zip.generateAsync({ type: 'nodebuffer' });
}

test('all intended iOS assets have Android resource mappings', () => {
  for (const slot of [...SLOTS, ...BG_SLOTS, ...BUBBLE_SLOTS]) {
    assert.match(androidAssetName(`${slot.name}@3x.png`), /^theme_[a-z0-9_]+$/);
  }
  assert.equal(androidAssetName('chatroomBubbleSend01Selected@3x.png'), 'theme_chatroom_bubble_me_01_pressed_image');
  assert.equal(androidAssetName('passcodeImgCode04Selected@3x.png'), 'theme_passcode_04_checked_image');
});

test('long message stretching excludes both characters and bubble outlines', () => {
  for (const [side, L] of [['left',CELL01R],['left',CELL02R],['right',CELL01S],['right',CELL02S]]) {
    const b = bubblePatchBounds({ side, L });
    assert.ok(b.content.left < b.stretch.x && b.stretch.x < b.content.right);
    assert.ok(b.content.top < b.stretch.y && b.stretch.y < b.content.bottom);
    if (L.char) {
      assert.ok(b.stretch.y > L.char.h);
      const charRight = side === 'left' ? L.charPad + L.char.w : L.w;
      const charLeft = side === 'left' ? 0 : L.w - L.charPad - L.char.w;
      assert.ok(b.stretch.x < charLeft || b.stretch.x > charRight);
    }
  }
});

test('server imports only allowed images and ignores uploaded build scripts', async () => {
  const images = await validatedImages(await archive({ 'build.gradle': 'malicious code', '../escape.txt': 'escape' }));
  assert.equal(images.size, 5);
  assert.equal(images.has('build.gradle'), false);
  const zip = new JSZip(); zip.file('src/main/theme/drawable-xxhdpi/theme_icon.png', 'not a png');
  await assert.rejects(validatedImages(await zip.generateAsync({type:'nodebuffer'})), /PNG/);
});

test('server rejects missing and oversized PNG resources', async () => {
  await assert.rejects(validatedImages(await new JSZip().generateAsync({type:'nodebuffer'})), /필수/);
  const oversized = Buffer.from(png); oversized.writeUInt32BE(10000,16);
  await assert.rejects(validatedImages(await archive({ 'src/main/theme/drawable-xxhdpi/theme_icon.png': oversized })), /크기/);
});

test('APK endpoint returns an APK, validates origin/type, and releases failed jobs', async () => {
  let calls = 0;
  const server = createBuildServer({ builder: async () => { if (++calls === 1) throw new Error('test failure'); return Buffer.from('APK fixture'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/android/build`;
  try {
    assert.equal((await fetch(url, {method:'POST',headers:{Origin:'https://other.site'}})).status,403);
    assert.equal((await fetch(url, {method:'POST'})).status,415);
    const post = () => fetch(url, {method:'POST',headers:{'Content-Type':'application/zip'},body:'fixture'});
    assert.equal((await post()).status,500);
    const response = await post();
    assert.equal(response.status,200);
    assert.equal(response.headers.get('Content-Type'),'application/vnd.android.package-archive');
    assert.equal(await response.text(),'APK fixture');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('browser APK swaps theme images, aligns stored files, and adds a v2 signature', async () => {
  const template = new Uint8Array(readFileSync(new URL('../public/theme-template.apk', import.meta.url)));
  const paths = JSON.parse(readFileSync(new URL('../public/theme-template.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(paths).sort(), THEME_IMAGES.map(n => n.replace(/\.9$/, '')).sort());
  const images = new Map([
    ['theme_icon', { png: new Uint8Array(png) }],
    ['theme_chatroom_bubble_me_01_image', { png: new Uint8Array(png), patch: { stretch: { x: 0, y: 0 }, content: { left: 0, top: 0, right: 1, bottom: 1 } } }],
  ]);
  const apk = await buildApk(template, paths, images, await getSigningKey(null));
  const entries = readZip(apk);
  assert.deepEqual([...entries.find(e => e.name === paths.theme_icon).data], [...png]);
  const bubble = Buffer.from(entries.find(e => e.name === paths.theme_chatroom_bubble_me_01_image).data);
  assert.equal(bubble.toString('ascii', 37, 41), 'npTc');
  for (const e of entries) if (e.method === 0) assert.equal(e.data.byteOffset % 4, 0, e.name);
  assert.ok(Buffer.from(apk).includes('APK Sig Block 42'));
  await assert.rejects(buildApk(template, paths, new Map([['nope', { png }]]), null), /없는 이미지/);
});

test('character size slider keeps bubbles aligned and stretchable at every size', () => {
  assert.deepEqual(scaledCells(1), { CELL01R, CELL02R, CELL01S, CELL02S });
  for (let s = CHAR_SCALE.min; s <= CHAR_SCALE.max + 1e-9; s += CHAR_SCALE.step) {
    const c = scaledCells(s);
    for (const [side, L] of [['left', c.CELL01R], ['left', c.CELL02R], ['right', c.CELL01S], ['right', c.CELL02S]]) {
      assert.doesNotThrow(() => bubblePatchBounds({ side, L }), `scale ${s}`);
    }
    assert.equal(c.CELL01R.bubble.x, c.CELL02R.bubble.x);
    assert.equal(c.CELL01S.bubble.x, c.CELL02S.bubble.x);
    assert.equal(c.CELL01R.bubble.x - c.CELL01R.char.w, CHAR_GAP);
  }
});
