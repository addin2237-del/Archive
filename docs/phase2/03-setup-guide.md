# 접속 환경 준비 (사용자 직접 설정)

실제 법령 응답을 받으려면 아래 세 가지가 필요하다. 어느 것도 채팅에 키를 붙여넣지 않는다.

## 1. 법제처 도메인 허용 (Claude 클라우드 환경)
1. 세션 제목 줄의 **클라우드 환경 메뉴 → Edit → Network access**
2. 접근 수준을 넓히거나, **Allowed domains**에 추가:
   - `www.law.go.kr`
   - `open.law.go.kr`
3. 문서: https://code.claude.com/docs/en/cloud-environments#network-access
4. **새 세션**부터 반영될 수 있다.

## 2. OC 인증값 신청
1. 국가법령정보 공동활용 (https://open.law.go.kr) 회원가입 → **OPEN API 신청**
2. 신청 시 **서버 IP 또는 도메인**을 등록하는 항목이 있다. 클라우드 컨테이너는 외부 IP가 바뀔 수 있어, 처음에는 **호출이 거부될 수 있다.** 거부되면 그 응답(코드/메시지)을 알려 달라 — 고정 IP가 있는 환경(운영 서버 등)을 정해야 한다.
3. 승인 후 사용하는 OC 값은 보통 신청 시 지정한 ID(이메일 @ 앞부분)다.
4. 신청 화면의 **허용 API 목록**에 아래가 포함되는지 확인: 현행법령(시행일) 목록/본문, 법령 목록/본문.

## 3. OC를 환경변수로 등록
1. **클라우드 환경 메뉴 → Edit**에서 *Network secrets* 섹션이 있으면 거기에, 없으면 **환경 변수**로 추가
2. 이름: **`LAW_OC`**
3. 새 세션에서 읽힌다.

## 4. 연결 확인 (제가 실행)
새 세션에서 아래를 실행하면 접속·OC·응답 구조를 점검하고 원본 응답을 보관한다.
```bash
node scripts/probe-law-api.mjs
```
- OC 값은 출력·보관 파일에서 `***`로 마스킹된다.
- 결과: `tests/fixtures/law/raw/*` (원본 응답) + `tests/fixtures/law/probe-report.json` (HTTP 상태, 형식, 오류 판정)
- 이 결과로 `01-design.md §6.1`의 가정을 검증한 뒤 구현에 들어간다.
