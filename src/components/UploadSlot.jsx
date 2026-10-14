import { useEffect, useRef, useState } from 'react';

/**
 * 좌/우 캐릭터 업로드 슬롯
 *  왼쪽 = 상대방,  오른쪽 = 나
 */
export default function UploadSlot({ label, onPick, disabled = false, removable = false }) {
  const ref = useRef(null);
  const [preview, setPreview] = useState(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return alert('이미지 파일만 올려주세요.');
    setPreview(URL.createObjectURL(f));
    onPick(f);
  };

  return (
    <div className="slot">
      <div className="slot-chip">{label}</div>
      <button
        type="button"
        className="slot-box"
        onClick={() => ref.current?.click()}
        aria-label={`${label} 사진 추가`}
        disabled={disabled}
      >
        {preview ? <img src={preview} alt="" /> : <span>탭해서 사진 추가</span>}
        <input
          ref={ref}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic"
          onChange={pick}
          disabled={disabled}
        />
      </button>
      {removable && preview && <button type="button" className="remove-image" disabled={disabled}
        onClick={() => { setPreview(null); onPick(null); ref.current.value = ''; }}>사진 지우기</button>}
    </div>
  );
}
