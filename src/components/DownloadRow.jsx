/**
 * 생성 완료 후 나오는 파일 행.
 * 다운로드 버튼을 누르면 브라우저(iOS) 기본 다운로드 시트가 뜬다.
 * ("~을(를) 다운로드하겠습니까?" 는 iOS 가 직접 띄우는 것이므로 앱에서 만들지 않는다)
 */
export function DownloadRow({ filename, onDownload }) {
  return (
    <div className="dl-row">
      <svg className="dl-ico" viewBox="0 0 25 21" fill="none">
        <path d="M0.5 3.5h12l1.6 2.2H24.5v14.8H0.5z" fill="#fff" stroke="#A9A9A9" />
        <path d="M0.5 0.5h12v3h-12z" fill="#fff" stroke="#A9A9A9" />
      </svg>
      <span className="fname">{filename}</span>
      <button className="dl-btn" onClick={onDownload} aria-label="다운로드">
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M10 2v11M5.5 9L10 13.5 14.5 9M2 17.5h16"
                stroke="#53BC72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
