/**
 * 기존 캐릭터/말풍선/잠금 비밀번호 생성 흐름을 Android 리소스로 출력.
 * 선택 배경 사진은 채팅방에만 적용하고 나머지는 원래 구성 유지.
 */

import {
  SLOTS, FLAT_SLOTS, BG_SLOTS, KEYPAD,
  BUBBLE_SLOTS, BUBBLE_ART, CELL01R, CELL02R, CELL01S, CELL02S,
} from '../constants/themeSpec.js';
import {
  buildMaster, renderToSlot, loadImage, makeCanvas,
} from './imageProcess.js';
import { loadDeco, renderBackground } from './deco.js';
import { renderBubbleCell } from './bubbleCell.js';
import { addAndroidAssets, packageAndroidProject, requestAndroidApk } from './androidTheme.js';

/**
 * @param {File} fileA  왼쪽 / 상대방
 * @param {File} fileB  오른쪽 / 나
 */
export async function buildTheme(fileA, fileB, rawStep = () => {}, options = {}) {
  // 진행률이 뒤로 가지 않게 (누끼 라이브러리가 단계마다 0부터 다시 세서
  // 5% → 25% → 5% 처럼 튀던 문제)
  let seen = 0;
  const onStep = (msg, p) => { seen = Math.max(seen, p); rawStep(msg, seen); };
  const androidAssets = new Map();
  const backgrounds = {};
  if (options.background) backgrounds.chatroomBgImage = await loadImage(options.background);
  const storeImage = async (name, canvas, bubble = null) => {
    await addAndroidAssets(androidAssets, name, canvas, bubble);
  };

  /* ── 1. 누끼 ── */
  onStep('왼쪽 캐릭터 배경 제거 중…', 0.05);
  const masterA = await buildMaster(fileA, (_, p) => onStep('왼쪽 캐릭터 배경 제거 중…', 0.05 + p * 0.2));
  onStep('오른쪽 캐릭터 배경 제거 중…', 0.28);
  const masterB = await buildMaster(fileB, (_, p) => onStep('오른쪽 캐릭터 배경 제거 중…', 0.28 + p * 0.2));
  const masters = { A: masterA, B: masterB };

  const pickSrc = async (from) =>
    from.startsWith('deco:') ? loadDeco(from.slice(5)) : masters[from];

  /* ── 2. 캐릭터 / 데코 슬롯 (전부 @3x) ── */
  onStep('테마 이미지 생성 중…', 0.5);
  for (const s of SLOTS) {
    const canvas = renderToSlot(await pickSrc(s.from), {
      w: s.px, h: s.px, fitRatio: s.fit ?? 0.94, round: s.round, bg: s.bg,
    });
    const name = `${s.name}@3x.png`;
    await storeImage(name, canvas);
  }

  /* ── 3. 배수 접미사 없는 파일 ── */
  for (const s of FLAT_SLOTS) {
    const canvas = renderToSlot(await pickSrc(s.from), {
      w: s.px, h: s.px, fitRatio: s.fit ?? 0.94, round: s.round,
    });
    await storeImage(`${s.name}.png`, canvas);
  }

  /* ── 4. 배경 ── */
  onStep('배경 생성 중…', 0.7);
  for (const bg of BG_SLOTS) {
    const canvas = await renderBackground({
      w: bg.w, h: bg.h, density: bg.stars ? 1 : 0,   // 별은 채팅방에만
      image: backgrounds[bg.name],
    });
    const name = `${bg.name}@3x.png`;
    await storeImage(name, canvas);
  }

  /* ── 5. 키패드 눌림 효과 ── */
  {
    const c = makeCanvas(KEYPAD.px, KEYPAD.px);
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.arc(KEYPAD.px / 2, KEYPAD.px / 2, KEYPAD.px / 2, 0, Math.PI * 2);
    ctx.fill();
    await storeImage(`${KEYPAD.name}@3x.png`, c);
  }

  /* ── 6. 말풍선 (캐릭터 + 말풍선 합성) ── */
  onStep('말풍선 만드는 중…', 0.85);
  {
    const arts = {};
    for (const [k, v] of Object.entries(BUBBLE_ART)) {
      arts[k] = await loadImage(import.meta.env.BASE_URL + v);
    }
    const CELLS = { CELL01R, CELL02R, CELL01S, CELL02S };
    for (const b of BUBBLE_SLOTS) {
      const L = CELLS[b.cell];
      const c = renderBubbleCell({
        bubbleArt: arts[b.art],
        charImg: b.from ? masters[b.from] : null,
        side: b.side,
        L,
      });
      if (b.dim) {
        const ctx = c.getContext('2d');
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(0, 0, L.w, L.h);
      }
      const name = `${b.name}@3x.png`;
      await storeImage(name, c, { side: b.side, L });
    }
  }

  onStep('갤럭시 테마 프로젝트 만드는 중…', 0.92);
  const project = await packageAndroidProject(androidAssets);
  if (options.buildUrl) {
    onStep('갤럭시 APK 만드는 중… 잠시 기다려 주세요.', 0.96);
    const blob = await requestAndroidApk(project, options.buildUrl);
    onStep('완료!', 1);
    return { blob, filename: 'mytheme.apk', manifest: [...androidAssets.keys()] };
  }
  onStep('완료!', 1);
  return { blob: project, filename: 'mytheme-android.zip', manifest: [...androidAssets.keys()] };

}

const OCTET = 'application/octet-stream';

export function downloadBlob(blob, filename = 'mytheme-android.zip') {
  const safe = blob.type === OCTET ? blob : new Blob([blob], { type: OCTET });
  const url = URL.createObjectURL(safe);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 1000);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
