// 브라우저에서 APK 를 만들 때 쓰는 빈 테마 APK 를 한 번 빌드한다.
// android-template 을 바꿨을 때만 다시 실행: npm run android:template-apk
// 필요: JDK 17, ANDROID_HOME (Android SDK)
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateSync, crc32 } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { THEME_IMAGES } from '../src/lib/apk.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!sdk) throw new Error('ANDROID_HOME 을 Android SDK 경로로 설정해 주세요.');

function chunk(type, data) {
  const head = Buffer.alloc(4); head.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])));
  return Buffer.concat([head, Buffer.from(type), data, crc]);
}
function png(w, h, pixel) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  const rows = [];
  for (let y = 0; y < h; y++) { rows.push(0); for (let x = 0; x < w; x++) rows.push(...pixel(x, y)); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.from(rows))), chunk('IEND', Buffer.alloc(0))]);
}
// 7x7 raw 9-patch: 가운데 1px 늘어남, 안쪽 3px 글자 영역
const ninePatch = () => png(7, 7, (x, y) => {
  const edge = x === 0 || y === 0 || x === 6 || y === 6;
  const mark = (y === 0 && x === 3) || (x === 0 && y === 3) || (y === 6 && x >= 2 && x <= 4) || (x === 6 && y >= 2 && y <= 4);
  return mark ? [0, 0, 0, 255] : edge ? [0, 0, 0, 0] : [255, 255, 255, 255];
});

const work = await mkdtemp(path.join(tmpdir(), 'themer-template-'));
try {
  await cp(path.join(root, 'android-template'), work, { recursive: true });
  const drawable = path.join(work, 'src/main/theme/drawable-xxhdpi');
  await mkdir(drawable, { recursive: true });
  // 같은 내용이면 빌드 도구가 파일을 합칠 수 있어서 이미지마다 색을 다르게 둔다
  for (const [i, name] of THEME_IMAGES.entries()) {
    await writeFile(path.join(drawable, `${name}.png`), name.endsWith('.9') ? ninePatch() : png(2, 2, () => [i, 0, 0, 255]));
  }
  execFileSync('sh', ['gradlew', '--no-daemon', '--console=plain', '-q', 'assembleRelease'], { cwd: work, stdio: 'inherit' });
  const apk = path.join(work, 'build/outputs/apk/release/MyCharacterTheme-release-unsigned.apk');

  // 리소스 이름 → APK 안 파일 경로 (릴리스 빌드는 경로를 res/Ab.png 처럼 줄인다)
  const tools = path.join(sdk, 'build-tools');
  const aapt2 = path.join(tools, readdirSync(tools).sort().at(-1), 'aapt2');
  const dump = execFileSync(aapt2, ['dump', 'resources', apk], { encoding: 'utf8' });
  const paths = {};
  for (const m of dump.matchAll(/drawable\/(theme_\w+)\n\s+\(xxhdpi\) \(file\) (\S+)/g)) paths[m[1]] = m[2];
  const missing = THEME_IMAGES.map((n) => n.replace(/\.9$/, '')).filter((n) => !paths[n]);
  if (missing.length) throw new Error(`APK 에 없는 이미지: ${missing.join(', ')}`);

  await writeFile(path.join(root, 'public/theme-template.apk'), await readFile(apk));
  await writeFile(path.join(root, 'public/theme-template.json'), `${JSON.stringify(paths, null, 1)}\n`);
  console.log(`theme-template.apk: 이미지 ${Object.keys(paths).length}개`);
} finally { await rm(work, { recursive: true, force: true }); }
