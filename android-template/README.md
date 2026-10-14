# 내 캐릭터 카카오톡 테마 (갤럭시 / 안드로이드)

1. ZIP 압축을 풉니다.
2. Android Studio → Open으로 이 폴더를 열고 Gradle 동기화를 기다립니다.
3. SDK 설치 요청이 나오면 Android API 35 / Build Tools 35.0.0을 설치합니다.
4. Build → Generate App Bundles or APKs → Generate APKs를 실행합니다.
5. `build/outputs/apk/debug/MyCharacterTheme-debug.apk`를 갤럭시에 옮겨 설치합니다.
6. 테마 앱에서 적용 버튼을 누르거나 카카오톡 설정 → 테마에서 선택합니다.

JDK 17이 필요합니다. 터미널에서는 `sh gradlew assembleDebug` 또는 Windows에서 `gradlew.bat assembleDebug`를 실행할 수 있습니다.

기존 말풍선 PNG에 1px짜리 9-patch 테두리만 추가했습니다. 캐릭터 바깥의 말풍선 안쪽만 늘어납니다.
배경은 누끼 없이 비율을 유지하고 중앙을 기준으로 잘라 넣습니다.
xxhdpi 리소스 한 벌을 넣으며 Android가 기기 밀도에 맞게 조절합니다.
폰의 가로 화면에서도 같은 배경을 사용합니다. 태블릿 전용 배치는 포함하지 않습니다.

기본 패키지명은 `com.hyemi.themer.mycharacter`입니다. 여러 테마를 동시에 설치하려면 build.gradle의 applicationId를 테마마다 바꾸세요.
같은 패키지 테마를 업데이트하려면 같은 서명 키를 사용해야 합니다. 컴퓨터와 생성 서버의 서명 키는 다를 수 있습니다.
프로젝트 ZIP은 설치 파일이 아닙니다. APK를 빌드해야 합니다.

Gradle Wrapper는 Gradle 프로젝트의 Apache License 2.0에 따라 제공됩니다.
