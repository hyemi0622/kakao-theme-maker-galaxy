import { useState } from 'react';
import UploadSlot from './components/UploadSlot.jsx';
import { DownloadRow } from './components/DownloadRow.jsx';
import { StarBg, DecoBar } from './components/Deco.jsx';
import { buildTheme, saveTheme } from './lib/buildTheme.js';
import { isInAppBrowser, openInExternalBrowser } from './lib/viewport.js';
import './styles/app.css';

const INAPP = isInAppBrowser();
const BUILD_URL = import.meta.env.VITE_ANDROID_BUILD_URL || '';

export default function App() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [background, setBackground] = useState(null);
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

  const generate = async () => {
    if (!ready) return;
    setBusy(true); setResult(null); setSaved(''); setError(''); setPct(0);
    try {
      setResult(await buildTheme(fileA, fileB, (msg, p) => {
        setStep(msg); setPct(Math.round(p * 100));
      }, { background, buildUrl: BUILD_URL }));
    } catch (e) {
      console.error(e);
      setError(e.message || '생성에 실패했어요. 다시 시도해 주세요.');
    } finally { setBusy(false); }
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
      <button className="cta" disabled={!ready} onClick={generate}>{busy ? '만드는 중…' : '생성하기'}</button>
      {busy && <div role="status" aria-live="polite">
        <div className="progress">{step} {pct}%</div>
        <div className="progress-bar"><i style={{ width: `${pct}%` }} /></div>
      </div>}
      {error && <p className="error" role="alert">{error}</p>}
      {result && <DownloadRow filename={result.filename} onDownload={async () => {
        const how = await saveTheme(result.blob, result.filename);
        if (how === 'shared') setSaved('공유 완료! 갤럭시에서 받은 APK를 눌러 설치한 뒤 카카오톡 설정 → 테마에서 적용하세요.');
        else if (how === 'downloaded') setSaved('다운받은 APK를 눌러 설치한 뒤 카카오톡 설정 → 테마에서 적용하세요.');
      }} />}
      {saved && <p className="saved" role="status">{saved}</p>}
      <DecoBar />
    </div></div></div>
  );
}
