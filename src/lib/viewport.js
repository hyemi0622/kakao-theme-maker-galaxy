/**
 * viewport.js
 * ─────────────────────────────────────────────────────────────
 * 카카오톡 인앱 브라우저에서 화면이 확대되어 보이는 문제 해결.
 *
 * 핵심: 레이아웃은 402px 고정으로 그리고, .stage 를 zoom: k 로 통째로 줄인다.
 *       k = 실제 화면폭 / 402
 *       zoom 은 transform 과 달리 '레이아웃 폭'까지 줄여주기 때문에
 *       웹뷰가 글자를 자동으로 키우는 조건 자체가 사라진다.
 *
 * 왜 font-size 방식(rem)을 버렸나
 *   카카오톡 인앱 브라우저(WKWebView)는 Safari 와 달리 "텍스트 자동 확대"를
 *   제멋대로 적용한다. 그래서 font-size 를 기준으로 스케일하면
 *   글자만 부풀어서 Safari 와 다르게 보인다.
 *   transform 은 다 그려진 결과를 통째로 곱하는 거라 웹뷰 종류와 무관하게
 *   100% 동일하게 나온다.
 */

const DESIGN_W = 402;
const MAX_K = 1.25;   // 태블릿·데스크톱에서 과하게 커지지 않도록
let stageEl = null;
let ro = null;

function measure() {
  return (
    window.visualViewport?.width ||
    document.documentElement.clientWidth ||
    window.innerWidth ||
    DESIGN_W
  );
}

function apply() {
  const w = measure();
  const k = Math.min(MAX_K, w / DESIGN_W);
  const root = document.documentElement;
  root.style.setProperty('--k', k);

  // 무대가 화면 높이를 최소한 채우도록
  const vh = window.visualViewport?.height || window.innerHeight;
  root.style.setProperty('--stage-h', Math.ceil(vh / k) + 'px');

  // safe-area 는 scale 로 같이 줄어들므로 미리 나눠서 보정
  const cs = getComputedStyle(root);
  const st = parseFloat(cs.getPropertyValue('--env-top')) || 0;
  const sb = parseFloat(cs.getPropertyValue('--env-bottom')) || 0;
  root.style.setProperty('--safe-top', st / k + 'px');
  root.style.setProperty('--safe-bottom', sb / k + 'px');

  // zoom 은 레이아웃까지 줄어들어서 부모 높이가 자동으로 맞는다.
  // (transform 폴백일 때만 높이를 직접 잡아준다)
  if (!CSS.supports?.('zoom', '1')) syncHeight(k);
}

/** transform 폴백 전용: scale 된 실제 높이만큼 .viewport 높이를 잡아준다 */
function syncHeight(k) {
  if (!stageEl) stageEl = document.querySelector('.stage');
  if (!stageEl) return;
  const vp = stageEl.parentElement;
  if (!vp) return;
  vp.style.height = Math.ceil(stageEl.offsetHeight * k) + 'px';
}

function resetZoom() {
  const vv = window.visualViewport;
  if (vv && vv.scale > 1.01) {
    const meta = document.querySelector('meta[name=viewport]');
    if (!meta) return;
    const orig = meta.content;
    meta.content = orig + ', maximum-scale=1.0';
    setTimeout(() => { meta.content = orig; }, 60);
  }
}

export function initViewport() {
  apply();
  [50, 150, 400, 800, 1500].forEach((t) => setTimeout(apply, t));

  window.addEventListener('resize', apply, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(apply, 250));
  window.addEventListener('pageshow', apply);
  window.addEventListener('load', apply);
  document.fonts?.ready.then(apply);
  window.visualViewport?.addEventListener('resize', apply, { passive: true });
  window.visualViewport?.addEventListener('scroll', resetZoom, { passive: true });

  // 내용 높이가 바뀌면(업로드/생성 등) 무대 높이 재계산
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => apply());
    const start = () => {
      stageEl = document.querySelector('.stage');
      if (stageEl) ro.observe(stageEl);
      else setTimeout(start, 100);
    };
    start();
  }

  ['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) =>
    document.addEventListener(ev, (e) => e.preventDefault())
  );

  let lastTouch = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouch < 300) e.preventDefault();
    lastTouch = now;
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
}

export function isInAppBrowser() {
  const ua = navigator.userAgent || '';
  return /KAKAOTALK|Instagram|FBAN|FBAV|Line\/|NAVER\(inapp/i.test(ua);
}

export function openInExternalBrowser() {
  const url = location.href;
  const ua = navigator.userAgent || '';
  if (/KAKAOTALK/i.test(ua)) {
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    location.href = 'x-safari-' + url;
  } else {
    location.href = 'intent:' + url + '#Intent;scheme=https;package=com.android.chrome;end';
  }
}
