/**
 * deco.js
 * ─────────────────────────────────────────────────────────────
 * ㄹㅇㄴㄹㅇㄴ님이 직접 만든 별 / 동글뱅이 / 별 배경 PNG 를 그대로 사용한다.
 * (흰 배경은 미리 제거해서 public/deco, public/bg-stars.png 에 넣어둠)
 */

import { makeCanvas, loadImage } from './imageProcess.js';

const BASE = import.meta.env.BASE_URL;

/** 데코 종류 → 실제 파일 */
export const DECO_FILES = {
  'star-blue': 'deco/star-blue.png',
  'burst-pink': 'deco/burst-pink.png',
  'star-cream': 'deco/star-cream.png',
  'burst-black': 'deco/burst-black.png',
  'swirl-green': 'deco/swirl-green.png',
  'leek': 'deco/leek.png',
};

export const decoUrl = (kind) => BASE + DECO_FILES[kind];
export const BG_STARS_URL = BASE + 'bg-stars.png';

const cache = new Map();

/** 데코 PNG 를 Image 로 (캐시) */
export async function loadDeco(kind) {
  if (!cache.has(kind)) cache.set(kind, loadImage(decoUrl(kind)));
  return cache.get(kind);
}

/** 별 배경 PNG 를 Image 로 (캐시) */
export async function loadStarBg() {
  if (!cache.has('__bg')) cache.set('__bg', loadImage(BG_STARS_URL));
  return cache.get('__bg');
}

/**
 * 테마용 배경 이미지 1장 생성.
 * 직접 만든 별 배경 PNG 를 기기 비율에 맞게 cover 로 채워 넣는다.
 * @param {number} density 0 이면 별 없이 흰 배경만 (탭바 배경 등)
 */
export async function renderBackground({ w, h, density = 1, bgColor = '#FFFFFF', image = null }) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);
  if (!image && density <= 0) return c;

  const img = image || await loadStarBg();
  // cover: 비율 유지하며 캔버스를 꽉 채움 (별이 절대 찌그러지지 않음)
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.globalAlpha = image ? 1 : Math.min(1, density);
  ctx.drawImage(img, (w - dw) / 2, image ? (h - dh) / 2 : 0, dw, dh);
  ctx.globalAlpha = 1;
  return c;
}
