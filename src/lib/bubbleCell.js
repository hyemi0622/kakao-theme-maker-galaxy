/**
 * bubbleCell.js
 * ─────────────────────────────────────────────────────────────
 * 캐릭터 + 말풍선을 한 장의 PNG 로 합성한다.
 *
 * 카카오톡은 메시지 배경을 이미지 1장으로만 받는다.
 * 그래서 "말풍선 옆에 캐릭터가 앉아있는" 연출은
 * 캐릭터와 말풍선을 하나의 이미지로 합쳐서 넣어야 한다.
 *
 * 늘어나는 규칙
 *   -ios-background-image: '파일.png' <capTop> <capLeft>;
 *   · 위에서 capTop 만큼, 왼쪽에서 capLeft 만큼은 고정
 *   · 그 지점의 1px 만 반복되며 늘어남
 *   → capTop / capLeft 를 '캐릭터 바깥, 말풍선 몸통 안쪽'에 두면
 *     캐릭터는 절대 안 늘어나고 말풍선만 커진다.
 *
 *  받은 메시지(왼쪽)                    보낸 메시지(오른쪽)
 *  ┌──────────────────┐               ┌──────────────────┐
 *  │ [캐릭터]         │               │         [캐릭터] │
 *  │    ┌───────────┐ │               │ ┌───────────┐    │
 *  │    │ 말풍선  ↔ │ │               │ │ ↔ 말풍선  │    │
 *  │    └───────────┘ │               │ └───────────┘    │
 *  └──────────────────┘               └──────────────────┘
 */

import { makeCanvas } from './imageProcess.js';

/**
 * 외곽선 두껍게
 * 원본을 작게 줄이면 선이 얇아진다.
 * 상하좌우로 r px 씩 밀어서 먼저 깔고 원본을 덮으면 선만 굵어진다.
 */
function thicken(src, r = 2) {
  if (r <= 0) return src;
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      if (dx * dx + dy * dy > r * r) continue;
      ctx.drawImage(src, dx, dy);
    }
  }
  ctx.drawImage(src, 0, 0);
  return c;
}

/** 말풍선 원본을 목표 크기로 (세로 비율유지 → 가로 9-slice) */
function fitBubbleArt(img, tw, th) {
  const f = th / img.height;
  const w2 = Math.max(1, Math.round(img.width * f));

  const mid = makeCanvas(w2, th);
  const mctx = mid.getContext('2d');
  mctx.imageSmoothingQuality = 'high';
  mctx.drawImage(img, 0, 0, w2, th);

  const c = makeCanvas(tw, th);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';

  const cap = Math.min(Math.round(th * 0.45), Math.floor(tw / 2) - 1, Math.floor(w2 / 2) - 1);
  if (cap <= 0 || w2 === tw) {
    ctx.drawImage(mid, 0, 0, tw, th);
    return c;
  }
  ctx.drawImage(mid, 0, 0, cap, th, 0, 0, cap, th);
  ctx.drawImage(mid, w2 - cap, 0, cap, th, tw - cap, 0, cap, th);
  ctx.drawImage(mid, cap, 0, w2 - cap * 2, th, cap, 0, tw - cap * 2, th);
  return c;
}

/**
 * 캐릭터 + 말풍선 합성
 * @param {object} o
 *   bubbleArt  말풍선 원본 Image
 *   charImg    캐릭터 마스터 캔버스 (null 이면 말풍선만)
 *   side       'left'(받은) | 'right'(보낸)
 *   L          레이아웃 (@3x 픽셀)
 */
export function renderBubbleCell({ bubbleArt, charImg, side, L }) {
  const c = makeCanvas(L.w, L.h);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';

  // 1) 말풍선 몸통 (선이 얇아지지 않게 외곽선 두껍게 보정)
  const bw = L.bubble.w, bh = L.bubble.h;
  const bx = side === 'left' ? L.bubble.x : L.w - bw - L.bubble.x;
  const by = L.bubble.y;
  const art = thicken(fitBubbleArt(bubbleArt, bw, bh), 0);
  ctx.drawImage(art, bx, by);

  // 2) 캐릭터 (말풍선 위에 겹쳐서)
  if (charImg && L.char) {
    const { w: bw2, h: bh2 } = L.char;        // 캐릭터 박스 (가로/세로 따로)
    const sw = charImg.width, sh = charImg.height;
    const s = Math.min(bw2 / sw, bh2 / sh);   // 비율 유지
    const dw = sw * s, dh = sh * s;
    const pad = L.charPad ?? 0;
    const dx = side === 'left' ? pad : L.w - dw - pad;
    const dy = Math.max(0, bh2 - dh);         // 아래 정렬 (말풍선과 간격 유지)
    ctx.drawImage(charImg, dx, dy, dw, dh);
  }

  return c;
}
