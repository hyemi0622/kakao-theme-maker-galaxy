/**
 * themeSpec.js
 * ─────────────────────────────────────────────────────────────
 */

/** 실제 테마는 @3x 만 넣는다 */
export const SCALE_SUFFIX = '@3x';

export const SLOTS = [
  /* 암호 입력 화면 — 132x132 */
  { name: 'passcodeImgCode01', px: 132, from: 'A', fit: 0.94 },
  { name: 'passcodeImgCode02', px: 132, from: 'A', fit: 0.94 },
  { name: 'passcodeImgCode03', px: 132, from: 'A', fit: 0.94 },
  { name: 'passcodeImgCode04', px: 132, from: 'A', fit: 0.94 },
  { name: 'passcodeImgCode01Selected', px: 132, from: 'B', fit: 0.94 },
  { name: 'passcodeImgCode02Selected', px: 132, from: 'B', fit: 0.94 },
  { name: 'passcodeImgCode03Selected', px: 132, from: 'B', fit: 0.94 },
  { name: 'passcodeImgCode04Selected', px: 132, from: 'B', fit: 0.94 },

  /* 기본 프로필 덮어쓰기 — 360x360 @3x */
  { name: 'profileImg01', px: 360, from: 'B', fit: 0.74, bg: '#FFFFFF' },
  { name: 'profileImg02', px: 360, from: 'A', fit: 0.74, bg: '#FFFFFF' },
  { name: 'profileImg03', px: 360, from: 'B', fit: 0.74, bg: '#FFFFFF' },

  /* 하단 탭바 아이콘 — 114x114 @3x */
  { name: 'maintabIcoFriends', px: 114, from: 'deco:star-blue', fit: 0.72 },
  { name: 'maintabIcoFriendsSelected', px: 114, from: 'deco:star-blue', fit: 0.86 },
  { name: 'maintabIcoChats', px: 114, from: 'deco:burst-pink', fit: 0.72 },
  { name: 'maintabIcoChatsSelected', px: 114, from: 'deco:burst-pink', fit: 0.86 },
  { name: 'maintabIcoNow', px: 114, from: 'deco:swirl-green', fit: 0.72 },
  { name: 'maintabIcoNowSelected', px: 114, from: 'deco:swirl-green', fit: 0.86 },
  { name: 'maintabIcoShopping', px: 114, from: 'deco:star-cream', fit: 0.72 },
  { name: 'maintabIcoShoppingSelected', px: 114, from: 'deco:star-cream', fit: 0.86 },
  { name: 'maintabIcoCall', px: 114, from: 'deco:leek', fit: 0.72 },
  { name: 'maintabIcoCallSelected', px: 114, from: 'deco:leek', fit: 0.86 },
  { name: 'maintabIcoMore', px: 114, from: 'deco:burst-black', fit: 0.72 },
  { name: 'maintabIcoMoreSelected', px: 114, from: 'deco:burst-black', fit: 0.86 },
];

export const FLAT_SLOTS = [
  { name: 'commonIcoTheme', px: 162, from: 'B', fit: 0.86 },
];

export const BG_SLOTS = [
  { name: 'chatroomBgImage', w: 1125, h: 2250, stars: true },
  { name: 'mainBgImage', w: 1125, h: 2250 },
  { name: 'passcodeBgImage', w: 1200, h: 1200 },
  { name: 'maintabBgImage', w: 1410, h: 147 },
];

/* ★★ 말풍선 규격 ★★
   [픽셀 깨짐 해결]
     말풍선 원본이 꼬리O = 156x140, 꼬리X = 143x140 로 서로 다르다.
     목표 크기를 150x140 으로 잡으면
       꼬리O 156→150 (4% 축소) / 꼬리X 143→150 (5% 확대)
     둘 다 리샘플링이 거의 없어서 선 굵기와 화질이 똑같아진다.
     세로는 140 = 원본 그대로라 세로 방향 깨짐이 아예 없다.
     (이전엔 01=130 / 02=113 으로 축소율이 달라서 02 만 얇고 뭉개졌다)

   [캐릭터-말풍선 간격]
     간격 = bubble.x - (charPad + char.w) = 144 - (16 + 118) = 10px
     send 쪽은 좌우 반전이라 자동으로 같은 10px 이 적용된다. */
/* 받은 쪽 — 캐릭터 작게 */
/* 받은 쪽 */
export const CELL01R = {
  w: 202, h: 206,
  char: { w: 100, h: 116 },
  charPad: 0,
  bubble: { w: 100, h: 98, y: 108, x: 102 },   // 간격 2px, y 117 → 108
};
export const CELL02R = {
  w: 202, h: 98, char: null,
  bubble: { w: 100, h: 98, y: 0, x: 102 },
};

/* 보낸 쪽 */
export const CELL01S = {
  w: 226, h: 206,
  char: { w: 118, h: 138 },
  charPad: 6,
  bubble: { w: 100, h: 98, y: 108, x: 126 },   // 간격 2px, y 117 → 108
};
export const CELL02S = {
  w: 226, h: 98, char: null,
  bubble: { w: 100, h: 98, y: 0, x: 126 },
};

/* 순서는 (capLeft, capTop). insets 는 top left bottom right. 전부 1배수 pt */
export const CELL_CSS = {
  //            capLeft  capTop        top  left  bottom right
  receive01: { cap: '46px 42px', insets: '45px 46px 9px 10px' },
  send01:    { cap: '18px 48px', insets: '45px 10px 9px 54px' },
  receive02: { cap: '46px 15px', insets: '9px 41px 9px 10px' },
  send02:    { cap: '12px 15px', insets: '9px 10px 9px 49px' },
};

export const BUBBLE_ART = {
  tailLeft: 'bubbles/tail-left.png',
  tailRight: 'bubbles/tail-right.png',
  plainA: 'bubbles/plain-a.png',
  plainB: 'bubbles/plain-b.png',
};

export const BUBBLE_SLOTS = [
  { name: 'chatroomBubbleReceive01', side: 'left', from: 'A', cell: 'CELL01R', art: 'tailLeft' },
  { name: 'chatroomBubbleReceive01Selected', side: 'left', from: 'A', cell: 'CELL01R', art: 'tailLeft', dim: true },
  { name: 'chatroomBubbleReceive02', side: 'left', from: null, cell: 'CELL02R', art: 'plainA' },
  { name: 'chatroomBubbleReceive02Selected', side: 'left', from: null, cell: 'CELL02R', art: 'plainA', dim: true },
  { name: 'chatroomBubbleSend01', side: 'right', from: 'B', cell: 'CELL01S', art: 'tailRight' },
  { name: 'chatroomBubbleSend01Selected', side: 'right', from: 'B', cell: 'CELL01S', art: 'tailRight', dim: true },
  { name: 'chatroomBubbleSend02', side: 'right', from: null, cell: 'CELL02S', art: 'plainB' },
  { name: 'chatroomBubbleSend02Selected', side: 'right', from: null, cell: 'CELL02S', art: 'plainB', dim: true },
];

export const KEYPAD = { name: 'passcodeKeypadPressed', px: 180 };

export const THEME_META = {
  name: '내 캐릭터 테마',
  version: '1.0',
  author: 'kakao-theme-maker',
  url: 'https://github.com',
  id: 'com.kakao.talk.theme.mycharacter',
};

export const COLORS = {
  bg: '#FFFFFF',
  text: '#222222',
  sub: '#666666',
  accent: '#7B93C6',
};
