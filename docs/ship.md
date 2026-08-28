# 배포 경로

## 지금: Amplify 웹 MVP

데스크탑 + 폰 브라우저에서 **기본 시스템과 재미**를 검증한다.

- 산출물: Vite `dist/` 정적 사이트
- 호스트: AWS Amplify Hosting. GitHub `main` 푸시 → 빌드
- 백엔드/로그인/Amplify Data 없음. 게임만
- 입력: 마우스 탭-탭 + 터치 스와이프. 엔진은 `trySwap`만 앎

GitHub 리포에 Amplify 앱을 연결하면 된다. 빌드 스펙은 루트 `amplify.yml`.

## 나중: Steam + 앱스토어

같은 엔진을 유지한다. 웹 MVP를 Unity로 다시 짜지 않는다.

| 채널 | 껍질 | 게임 |
| --- | --- | --- |
| Amplify (지금) | 브라우저 | Pixi + DOM HUD |
| Steam | Tauri (또는 Electron) | 같은 Pixi 빌드 |
| App Store | Capacitor + WKWebView | 같은 Pixi 빌드 |
| Play (가능하면) | Capacitor | 같은 것 |

8×8 매치3 + 파티클은 웹뷰에서 충분하다. 네이티브 재작성은 Burst 연출이 웹뷰에서 죽을 때만.

## 엔진 규칙 (스토어 때문에 지금 지킴)

- `src/engine/` 은 `window` / `document` / Pixi / Amplify SDK를 모름
- 플랫폼 API (스팀 업적, IAP, 세이브 경로)는 나중에 `src/platform/` 어댑터만
- 세이브가 생기면 `localStorage`를 엔진에 넣지 말고 포트로 주입

## Amplify에서 안 하는 것

- Cognito, GraphQL, 계정
- 프리뷰마다 다른 백엔드
- 앱스토어 심사용 네이티브 셸 (그건 Capacitor 단계)

## Steam / 스토어 때 붙일 것

- Steamworks: 업적, 클라우드 세이브 (Tauri 플러그인)
- App Store: 서명, IAP(나중에), 14+ 콘텐츠, 개인정보 처리방침
- 입력: 데스크는 마우스, 폰은 스와이프. 이미 웹 MVP에서 둘 다 검증
