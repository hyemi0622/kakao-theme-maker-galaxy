/**
 * Deco.jsx
 * 직접 만든 별 / 동글뱅이 PNG 와 별 배경 PNG 를 그대로 사용.
 * (흰 배경은 이미 제거되어 public/ 에 들어있음)
 */
import { decoUrl, BG_STARS_URL } from '../lib/deco.js';

export const DECO_ORDER = [
  'star-blue',
  'burst-pink',
  'swirl-green',
  'star-cream',
  'burst-black',
];

export function DecoIcon({ kind, size }) {
  return (
    <img
      className="deco-ico"
      src={decoUrl(kind)}
      alt=""
      style={size ? { width: size, height: size } : undefined}
      draggable={false}
    />
  );
}

/** 시안 하단의 별 5개 바 */
export function DecoBar() {
  return (
    <div className="decobar" aria-hidden>
      {DECO_ORDER.map((k) => <DecoIcon key={k} kind={k} />)}
    </div>
  );
}

/** 화면 배경 — 직접 만든 별 배경 PNG */
export function StarBg() {
  return (
    <div
      className="starbg"
      style={{ backgroundImage: `url(${BG_STARS_URL})` }}
      aria-hidden
    />
  );
}
