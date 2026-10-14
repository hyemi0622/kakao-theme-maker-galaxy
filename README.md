# 카카오톡 테마 메이커 — 갤럭시용 변환

사진 두 장으로 기존 캐릭터 말풍선을 만드는 React + Vite 앱입니다.

- 서버 없이 브라우저에서 바로 설치 가능한 테마 APK(`mytheme.apk`)를 만들어 다운로드합니다.
- 기존처럼 캐릭터 두 장으로 말풍선과 잠금 비밀번호 이미지를 만듭니다.
- 채팅방 배경 사진 한 장을 직접 업로드 / 삭제합니다.
- 배경에는 누끼를 적용하지 않고 비율을 유지해 중앙 기준으로 채웁니다.
- 배경을 올리지 않으면 기존 채팅방 별 배경과 나머지 흰 배경을 사용합니다.
- 기존 말풍선 원본 PNG와 캐릭터 합성을 유지합니다. Android에는 캐릭터가 늘어나지 않는 9-patch 테두리를 추가합니다.

## 실행

```bash
npm ci
npm run dev
```

```bash
npm test
npm run build
```

## 서버 없이 APK 만들기

`public/theme-template.apk`는 이미지만 비어 있는 테마 APK입니다.
생성하기를 누르면 브라우저가 이 APK의 이미지를 캐릭터 이미지로 바꿔 끼우고,
말풍선은 9-patch로 컴파일한 뒤 APK Signature Scheme v2로 서명합니다 (`src/lib/apk.js`).

- 서명 키는 브라우저마다 처음 한 번 만들어 저장합니다. 같은 브라우저로 다시 만든 테마는 기존 테마 위에 덮어 설치됩니다.
- 다른 브라우저/기기에서 만든 테마는 서명이 달라서, 이미 설치된 테마를 지운 뒤 설치해야 합니다.
- 갤럭시에서 APK를 설치하려면 브라우저의 ‘출처를 알 수 없는 앱 설치’를 허용해야 합니다.

`android-template`을 바꿨다면 템플릿 APK를 다시 빌드하세요. JDK 17과 Android SDK가 필요합니다.

```bash
ANDROID_HOME=~/Library/Android/sdk npm run android:template-apk
```

## (선택) APK 빌드 서버 연결

서버 주소를 설정하면 브라우저 대신 Gradle 서버에서 APK를 빌드합니다.

### 로컬 개발

JDK 17과 Android SDK를 설치하고 `ANDROID_HOME`을 SDK 경로로 설정합니다.
`.env.example`을 `.env.local`로 복사합니다.

```bash
npm run android:server
```

다른 터미널에서 `npm run dev`를 실행합니다.
Vite를 이미 실행 중이면 `.env.local` 추가 후 재시작해야 합니다.
서버가 연결되면 생성 버튼이 서명된 debug APK를 반환합니다.
서버 주소를 설정하지 않으면 브라우저에서 APK를 만듭니다.

### Docker

```bash
docker build -f server/Dockerfile -t themer-android .
docker run --rm -p 8787:8787 \
  -e ALLOWED_ORIGIN=http://localhost:5173 \
  -v themer-gradle:/data/gradle \
  -v themer-signing:/root/.android \
  themer-android
```

Gradle 캐시와 debug 서명 키를 보존하세요. 키가 바뀌면 이미 설치한 동일 패키지 테마를 덮어 설치할 수 없습니다.

### 배포

- 프론트의 `VITE_ANDROID_BUILD_URL`을 실제 HTTPS 서버의 `/api/android/build` 주소로 설정한 뒤 다시 빌드합니다.
- 서버의 `ALLOWED_ORIGIN`을 프론트 사이트의 origin (경로 없이)으로 설정합니다.
- 정적 사이트 호스팅만으로 APK 빌드 서버를 실행할 수는 없습니다.
- 서버는 한 번에 한 개의 APK를 만듭니다. 중복 요청은 429를 반환합니다.
- 서버는 업로드 ZIP에서 허용된 PNG만 읽고, Gradle/Java/스크립트는 자체 템플릿을 사용합니다.
- 인터넷에 공개 배포할 때는 앞단에 인증/요청 제한과 HTTPS를 구성하세요. CORS만으로 사용자를 인증하지 않습니다.
- debug APK는 직접 설치용입니다. Play Store 배포용 release 서명은 별도입니다.

## 코드

- `src/lib/buildTheme.js`: 기존 이미지 생성 흐름을 갤럭시용으로 출력.
- `src/lib/androidTheme.js`: Android 리소스 이름 매핑, 프로젝트 ZIP, APK 요청.
- `src/lib/ninePatch.js`: 캐릭터를 제외한 말풍선 늘어남 영역 및 텍스트 여백.
- `android-template/`: 최소 Java 테마 앱, Android 리소스, Gradle Wrapper.
- `scripts/write-android-template.mjs`: 템플릿을 브라우저 배포 파일로 변환. dev/build 전에 자동 실행.
- `server/android-build.mjs`: 이미지 검증, 임시 빌드, APK 반환 및 임시 파일 정리.

기본 Android 패키지명은 `com.hyemi.themer.mycharacter`입니다.
다른 테마를 동시에 설치하려면 `android-template/build.gradle`의 applicationId를 바꾸고 다시 빌드하세요.
Android xxhdpi 한 벌을 넣으며 Android가 기기 밀도에 맞게 조절합니다.
가로 화면과 태블릿 전용 디자인은 포함하지 않습니다.
글자가 긴 메시지/여러 줄 메시지와 잠금 화면의 최종 배치는 실제 갤럭시 카카오톡에서 확인해야 합니다.

## 참고

카카오 Android 테마 가이드:
https://t1.kakaocdn.net/kakaocorp/Service/Theme/KakaoTalk/9.2.5_UserThemeGuide_Android.pdf

현행 샘플의 리소스 이름 / Manifest 계약 확인용:
https://github.com/seyoung34/talk-theme-maker/tree/main/android-sample-theme/apeach-26.1.0-source

원본 어피치 그림이나 외부 서비스 코드는 포함하지 않습니다.
Gradle Wrapper JAR는 Apache License 2.0에 따라 제공하며 `android-template/LICENSE-Gradle.txt`를 포함합니다.
