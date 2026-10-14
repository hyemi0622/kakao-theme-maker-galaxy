import http from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile, rm, cp } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const execute = promisify(execFile);
const TEMPLATE = fileURLToPath(new URL('../android-template/', import.meta.url));
const MAX_UPLOAD = 30 * 1024 * 1024;
const MAX_UNPACKED = 60 * 1024 * 1024;
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ALLOWED_IMAGES = new Set([
  'theme_icon', 'theme_chatroom_background_image', 'theme_background_image',
  'theme_passcode_background_image', 'theme_maintab_cell_image',
  ...['01', '02', '03'].map(n => `theme_profile_${n}_image`),
  ...['01', '02', '03', '04'].flatMap(n => [`theme_passcode_${n}_image`, `theme_passcode_${n}_checked_image`]),
  ...['friends', 'chats', 'now', 'shopping', 'call', 'more'].flatMap(n => [`theme_maintab_ico_${n}_image`, `theme_maintab_ico_${n}_focused_image`]),
  ...['me', 'you'].flatMap(side => ['01', '02'].flatMap(n => [`theme_chatroom_bubble_${side}_${n}_image.9`, `theme_chatroom_bubble_${side}_${n}_pressed_image.9`])),
].map(n => `src/main/theme/drawable-xxhdpi/${n}.png`));
const REQUIRED = ['theme_icon.png', 'theme_chatroom_bubble_me_01_image.9.png',
  'theme_chatroom_bubble_me_02_image.9.png', 'theme_chatroom_bubble_you_01_image.9.png',
  'theme_chatroom_bubble_you_02_image.9.png'].map(n => `src/main/theme/drawable-xxhdpi/${n}`);

export async function validatedImages(bytes) {
  const archive = await JSZip.loadAsync(bytes);
  const images = new Map();
  let size = 0;
  const entries = Object.values(archive.files);
  if (entries.length > 180) throw new Error('파일 수가 너무 많아요.');
  for (const entry of entries) {
    if (entry.dir) continue;
    // Never execute uploaded Gradle/Java/scripts; use only our own trusted template.
    if (!ALLOWED_IMAGES.has(entry.name)) continue;
    if (entry.unsafeOriginalName && entry.unsafeOriginalName !== entry.name) throw new Error('잘못된 파일 경로예요.');
    const length = entry._data.uncompressedSize;
    if (length > 12 * 1024 * 1024 || size + length > MAX_UNPACKED) throw new Error('이미지 용량이 너무 커요.');
    const buffer = await entry.async('nodebuffer');
    if (buffer.length !== length || buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG)
      || buffer.toString('ascii', 12, 16) !== 'IHDR') throw new Error('PNG 이미지가 아니에요.');
    const w = buffer.readUInt32BE(16), h = buffer.readUInt32BE(20);
    if (!w || !h || w > 4096 || h > 4096 || w * h > 12000000) throw new Error('이미지 크기가 너무 커요.');
    size += buffer.length;
    images.set(entry.name, buffer);
  }
  if (REQUIRED.some(name => !images.has(name))) throw new Error('필수 테마 이미지가 빠졌어요.');
  return images;
}

export async function buildApk(bytes) {
  const images = await validatedImages(bytes);
  const workspace = await mkdtemp(path.join(tmpdir(), 'themer-build-'));
  try {
    await cp(TEMPLATE, workspace, { recursive: true });
    for (const [name, buffer] of images) {
      const destination = path.join(workspace, name);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, buffer);
    }
    await execute('sh', [path.join(workspace, 'gradlew'), '--no-daemon', '--console=plain', 'assembleDebug'], {
      cwd: workspace, timeout: 270000, maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env },
    });
    return await readFile(path.join(workspace, 'build/outputs/apk/debug/MyCharacterTheme-debug.apk'));
  } finally { await rm(workspace, { recursive: true, force: true }); }
}

export function createBuildServer({ origin = 'http://localhost:5173', builder = buildApk } = {}) {
  let busy = false;
  return http.createServer(async (req, res) => {
    if (req.headers.origin && req.headers.origin !== origin) { res.writeHead(403); res.end('허용되지 않은 사이트예요.'); return; }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method === 'GET' && req.url === '/health') {
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true, busy })); return;
    }
    if (req.method !== 'POST' || req.url !== '/api/android/build') { res.writeHead(404); res.end(); return; }
    if (busy) { res.writeHead(429, { 'Retry-After': '30' }); res.end('다른 테마를 만드는 중이에요. 잠시 후 다시 시도해 주세요.'); return; }
    if (req.headers['content-type'] !== 'application/zip') { res.writeHead(415); res.end('프로젝트 ZIP이 필요해요.'); return; }
    if (Number(req.headers['content-length']) > MAX_UPLOAD) { res.writeHead(413); res.end('파일 용량이 너무 커요.'); req.resume(); return; }
    busy = true;
    try {
      let size = 0; const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_UPLOAD) { res.writeHead(413); res.end('파일 용량이 너무 커요.'); return; }
        chunks.push(chunk);
      }
      const apk = await builder(Buffer.concat(chunks));
      res.writeHead(200, { 'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="mytheme.apk"' });
      res.end(apk);
    } catch (error) {
      console.error('Android build failed:', error.message);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('APK 생성에 실패했어요. 서버의 Android SDK 설정을 확인하거나 프로젝트 ZIP을 이용해 주세요.');
    } finally { busy = false; }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8787);
  const server = createBuildServer({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173' });
  server.requestTimeout = 300000;
  server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Android builder: http://localhost:${port}`));
}
