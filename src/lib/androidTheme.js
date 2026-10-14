import JSZip from 'jszip';
import { makeCanvas, toPngBlob } from './imageProcess.js';
import { bubblePatchBounds, drawNinePatch } from './ninePatch.js';

export function androidAssetName(name) {
  const base = name.replace(/@3x\.png$|\.png$/g, '');
  const exact = {
    commonIcoTheme: 'theme_icon', chatroomBgImage: 'theme_chatroom_background_image',
    mainBgImage: 'theme_background_image', passcodeBgImage: 'theme_passcode_background_image',
    maintabBgImage: 'theme_maintab_cell_image',
  };
  if (exact[base]) return exact[base];
  const profile = base.match(/^profileImg(\d+)$/);
  if (profile) return `theme_profile_${profile[1]}_image`;
  const pass = base.match(/^passcodeImgCode(\d+)(Selected)?$/);
  if (pass) return `theme_passcode_${pass[1]}${pass[2] ? '_checked' : ''}_image`;
  const tab = base.match(/^maintabIco(\w+?)(Selected)?$/);
  if (tab) return `theme_maintab_ico_${tab[1].toLowerCase()}${tab[2] ? '_focused' : ''}_image`;
  const bubble = base.match(/^chatroomBubble(Receive|Send)(\d+)(Selected)?$/);
  if (bubble) return `theme_chatroom_bubble_${bubble[1] === 'Send' ? 'me' : 'you'}_${bubble[2]}${bubble[3] ? '_pressed' : ''}_image`;
  return null;
}

export async function addAndroidAssets(assets, name, source, bubble) {
  const mapped = androidAssetName(name);
  if (!mapped) return;
  const canvas = bubble
    ? drawNinePatch(makeCanvas(source.width + 2, source.height + 2), source, bubblePatchBounds(bubble))
    : source;
  assets.set(`src/main/theme/drawable-xxhdpi/${mapped}${bubble ? '.9' : ''}.png`, await toPngBlob(canvas));
}

export async function packageAndroidProject(assets) {
  const response = await fetch(`${import.meta.env.BASE_URL}android-template.json`);
  if (!response.ok) throw new Error('갤럭시 테마 템플릿을 불러오지 못했어요.');
  const files = await response.json();
  const zip = new JSZip();
  for (const [path, text] of Object.entries(files)) {
    zip.file(path, typeof text === 'string' ? text : text.base64,
      typeof text === 'string' ? { unixPermissions: path === 'gradlew' ? 0o755 : 0o644 } : { base64: true });
  }
  for (const [path, blob] of assets) zip.file(path, blob);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function requestAndroidApk(project, buildUrl) {
  if (!buildUrl) throw new Error('APK 생성 서버가 연결되지 않았어요. 프로젝트 ZIP으로 내려받아 주세요.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300000);
  try {
    const response = await fetch(buildUrl, {
      method: 'POST', body: project, headers: { 'Content-Type': 'application/zip' }, signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail.slice(0, 300) || 'APK 생성에 실패했어요.');
    }
    if (!response.headers.get('Content-Type')?.includes('application/vnd.android.package-archive')) {
      throw new Error('생성 서버가 APK 대신 다른 응답을 보냈어요.');
    }
    return await response.blob();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('APK 생성 시간이 초과됐어요. 프로젝트 ZIP을 이용해 주세요.');
    throw error;
  } finally { clearTimeout(timer); }
}
