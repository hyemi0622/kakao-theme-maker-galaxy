import { useRef, useState } from 'react';
import UploadSlot from './components/UploadSlot.jsx';
import { DownloadRow } from './components/DownloadRow.jsx';
import { StarBg, DecoBar } from './components/Deco.jsx';
import { buildTheme, saveTheme } from './lib/buildTheme.js';
import { isInAppBrowser, openInExternalBrowser } from './lib/viewport.js';
import { CHAR_GAP } from './constants/themeSpec.js';
import BubbleControls from './components/BubbleControls.jsx';
import './styles/app.css';

const INAPP = isInAppBrowser();
const BUILD_URL = import.meta.env.VITE_ANDROID_BUILD_URL || '';

export default function App() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [background, setBackground] = useState(null);
  const [char, setChar] = useState({ left: { scale: 1, gap: CHAR_GAP }, right: { scale: 1, gap: CHAR_GAP } });
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [pct, setPct] = useState(0);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const ready = fileA && fileB && !busy;
  const pick = (setter) => (file) => {
    setter(file); setResult(null); setSaved(''); setError('');
  };

  const run = useRef(0);
  const timer = useRef(null);

  // 캐릭터 크기만 바꿔 다시 만들 때는 이전 결과(미리보기)를 띄워둔 채로 교체한다
  const generate = async (c = char) => {
    if (!fileA || !fileB) return;
    const id = ++run.current;
    setBusy(true); setSaved(''); setError(''); setPct(0);
    try {
      const next = await buildTheme(fileA, fileB, (msg, p) => {
        if (id === run.current) { setStep(msg); setPct(Math.round(p * 100)); }
      }, { background, left: c.left, right: c.right, buildUrl: BUILD_URL });
      if (id === run.current) setResult(next);
    } catch (e) {
      console.error(e);
      if (id === run.current) setError(e.message || '생성에 실패했어요. 다시 시도해 주세요.');
    } finally { if (id === run.current) setBusy(false); }
  };

  // 크기/간격을 바꾸면 (이미 생성했을 때만) 잠깐 뒤 자동으로 다시 만든다
  const changeChar = (side, value) => {
    const next = { ...char, [side]: value };
    setChar(next);
    if (!result) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => generate(next), 350);
  };

  return (
    <div className="viewport"><div className="stage"><div className="screen">
      <StarBg />
      {INAPP && <div className="inapp">
        <p>파일을 저장하려면 외부 브라우저로 열어 주세요.</p>
        <button onClick={openInExternalBrowser}>브라우저로 열기</button>
      </div>}
      <h1 className="title">좋아하는 캐릭터로 심플한 카카오톡 테마를 만들어 보세요.</h1>
      <p className="subtitle">갤럭시 / 안드로이드용입니다.</p>
      <div className="guide"><ol>
        <li>테마 설치 파일(.apk) 다운로드</li>
        <li>다운받은 파일을 눌러 설치 (‘출처를 알 수 없는 앱’ 허용)</li>
        <li>카카오톡 설정 → 테마에서 적용하기</li>
      </ol></div>
      <div className="slots">
        <UploadSlot label="왼쪽" disabled={busy} onPick={pick(setFileA)} />
        <UploadSlot label="오른쪽" disabled={busy} onPick={pick(setFileB)} />
      </div>
      <div className="background-slot">
        <UploadSlot label="배경화면" removable disabled={busy} onPick={pick(setBackground)} />
        <p>선택한 사진을 채팅방 배경으로 넣어요. 비워두면 기존 별 배경을 사용해요.</p>
      </div>
      <BubbleControls side="left" label="왼쪽 말풍선 캐릭터" file={fileA} device="갤럭시"
        value={char.left} onChange={(v) => changeChar('left', v)} />
      <BubbleControls side="right" label="오른쪽 말풍선 캐릭터" file={fileB} device="갤럭시"
        value={char.right} onChange={(v) => changeChar('right', v)} />

      <button className="cta" disabled={!ready} onClick={() => generate()}>{busy ? '만드는 중…' : '생성하기'}</button>
      {busy && <div role="status" aria-live="polite">
        <div className="progress">{step} {pct}%</div>
        <div className="progress-bar"><i style={{ width: `${pct}%` }} /></div>
      </div>}
      {error && <p className="error" role="alert">{error}</p>}
      {result && !busy && <DownloadRow filename={result.filename} onDownload={async () => {
        const how = await saveTheme(result.blob, result.filename);
        if (how === 'shared') setSaved('공유 완료! 갤럭시에서 받은 APK를 눌러 설치한 뒤 카카오톡 설정 → 테마에서 적용하세요.');
        else if (how === 'downloaded') setSaved('다운받은 APK를 눌러 설치한 뒤 카카오톡 설정 → 테마에서 적용하세요.');
      }} />}
      {saved && <p className="saved" role="status">{saved}</p>}
      <DecoBar />
    </div></div></div>
  );
}
