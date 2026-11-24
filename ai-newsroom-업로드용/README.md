# 나만의 AI 편집국 — 사이트 원본

## 바로 열어 보기
`index.html`을 크롬으로 열면 돼(assets 폴더와 같은 위치에 있어야 함).
「데모: 세무사 수석 기사」 버튼이나 서울신문 링크를 넣으면 실험 기록으로 전체 과정이 재생된다.

## 폴더 구조
- `index.html` — 실제로 여는 파일 (아래 src를 합친 결과)
- `assets/` — 캐릭터·배경·웹툰 원화 이미지(webp), 폰트(Pretendard, 나눔손글씨 펜, 블랙한산스)
- `src/` — 수정할 때 보는 원본 조각
  - `part1_css.html` 화면 스타일 · `part2_html.html` 화면 뼈대
  - `part3_core.js` 에이전트(국장·취재부 기자·편성부 PD·제작부 작가) 정의, 걷기·말풍선·카메라
  - `part3b_life.js` 대기 중 잡담·움직임
  - `part4_webtoon.js` 데모 데이터(기사 A·B, 테마/레마 분석, 매체 점수, 컷 대본, 검수 결과)와 웹툰 렌더링
  - `part5_pipeline.js` 전체 진행 순서(run 함수) — 단계 순서를 바꿀 땐 여기
  - `part6_reader.js` 완성 웹툰 보기, 표현 탭하면 근거 보기
  - `build.sh` — 조각을 합쳐 `index.html` 다시 만들기 (`bash src/build.sh`)

## 다른 Claude 계정에서 수정할 때
1. 이 zip을 Claude 대화에 첨부한다.
2. "README와 src를 보고 ○○를 고쳐 줘. 고친 뒤 build.sh로 index.html을 다시 만들어 줘"처럼 요청한다.
3. 아티팩트(링크)로 쓰고 싶으면 index.html과 assets 폴더를 함께 아티팩트로 게시해 달라고 하면 된다.

## 알아 둘 점
- 라이브 모드(실제 AI 호출, 브라우저로 기사 읽기)는 Claude 아티팩트 안에서만 작동한다. 파일로 열면 데모(실험 기록 재생)로 진행된다.
- 현재 버전에는 레마 후보 3개 중 하나를 고르는 단계가 남아 있다 → `src/part5_pipeline.js`의 "어떤 레마를 다음 기사로 넘길까요?" 부분. 확정한 흐름(레마로 기사 B 하나를 바로 제안)으로 바꿀 때 이 부분을 수정하면 된다.
- 매체는 웹툰체·숏츠체·팟캐스트체. 웹툰체와 팟캐스트체를 실제로 만든다(숏츠체는 준비 중).

## 팟캐스트체 (src/part5b_podcast.js)
매체 선택에서 「팟캐스트체」를 고르면 제작부가 아래 순서로 만든다.
1. 소리 기호 4(말·효과음·음악·침묵)를 이 기사에서 쓸지·어떻게 쓸지 근거와 함께 정한다 (데모: 음악 없음, 질문 뒤 침묵 1.5초).
2. 서사 5유형을 선택/조건부/대안/부적합으로 판정한다 (데모: 질문·해설형).
3. 게스트: 레마 → 이어진 면 → 학문 → 질문 렌즈 (데모: 금융면 → 금융학 교수, AI 가상 인물).
4. 게스트 목소리: '어울림' 대신 기능 규칙(구별·억양 폭·말 속도 + 연령감·고지)으로 사양을 만들고, 설계문으로 바꾼다.
5. ElevenLabs 키가 있으면: Voice Design으로 후보 3개 생성 → 브라우저에서 음높이·억양 폭·말 속도를 측정해 점수로 고름 → 목소리 저장(같은 학문 게스트는 다음 화에 재사용) → Text to Dialogue(타임스탬프 포함)로 녹음 → 구간 전환음 1개 생성.
   키가 없으면: 브라우저 음성(Web Speech)으로 미리듣기.
6. 국장 원문 대조 검수 → 수정 줄은 재녹음 → 독자 확인 → 보도.
7. 보기 화면: 왼쪽 원문 A·B / 오른쪽 플레이어. 진행자 질문 → 물음 자리(점선 ?) → 생각 틈 → 게스트 답 → 답 자리(하이라이트). 말하는 순간 원문 구절이 켜진다(글자 단위 타임스탬프). 생각 틈 0 / 1.5 / 3초 선택은 실험 기록(JSON)에 남는다.

ElevenLabs 키는 이 브라우저(localStorage)에만 저장된다. 사용량 한도를 건 제한 키를 쓰는 것을 권장. 키를 지우려면 브라우저 개발자 도구에서 localStorage의 ai_newsroom_xi를 삭제.
쓰는 API: /v1/text-to-voice/design · /v1/text-to-voice · /v2/voices · /v1/text-to-dialogue/with-timestamps (eleven_v4 → 안 되면 eleven_v3) · /v1/sound-generation

## 고품질 한국어 음성 — Supertonic 3 (키 없음, 무료)
팟캐스트체 목소리 단계에서 엔진 네 가지 중 하나를 고른다.
1. **Supertonic 3 녹음본** (데모 기본): `assets/podcast/ep1-bank.js`에 미리 만든 EP.1 오디션 5개와 대사 13줄. 바로 재생.
2. **Supertonic 3 · 지금 생성**: Supertone의 Supertonic 3(OpenRAIL-M)를 브라우저 안에서 onnxruntime-web(WASM)으로 실행. 처음 한 번 모델 약 400MB를 Hugging Face에서 받고 캐시에 둔다. 키 필요 없음.
   - WebGPU 백엔드는 이 모델에서 거의 무음을 내서 WASM만 쓴다(직접 확인).
   - 숫자·기호는 한국어로 읽히게 바꾼다(20% → 이십 퍼센트, 2배 → 두 배).
   - 한 번의 실행이 멈추면 90초 뒤 세션을 다시 열고 재시도한다.
3. **ElevenLabs**: API 키가 있을 때.
4. **브라우저 기본 음성**: 마지막 대안(품질 낮음).

### 목소리 캐스팅 = 측정
- 진행자(프로그램의 목소리)는 고정: 여성 프리셋 5개를 같은 인사말로 녹음해 억양 폭이 가운데인 목소리 → EP.1에서 F1.
- 게스트: 남성 프리셋 5개를 게스트 첫 두 대사로 녹음해 측정 → 점수 = 0.5·구별(진행자와 반음 차 ÷ 7) + 0.3·억양 폭(진행자 범위 −1반음 이하) + 0.2·말 속도(진행자 × 0.85에 가까움). EP.1에서 M4(진행자보다 9.9반음 낮고 억양 폭이 가장 좁음).
- 실측 인사이트: 자연스러운 한국어 TTS의 억양 폭은 8~11반음이었다. '4반음 이내' 같은 절대 기준으로는 모든 후보가 탈락해서, 진행자 대비 상대 규칙으로 바꿨다.

### 녹음본 만드는 법
녹음본은 sherpa-onnx가 변환한 Supertonic 3 int8 모델(k2-fsa tts-models 2026-05-11)로 같은 규칙을 적용해 만들었다. 공식 모델과 길이는 같고 음높이 차이는 몇 Hz 이내(F1 211 vs 210Hz).

### 공유
- 웹 링크(Claude 아티팩트)는 녹음본으로 재생된다. 아티팩트 안에서는 외부 접속이 막혀 'Supertonic 지금 생성'과 ElevenLabs는 동작하지 않는다.
- GitHub Pages나 로컬 서버(`python3 -m http.server`)로 열면 지금 생성까지 모두 동작한다.

### 출처·라이선스
- Supertonic 3: https://huggingface.co/supertone-oss-archive/supertonic-3 (모델 OpenRAIL-M), 추론 코드 https://github.com/supertone-inc/supertonic (MIT)
- int8 변환: https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models
