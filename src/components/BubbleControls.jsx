import { useEffect, useState } from 'react';
import { CHAR_SCALE, CHAR_GAP_RANGE } from '../constants/themeSpec.js';
import { previewBubbles } from '../lib/charPreview.js';

/**
 * 왼쪽(받은) / 오른쪽(보낸) 말풍선 하나의 캐릭터 크기·간격 조절 + 실시간 미리보기.
 * 미리보기 이미지는 @3x 라서 1/3 크기로 그리면 실제 폰 화면 크기와 같다.
 */
export default function BubbleControls({ side, label, file, value, onChange, device }) {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let made = [];
    const t = setTimeout(async () => {
      setLoading(Boolean(file)); setFailed(false);
      try {
        made = await previewBubbles(file, side, value);
        if (alive) setUrls(made); else made.forEach(URL.revokeObjectURL);
      } catch (e) {
        console.error(e);
        if (alive) setFailed(true);
      } finally { if (alive) setLoading(false); }
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [file, side, value.scale, value.gap]);
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls]);

  return (
    <div className={`bubble-controls ${side}`}>
      <span className="slot-chip">{label}</span>
      <div className="bubble-preview">
        <p>미리보기 (실제 {device} 화면 크기){loading ? ' · 캐릭터 배경 지우는 중…' : ''}</p>
        {failed && <p className="error">미리보기를 만들지 못했어요. 사진을 바꿔 보세요.</p>}
        {urls.map((src, i) => (
          <img key={src} src={src} alt={i ? '이어지는 말풍선' : '캐릭터 말풍선'}
            onLoad={(e) => { e.currentTarget.style.width = `${e.currentTarget.naturalWidth / 3}px`; }} />
        ))}
      </div>
      <label className="range-row">
        <span>캐릭터 크기</span><b>{Math.round(value.scale * 100)}%</b>
        <input type="range" min={CHAR_SCALE.min} max={CHAR_SCALE.max} step={CHAR_SCALE.step} value={value.scale}
          onChange={(e) => onChange({ ...value, scale: Number(e.target.value) })} />
      </label>
      <label className="range-row">
        <span>말풍선과 간격</span><b>{value.gap}px</b>
        <input type="range" min={CHAR_GAP_RANGE.min} max={CHAR_GAP_RANGE.max} step={CHAR_GAP_RANGE.step} value={value.gap}
          onChange={(e) => onChange({ ...value, gap: Number(e.target.value) })} />
      </label>
    </div>
  );
}
