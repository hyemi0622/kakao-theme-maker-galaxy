/**
 * charPreview.js
 * ─────────────────────────────────────────────────────────────
 * 사진을 올리자마자 말풍선 미리보기를 보여주기 위한 모듈.
 * 배경 제거 결과는 사진(File)별로 저장해서 생성하기에서도 그대로 재사용한다.
 */

import { BUBBLE_ART, scaledCells } from '../constants/themeSpec.js';
import { buildMaster, loadImage, toPngBlob } from './imageProcess.js';
import { renderBubbleCell } from './bubbleCell.js';

const masters = new WeakMap();
let queue = Promise.resolve();

/** 배경 제거 (사진별 1번만, 폰 메모리 보호를 위해 한 장씩 차례로) */
export function cachedMaster(file, onProgress) {
  if (!masters.has(file)) {
    const job = queue.then(() => buildMaster(file, onProgress));
    queue = job.catch(() => {});
    job.catch(() => masters.delete(file));
    masters.set(file, job);
  }
  return masters.get(file);
}

const arts = {};
const art = (key) => (arts[key] ??= loadImage(import.meta.env.BASE_URL + BUBBLE_ART[key]));

/**
 * 첫 말풍선(캐릭터 포함) + 이어지는 말풍선 미리보기 이미지 URL 2개 (@3x)
 * @param {File|null} file  캐릭터 사진 (없으면 말풍선만)
 * @param {'left'|'right'} side  left = 받은(왼쪽), right = 보낸(오른쪽)
 * @param {{scale:number, gap:number}} opts
 */
export async function previewBubbles(file, side, opts) {
  const cells = side === 'left' ? scaledCells(opts, {}) : scaledCells({}, opts);
  const [first, next] = side === 'left' ? [cells.CELL01R, cells.CELL02R] : [cells.CELL01S, cells.CELL02S];
  const charImg = file ? await cachedMaster(file) : null;
  const canvases = [
    renderBubbleCell({ bubbleArt: await art(side === 'left' ? 'tailLeft' : 'tailRight'), charImg, side, L: first }),
    renderBubbleCell({ bubbleArt: await art(side === 'left' ? 'plainA' : 'plainB'), charImg: null, side, L: next }),
  ];
  return Promise.all(canvases.map(async (c) => URL.createObjectURL(await toPngBlob(c))));
}
