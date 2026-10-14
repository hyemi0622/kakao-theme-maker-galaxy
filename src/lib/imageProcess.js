
/**
 * imageProcess.js
 * 캐릭터 내부 색상 보존형 배경 제거
 *
 * - 투명 PNG: 기존 알파 채널 보존
 * - 단색 배경 일러스트: 외곽 연결 배경만 제거
 * - 일반 사진: @imgly AI 배경 제거
 * - 투명 여백 트림 및 슬롯 정규화
 */

/* ═══════════ 0. 기본 유틸 ═══════════ */

export function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let url = null;

    if (typeof src === 'string') {
      img.crossOrigin = 'anonymous';
      img.src = src;
    } else {
      url = URL.createObjectURL(src);
      img.src = url;
    }

    img.onload = () => {
      if (url) URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = (e) => {
      if (url) URL.revokeObjectURL(url);
      reject(e);
    };
  });
}

export async function toPngBlob(canvas) {
  if (canvas.convertToBlob) {
    return canvas.convertToBlob({ type: 'image/png' });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('PNG 변환 실패')),
      'image/png'
    );
  });
}

/* ═══════════ 1. AI 배경 제거 ═══════════ */

export async function removeBg(file, onProgress) {
  try {
    const { removeBackground } = await import(
      '@imgly/background-removal'
    );

    return await removeBackground(file, {
      output: {
        format: 'image/png',
        quality: 1,
      },
      progress: (key, current, total) => {
        onProgress?.(
          key,
          total > 0 ? current / total : 0
        );
      },
    });
  } catch (error) {
    console.warn('[removeBg] AI 배경 제거 실패', error);

    // 실패했는데 성공한 것처럼 원본을 반환하지 않음
    throw error;
  }
}

/* ═══════════ 2. 이미지 투명도 확인 ═══════════ */

export function hasTransparency(canvas) {
  const ctx = canvas.getContext('2d', {
    willReadFrequently: true,
  });

  const data = ctx.getImageData(
    0, 0, canvas.width, canvas.height
  ).data;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true;
  }

  return false;
}

/* ═══════════ 3. 배경 색상 판별 ═══════════ */

function colorDistance(r, g, b, bg) {
  return Math.sqrt(
    (r - bg[0]) ** 2 +
    (g - bg[1]) ** 2 +
    (b - bg[2]) ** 2
  );
}

/**
 * 가장자리의 대표 색상을 구한다.
 * 네 모서리가 비슷한 밝은 색일 때만 단색 배경으로 판단한다.
 */
function detectFlatBackground(canvas) {
  const w = canvas.width;
  const h = canvas.height;

  const ctx = canvas.getContext('2d', {
    willReadFrequently: true,
  });

  const d = ctx.getImageData(0, 0, w, h).data;

  const margin = Math.max(
    1,
    Math.floor(Math.min(w, h) * 0.015)
  );

  const points = [
    [margin, margin],
    [w - 1 - margin, margin],
    [margin, h - 1 - margin],
    [w - 1 - margin, h - 1 - margin],
  ];

  const samples = points.map(([x, y]) => {
    const i = (y * w + x) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  });

  const bg = [0, 1, 2].map((channel) =>
    Math.round(
      samples.reduce((sum, c) => sum + c[channel], 0) /
      samples.length
    )
  );

  const maxDifference = Math.max(
    ...samples.map((c) =>
      colorDistance(c[0], c[1], c[2], bg)
    )
  );

  const brightness = Math.min(...bg);

  // 밝고 거의 동일한 모서리 색상만 단색 배경으로 인정
  if (brightness < 210 || maxDifference > 22) {
    return null;
  }

  return bg;
}

/* ═══════════ 4. 외곽 연결 배경 제거 ═══════════ */

/**
 * 이미지 전체의 흰색을 지우지 않는다.
 * 이미지 가장자리에서 연결된 배경 픽셀만 제거한다.
 *
 * 따라서 외곽선으로 닫힌 캐릭터 내부의 흰색은 보존된다.
 */
export function removeConnectedBackground(
  canvas,
  {
    threshold = 30,
    feather = 8,
    backgroundColor = null,
  } = {}
) {
  const w = canvas.width;
  const h = canvas.height;

  const ctx = canvas.getContext('2d', {
    willReadFrequently: true,
  });

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const bg = backgroundColor || detectFlatBackground(canvas);

  if (!bg) return canvas;

  const count = w * h;
  const visited = new Uint8Array(count);
  const queue = new Int32Array(count);

  let head = 0;
  let tail = 0;

  function isBackground(p) {
    const i = p * 4;

    if (d[i + 3] === 0) return false;

    return colorDistance(
      d[i],
      d[i + 1],
      d[i + 2],
      bg
    ) <= threshold;
  }

  function enqueue(p) {
    if (visited[p] || !isBackground(p)) return;

    visited[p] = 1;
    queue[tail++] = p;
  }

  // 이미지 외곽에서만 탐색 시작
  for (let x = 0; x < w; x++) {
    enqueue(x);
    enqueue((h - 1) * w + x);
  }

  for (let y = 0; y < h; y++) {
    enqueue(y * w);
    enqueue(y * w + w - 1);
  }

  // 4방향 Flood Fill
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    const y = Math.floor(p / w);

    if (x > 0) enqueue(p - 1);
    if (x < w - 1) enqueue(p + 1);
    if (y > 0) enqueue(p - w);
    if (y < h - 1) enqueue(p + w);
  }

  // 연결된 배경만 투명화
  for (let p = 0; p < count; p++) {
    if (visited[p]) {
      d[p * 4 + 3] = 0;
    }
  }

  // 배경에 바로 인접한 유사색만 제한적으로 보정
  // 내부 색상을 보호하기 위해 전체 이미지에는 적용하지 않음
  if (feather > 0) {
    const originalAlpha = new Uint8Array(count);

    for (let p = 0; p < count; p++) {
      originalAlpha[p] = d[p * 4 + 3];
    }

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;

        if (visited[p] || originalAlpha[p] === 0) {
          continue;
        }

        const touchesBackground =
          visited[p - 1] ||
          visited[p + 1] ||
          visited[p - w] ||
          visited[p + w];

        if (!touchesBackground) continue;

        const i = p * 4;

        const dist = colorDistance(
          d[i],
          d[i + 1],
          d[i + 2],
          bg
        );

        if (dist < threshold + feather) {
          const factor = Math.max(
            0,
            Math.min(1, (dist - threshold) / feather)
          );

          d[i + 3] = Math.round(
            originalAlpha[p] * factor
          );
        }
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

/* ═══════════ 5. 기존 함수 호환 ═══════════ */

/**
 * 기존 코드에서 killWhiteFringe를 호출하더라도
 * 전체 흰색 제거 대신 외곽 연결 배경 제거를 사용한다.
 */
export function killWhiteFringe(
  canvas,
  { threshold = 238, feather = 18 } = {}
) {
  // 기존 threshold를 색상 거리 허용치로 변환
  const tolerance = Math.max(
    8,
    Math.min(40, 255 - threshold + 12)
  );

  return removeConnectedBackground(canvas, {
    threshold: tolerance,
    feather: Math.min(feather, 8),
  });
}

/* ═══════════ 6. 투명 여백 트림 ═══════════ */

export function trimTransparent(canvas, alphaMin = 8) {
  const ctx = canvas.getContext('2d', {
    willReadFrequently: true,
  });

  const w = canvas.width;
  const h = canvas.height;

  const d = ctx.getImageData(0, 0, w, h).data;

  let top = h;
  let left = w;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = d[(y * w + x) * 4 + 3];

      if (alpha > alphaMin) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < 0) return canvas;

  const tw = right - left + 1;
  const th = bottom - top + 1;

  const out = makeCanvas(tw, th);

  out.getContext('2d').drawImage(
    canvas,
    left, top, tw, th,
    0, 0, tw, th
  );

  return out;
}

/* ═══════════ 7. 슬롯 렌더링 ═══════════ */

export function renderToSlot(src, opt) {
  const {
    w,
    h,
    fitRatio = 1,
    round = false,
    bg = null,
    boost = false,
    align = 'center',
  } = opt;

  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (bg) {
    ctx.fillStyle = bg;

    if (round) {
      ctx.beginPath();
      ctx.arc(
        w / 2,
        h / 2,
        Math.min(w, h) / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, w, h);
    }
  }

  if (round) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      w / 2,
      h / 2,
      Math.min(w, h) / 2,
      0,
      Math.PI * 2
    );
    ctx.clip();
  }

  const sw = src.width;
  const sh = src.height;

  const ratio = fitRatio * (boost ? 1.08 : 1);

  const scale = Math.min(
    (w * ratio) / sw,
    (h * ratio) / sh
  );

  const dw = sw * scale;
  const dh = sh * scale;

  const dx = (w - dw) / 2;

  const dy =
    align === 'bottom'
      ? h - dh
      : align === 'top'
        ? 0
        : (h - dh) / 2;

  ctx.drawImage(src, dx, dy, dw, dh);

  if (round) ctx.restore();

  return canvas;
}

/* ═══════════ 8. 마스터 이미지 생성 ═══════════ */

export async function buildMaster(file, onProgress) {
  const src = await loadImage(file);

  // iOS Safari 메모리 보호
  const cap = 1024;

  const scale = Math.min(
    1,
    cap / Math.max(src.width, src.height)
  );

  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));

  const small = makeCanvas(w, h);

  const ctx = small.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);

  // 1. 이미 투명한 PNG면 그대로 보존
  // JPEG 등은 이 분기에서 제외
  const isPng = file.type === 'image/png';

  if (isPng && hasTransparency(small)) {
    onProgress?.('complete', 1);
    return trimTransparent(small);
  }

  // 2. 단색 배경 일러스트인지 확인
  const bg = detectFlatBackground(small);

  if (bg) {
    removeConnectedBackground(small, {
      backgroundColor: bg,
      threshold: 30,
      feather: 8,
    });

    onProgress?.('complete', 1);
    return trimTransparent(small);
  }

  // 3. 일반 사진은 AI 누끼
  const blob = await toPngBlob(small);
  const cut = await removeBg(blob, onProgress);
  const img = await loadImage(cut);

  const base = makeCanvas(img.width, img.height);
  base.getContext('2d').drawImage(img, 0, 0);

  // 중요: AI 누끼 이후 전체 흰색 제거 금지
  // 원본 색상 및 AI 알파 채널 그대로 유지
  return trimTransparent(base);
}

/* ═══════════ 9. 슬롯 PNG 내보내기 ═══════════ */

export async function exportSlot(master, slot, scale = 2) {
  const base = slot.fixedPx ?? slot.size;

  const px = slot.fixedPx
    ? slot.fixedPx
    : Math.round(base * scale);

  const canvas = renderToSlot(master, {
    w: px,
    h: px,
    fitRatio: slot.fitRatio ?? 1,
    round: slot.round,
    boost: slot.boost,
  });

  return toPngBlob(canvas);
}
