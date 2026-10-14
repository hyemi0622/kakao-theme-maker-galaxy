import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { androidAssetName } from '../src/lib/androidTheme.js';
import { bubblePatchBounds } from '../src/lib/ninePatch.js';
import { CELL01R, CELL02R, CELL01S, CELL02S, SLOTS, BG_SLOTS, BUBBLE_SLOTS } from '../src/constants/themeSpec.js';
import { validatedImages, createBuildServer } from '../server/android-build.mjs';

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
