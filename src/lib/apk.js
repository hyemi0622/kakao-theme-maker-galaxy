/**
 * 서버 없이 브라우저에서 갤럭시 테마 APK 만들기.
 * 미리 빌드한 빈 테마 APK(public/theme-template.apk)의 이미지만 바꿔 끼우고
 * APK Signature Scheme v2 로 다시 서명한다. (minSdk 28 이라 v1 서명 불필요)
 * 브라우저/Node 둘 다 동작하도록 DOM 없이 바이트만 다룬다.
 */

export const THEME_IMAGES = [
  'theme_icon', 'theme_chatroom_background_image', 'theme_background_image',
  'theme_passcode_background_image', 'theme_maintab_cell_image',
  ...['01', '02', '03'].map((n) => `theme_profile_${n}_image`),
  ...['01', '02', '03', '04'].flatMap((n) => [`theme_passcode_${n}_image`, `theme_passcode_${n}_checked_image`]),
  ...['friends', 'chats', 'now', 'shopping', 'call', 'more'].flatMap((n) => [`theme_maintab_ico_${n}_image`, `theme_maintab_ico_${n}_focused_image`]),
  ...['me', 'you'].flatMap((side) => ['01', '02'].flatMap((n) => [`theme_chatroom_bubble_${side}_${n}_image.9`, `theme_chatroom_bubble_${side}_${n}_pressed_image.9`])),
];

export const APK_TYPE = 'application/vnd.android.package-archive';
const enc = new TextEncoder();

/* ── 공통 ── */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
export function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const u32le = (v) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v, true); return b; };
const u64le = (v) => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, BigInt(v), true); return b; };
const lp = (bytes) => concat([u32le(bytes.length), bytes]);   // length-prefixed
const sha256 = async (bytes) => new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));

/* ── 9-patch 컴파일 (aapt2 와 같은 npTc 청크) ── */
/**
 * @param {Uint8Array} png 테두리 없는 말풍선 PNG
 * @param {{stretch:{x:number,y:number}, content:{left:number,top:number,right:number,bottom:number}}} bounds
 */
export function compileNinePatch(png, bounds) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  if (view.getUint32(12) !== 0x49484452) throw new Error('PNG 이미지가 아니에요.');
  const w = view.getUint32(16), h = view.getUint32(20);
  const { stretch: s, content: c } = bounds;
  const xDivs = [s.x, s.x + 1], yDivs = [s.y, s.y + 1];
  const colors = 9;
  const data = new Uint8Array(32 + 4 * (xDivs.length + yDivs.length + colors));
  const d = new DataView(data.buffer);
  data.set([0, xDivs.length, yDivs.length, colors]);
  d.setUint32(4, 32, true);                                     // 기기 쪽에서 다시 계산하는 offset 들
  d.setUint32(8, 32 + 4 * xDivs.length, true);
  d.setInt32(12, c.left); d.setInt32(16, w - c.right);
  d.setInt32(20, c.top); d.setInt32(24, h - c.bottom);
  d.setUint32(28, 32 + 4 * (xDivs.length + yDivs.length), true);
  [...xDivs, ...yDivs].forEach((v, i) => d.setInt32(32 + i * 4, v));
  for (let i = 0; i < colors; i++) d.setUint32(32 + 4 * (xDivs.length + yDivs.length + i), 1); // NO_COLOR
  const type = enc.encode('npTc');
  const chunk = concat([new Uint8Array([0, 0, 0, 0]), type, data, new Uint8Array(4)]);
  const cv = new DataView(chunk.buffer);
  cv.setUint32(0, data.length);
  cv.setUint32(chunk.length - 4, crc32(concat([type, data])));
  return concat([png.subarray(0, 33), chunk, png.subarray(33)]); // IHDR 바로 뒤
}

/* ── ZIP ── */
export function readZip(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = bytes.length - 22;
  while (eocd >= 0 && v.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('APK 템플릿이 손상됐어요.');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const size = v.getUint32(p + 20, true);
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    entries.push({
      name: new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen)),
      method: v.getUint16(p + 10, true), crc: v.getUint32(p + 16, true),
      size: v.getUint32(p + 24, true), data: bytes.subarray(start, start + size),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** 압축 안 한 항목은 4바이트 정렬 (Android 11+ 는 resources.arsc 정렬 필수) */
export function writeZip(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    let extra = new Uint8Array(0);
    if (e.method === 0) {
      const pad = (4 - ((offset + 30 + name.length + 6) % 4)) % 4;
      extra = new Uint8Array(6 + pad);
      const x = new DataView(extra.buffer);
      x.setUint16(0, 0xd935, true); x.setUint16(2, 2 + pad, true); x.setUint16(4, 4, true);
    }
    const head = new Uint8Array(30); const h = new DataView(head.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, e.method, true);
    h.setUint16(12, 0x21, true);                                        // 1980-01-01
    h.setUint32(14, e.crc, true); h.setUint32(18, e.data.length, true); h.setUint32(22, e.size, true);
    h.setUint16(26, name.length, true); h.setUint16(28, extra.length, true);
    const cen = new Uint8Array(46); const c = new DataView(cen.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
    c.setUint16(10, e.method, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, e.crc, true); c.setUint32(20, e.data.length, true); c.setUint32(24, e.size, true);
    c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    locals.push(head, name, extra, e.data); centrals.push(cen, name);
    offset += 30 + name.length + extra.length + e.data.length;
  }
  const body = concat(locals), cd = concat(centrals);
  const eocd = new Uint8Array(22); const z = new DataView(eocd.buffer);
  z.setUint32(0, 0x06054b50, true); z.setUint16(8, entries.length, true); z.setUint16(10, entries.length, true);
  z.setUint32(12, cd.length, true); z.setUint32(16, body.length, true);
  return { body, cd, eocd };
}

/* ── 서명 키 (브라우저마다 한 번 만들어 저장 → 다음 테마도 덮어 설치 가능) ── */
const der = (tag, ...parts) => {
  const body = concat(parts);
  const n = body.length;
  const len = n < 0x80 ? [n] : n < 0x100 ? [0x81, n] : n < 0x10000 ? [0x82, n >> 8, n & 0xff] : [0x83, n >> 16, (n >> 8) & 0xff, n & 0xff];
  return concat([new Uint8Array([tag, ...len]), body]);
};
const oid = (bytes) => der(0x06, new Uint8Array(bytes));
const SHA256_RSA = der(0x30, oid([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b]), new Uint8Array([0x05, 0x00]));
const name = (cn) => der(0x30, der(0x31, der(0x30, oid([0x55, 0x04, 0x03]), der(0x0c, enc.encode(cn)))));
const time = (date) => {
  const iso = date.toISOString().replace(/[-:T]/g, '').slice(0, 14) + 'Z';
  return date.getUTCFullYear() < 2050 ? der(0x17, enc.encode(iso.slice(2))) : der(0x18, enc.encode(iso));
};
const RSA = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };

async function selfSignedCert(keys) {
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', keys.publicKey));
  const serial = crypto.getRandomValues(new Uint8Array(16)); serial[0] &= 0x7f; serial[0] |= 0x01;
  const now = new Date();
  const tbs = der(0x30,
    der(0xa0, der(0x02, new Uint8Array([2]))), der(0x02, serial), SHA256_RSA, name('Kakao Theme Maker'),
    der(0x30, time(now), time(new Date(Date.UTC(now.getUTCFullYear() + 50, 0, 1)))),
    name('Kakao Theme Maker'), spki);
  const sig = new Uint8Array(await crypto.subtle.sign(RSA, keys.privateKey, tbs));
  return der(0x30, tbs, SHA256_RSA, der(0x03, new Uint8Array([0]), sig));
}

const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
const unb64 = (text) => Uint8Array.from(atob(text), (ch) => ch.charCodeAt(0));

/** @param {{getItem:Function,setItem:Function}|null} storage */
export async function getSigningKey(storage = null) {
  try {
    const saved = JSON.parse(storage?.getItem('themer-apk-key') || 'null');
    if (saved) {
      const privateKey = await crypto.subtle.importKey('pkcs8', unb64(saved.key), RSA, false, ['sign']);
      return { privateKey, cert: unb64(saved.cert), spki: unb64(saved.spki) };
    }
  } catch { /* 저장된 키가 깨졌으면 새로 만든다 */ }
  const keys = await crypto.subtle.generateKey(
    { ...RSA, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) }, true, ['sign', 'verify']);
  const cert = await selfSignedCert(keys);
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', keys.publicKey));
  try {
    const key = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keys.privateKey));
    storage?.setItem('themer-apk-key', JSON.stringify({ key: b64(key), cert: b64(cert), spki: b64(spki) }));
  } catch { /* 저장 못 해도 이번 APK 는 만들 수 있다 */ }
  return { privateKey: keys.privateKey, cert, spki };
}

/* ── APK Signature Scheme v2 ── */
async function contentDigest(sections) {
  const chunks = [];
  for (const s of sections) {
    for (let i = 0; i < s.length; i += 1 << 20) {
      const part = s.subarray(i, Math.min(s.length, i + (1 << 20)));
      chunks.push(await sha256(concat([new Uint8Array([0xa5]), u32le(part.length), part])));
    }
  }
  return sha256(concat([new Uint8Array([0x5a]), u32le(chunks.length), ...chunks]));
}

async function signV2({ body, cd, eocd }, key) {
  const digest = await contentDigest([body, cd, eocd]);
  const ALGO = 0x0103; // RSASSA-PKCS1-v1_5 + SHA-256
  const signedData = concat([
    lp(lp(concat([u32le(ALGO), lp(digest)]))),
    lp(lp(key.cert)),
    lp(new Uint8Array(0)),
  ]);
  const signature = new Uint8Array(await crypto.subtle.sign(RSA, key.privateKey, signedData));
  const signer = concat([lp(signedData), lp(lp(concat([u32le(ALGO), lp(signature)]))), lp(key.spki)]);
  const value = lp(lp(signer));
  const pair = concat([u64le(4 + value.length), u32le(0x7109871a), value]);
  const size = pair.length + 8 + 16;
  const block = concat([u64le(size), pair, u64le(size), enc.encode('APK Sig Block 42')]);
  const end = eocd.slice();
  new DataView(end.buffer).setUint32(16, body.length + block.length, true);
  return concat([body, block, cd, end]);
}

/**
 * @param {Uint8Array} template  public/theme-template.apk
 * @param {Record<string,string>} paths  리소스 이름 → APK 안 경로 (public/theme-template.json)
 * @param {Map<string,{png:Uint8Array, patch?:object}>} images  리소스 이름 → 새 이미지
 */
export async function buildApk(template, paths, images, key) {
  const replace = new Map();
  for (const [res, img] of images) {
    if (!paths[res]) throw new Error(`APK 템플릿에 없는 이미지예요: ${res}`);
    replace.set(paths[res], img.patch ? compileNinePatch(img.png, img.patch) : img.png);
  }
  const entries = readZip(template)
    .filter((e) => !/^META-INF\/[^/]+\.(MF|SF|RSA|DSA|EC)$/i.test(e.name))
    .map((e) => {
      const png = replace.get(e.name);
      return png ? { name: e.name, method: 0, crc: crc32(png), size: png.length, data: png } : e;
    });
  return signV2(writeZip(entries), key);
}
