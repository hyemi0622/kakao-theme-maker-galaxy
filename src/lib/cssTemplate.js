/**
 * cssTemplate.js
 * ─────────────────────────────────────────────────────────────
 * ★ 실제로 작동하는 테마의 KakaoTalkTheme.css 를 그대로 본떴다 ★
 *
 * 이전 버전이 적용 안 됐던 결정적 이유:
 *   -kakaotalk-theme-name 같은 메타데이터를 파일 최상단에 그냥 써놨는데,
 *   실제로는 반드시 `ManifestStyle { ... }` 블록 안에 있어야 한다.
 *   이게 없으면 카카오톡이 CSS 파싱에 실패해서 테마를 통째로 무시한다.
 *
 * 그 외에도 선택자·속성명이 실제와 달랐다.
 *   TabbarStyle-Main            →  TabBarStyle-Main  (대문자 B)
 *   -ios-icon-friends           →  -ios-friends-normal-icon-image
 *   -ios-code-image-01          →  -ios-bullet-first-image
 *   -ios-profile-image-01 (3개) →  -ios-profile-images: 'a','b','c';  (1개)
 */

import { THEME_META, COLORS, CELL_CSS } from '../constants/themeSpec.js';

export function buildThemeCss(opt = {}) {
  const m = { ...THEME_META, ...opt.meta };
  const c = { ...COLORS, ...opt.colors };
  const S = CELL_CSS;

  return `/*
 Manifest
 */

ManifestStyle
{
    -kakaotalk-theme-name: '${m.name}';
    -kakaotalk-theme-version: '${m.version}';
    -kakaotalk-theme-url: '${m.url}';
    -kakaotalk-author-name: '${m.author}';
    -kakaotalk-theme-id: '${m.id}';
}


/*
 TabBar Style
 */

TabBarStyle-Main
{
    background-color: ${c.bg};
    -ios-background-image: 'maintabBgImage.png';

    -ios-friends-normal-icon-image: 'maintabIcoFriends.png';
    -ios-friends-selected-icon-image: 'maintabIcoFriendsSelected.png';

    -ios-chats-normal-icon-image: 'maintabIcoChats.png';
    -ios-chats-selected-icon-image: 'maintabIcoChatsSelected.png';

    -ios-now-normal-icon-image: 'maintabIcoNow.png';
    -ios-now-selected-icon-image: 'maintabIcoNowSelected.png';

    -ios-shopping-normal-icon-image: 'maintabIcoShopping.png';
    -ios-shopping-selected-icon-image: 'maintabIcoShoppingSelected.png';

    -ios-call-normal-icon-image: 'maintabIcoCall.png';
    -ios-call-selected-icon-image: 'maintabIcoCallSelected.png';

    -ios-more-normal-icon-image: 'maintabIcoMore.png';
    -ios-more-selected-icon-image: 'maintabIcoMoreSelected.png';

    -ios-openchats-normal-icon-image: 'maintabIcoNow.png';
    -ios-openchats-selected-icon-image: 'maintabIcoNowSelected.png';
}


/*
 MainView Style
 */

HeaderStyle-Main
{
    -ios-text-color: ${c.text};
    -ios-tab-text-color: ${c.text};
    -ios-tab-highlighted-text-color: ${c.text};
}

MainViewStyle-Primary
{
    background-color: ${c.bg};
    -ios-background-image: 'mainBgImage.png';

    -ios-text-color: ${c.text};
    -ios-highlighted-text-color: ${c.text};

    -ios-description-text-color: ${c.sub};
    -ios-description-highlighted-text-color: ${c.sub};

    -ios-paragraph-text-color: ${c.sub};
    -ios-paragraph-highlighted-text-color: ${c.sub};

    -ios-normal-background-color: #f5f5f5;
    -ios-normal-background-alpha: 0.0;

    -ios-selected-background-color: #f5f5f5;
    -ios-selected-background-alpha: 0.1;
}

MainViewStyle-Secondary
{
    background-color: ${c.bg};
}

SectionTitleStyle-Main
{
    border-color: ${c.text};
    border-alpha: 0.09;

    -ios-text-color: ${c.text};
    -ios-text-alpha: 1.0;
}


/*
 Feature Style
 */

FeatureStyle-Primary
{
    -ios-text-color: ${c.text};
}


/*
 DefaultProfile Style
 */

DefaultProfileStyle
{
    -ios-profile-images: 'profileImg01.png', 'profileImg02.png', 'profileImg03.png';
}


/*
 ChatRoom Style
 */

BackgroundStyle-ChatRoom
{
    background-color: ${c.bg};
    -ios-background-image: 'chatroomBgImage.png';
}

InputBarStyle-Chat
{
    background-color: #ffffff;

    -ios-send-normal-background-color: ${c.accent};
    -ios-send-normal-foreground-color: #ffffff;

    -ios-send-highlighted-background-color: ${c.accent};
    -ios-send-highlighted-foreground-color: #ffffff;

    -ios-button-normal-foreground-color: ${c.sub};
    -ios-button-highlighted-foreground-color: ${c.sub};

    -ios-button-text-color: ${c.text};
    -ios-button-normal-background-color: #ffffff;
    -ios-button-normal-background-alpha: 0.8;
}


/*
 Message Style
   -ios-background-image: '파일.png' <capTop> <capLeft>;
   → 모서리는 고정되고 가운데만 늘어난다. 글자가 길어져도 안 뭉개짐.
 */

MessageCellStyle-Send
{
    -ios-background-image: 'chatroomBubbleSend01.png' ${S.send01.cap};
    -ios-selected-background-image: 'chatroomBubbleSend01Selected.png' ${S.send01.cap};

    -ios-group-background-image: 'chatroomBubbleSend02.png' ${S.send02.cap};
    -ios-group-selected-background-image: 'chatroomBubbleSend02Selected.png' ${S.send02.cap};

    -ios-title-edgeinsets: ${S.send01.insets};
    -ios-group-title-edgeinsets: ${S.send02.insets};

    -ios-text-color: ${c.text};
    -ios-selected-text-color: ${c.text};
    -ios-unread-text-color: ${c.sub};
}

MessageCellStyle-Receive
{
    -ios-background-image: 'chatroomBubbleReceive01.png' ${S.receive01.cap};
    -ios-selected-background-image: 'chatroomBubbleReceive01Selected.png' ${S.receive01.cap};

    -ios-group-background-image: 'chatroomBubbleReceive02.png' ${S.receive02.cap};
    -ios-group-selected-background-image: 'chatroomBubbleReceive02Selected.png' ${S.receive02.cap};

    -ios-title-edgeinsets: ${S.receive01.insets};
    -ios-group-title-edgeinsets: ${S.receive02.insets};

    -ios-text-color: ${c.text};
    -ios-selected-text-color: ${c.text};
    -ios-unread-text-color: ${c.sub};
}


/*
 Passcode Style
   입력 전  = bullet          → A(왼쪽/상대방) 캐릭터
   입력 후  = bullet-selected → B(오른쪽/나)  캐릭터
 */

BackgroundStyle-Passcode
{
    background-color: ${c.bg};
    -ios-background-image: 'passcodeBgImage.png';
}

LabelStyle-PasscodeTitle
{
    -ios-text-color: ${c.text};
}

PasscodeStyle
{
    -ios-bullet-first-image: 'passcodeImgCode01.png';
    -ios-bullet-second-image: 'passcodeImgCode02.png';
    -ios-bullet-third-image: 'passcodeImgCode03.png';
    -ios-bullet-fourth-image: 'passcodeImgCode04.png';

    -ios-bullet-selected-first-image: 'passcodeImgCode01Selected.png';
    -ios-bullet-selected-second-image: 'passcodeImgCode02Selected.png';
    -ios-bullet-selected-third-image: 'passcodeImgCode03Selected.png';
    -ios-bullet-selected-fourth-image: 'passcodeImgCode04Selected.png';

    -ios-keypad-background-color: ${c.bg};
    -ios-keypad-text-normal-color: ${c.text};

    -ios-keypad-number-highlighted-image: 'passcodeKeypadPressed.png';
}


/*
 Message Notification Bar Style
 */

BackgroundStyle-MessageNotificationBar
{
    background-color: ${c.bg};
}

LabelStyle-MessageNotificationBarName
{
    -ios-text-color: ${c.text};
}

LabelStyle-MessageNotificationBarMessage
{
    -ios-text-color: ${c.text};
}


/*
 Direct Share
 */

BackgroundStyle-DirectShareBar
{
    background-color: ${c.bg};
}

LabelStyle-DirectShareBarName
{
    -ios-text-color: ${c.text};
}

LabelStyle-DirectShareBarMessage
{
    -ios-text-color: ${c.text};
}


/*
 BottomBanner Style
 */

BottomBannerStyle
{
    background-color: ${c.accent};
}

BottomBannerStyle-Light
{
    background-color: ${c.accent};
}
`;
}
