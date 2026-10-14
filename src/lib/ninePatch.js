// Raw Android nine-patch: the outer 1px border holds stretch/content markers.
// Keep the original pixels intact; only the middle of the bubble stretches.
export function bubblePatchBounds({ L, side }) {
  const { w, h, x, y } = L.bubble;
  const bx = side === 'left' ? x : L.w - w - x;
  // 갤럭시 카톡은 글자 줄 높이가 커서 위아래 여백을 좌우보다 작게 둔다 (아이폰과 비슷한 높이)
  const padX = 24, padY = 18;
  const content = { left: bx + padX, top: y + padY,
    right: bx + w - padX, bottom: y + h - padY };
  const stretch = { x: bx + Math.floor(w / 2), y: y + Math.floor(h / 2) };
  if (L.char && stretch.y <= L.char.h) {
    throw new Error('말풍선 늘어나는 영역이 캐릭터와 겹칩니다.');
  }
  return { stretch, content };
}

export function drawNinePatch(canvas, source, bounds) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 1, 1);
  ctx.fillStyle = '#000000';
  ctx.fillRect(bounds.stretch.x + 1, 0, 1, 1);
  ctx.fillRect(0, bounds.stretch.y + 1, 1, 1);
  const p = bounds.content;
  ctx.fillRect(p.left + 1, canvas.height - 1, p.right - p.left, 1);
  ctx.fillRect(canvas.width - 1, p.top + 1, 1, p.bottom - p.top);
  return canvas;
}
