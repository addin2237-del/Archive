# Phase 2 설계 — 공식 법령 검색 서비스 (원문 조회까지)

> 상태: **설계 단계 (B)**. 법제처 API 실제 응답을 아직 확인하지 못했다. 이 문서의 *법제처 원본 필드명·파라미터는 가정이며*
> `scripts/probe-law-api.mjs`로 실제 응답을 기록한 뒤 확정한다. 우리가 정의하는 **정규화 모델(§3)과 `/v1` 계약(§2)** 은 법제처 응답과 무관하게 고정한다.
> 범위: 법령 **원문 검색·조문·시행일 조회**까지. AI 해설, 토큰·비용 집계는 Phase 3.

## 1. 구성

```
[React UI / 미래 견적·상담 프로그램]
              │  공통 API /v1 (버전 고정, 구조화된 오류·출처 메타데이터)
              ▼
[Legal Service  (modular monolith, Node/TypeScript)]
   ├─ routes      /v1/legal/*            입력 검증, RequestContext 부여
   ├─ LegalSearchService                 질의 → 법령 후보 → 시행일 확정 → 조문 조회 → 검증
   ├─ LawSourceAdapter (interface)
   │     ├─ LawGoKrAdapter               법제처 DRF 직접 호출 (기본·정본 경로)
   │     └─ (선택) 외부 MCP 어댑터        개발·비교용. 정본 경로로 쓰지 않는다
   ├─ Cache                              조건(법령ID·시행일·조문키) 포함 키, 개정 시 무효화
   └─ McpAdapter                         우리 서비스를 MCP 도구로 노출 (서비스 → MCP 방향)
```

원칙
- **UI/타 프로그램은 법제처나 MCP를 직접 부르지 않는다.** 항상 `/v1`을 호출한다.
- **OC 인증값은 서버 환경변수(`LAW_OC`)에서만 읽는다.** 클라이언트 번들·localStorage·로그·응답에 넣지 않는다.
- 법령 조회 실패 시 **추정 답변을 성공으로 반환하지 않는다.** 항상 구조화된 오류 또는 `verification: 'needs-check'`.
- MCP는 검색 도구 연결 규격이다. 정본 데이터 경로는 우리 어댑터이며, MCP는 (a) 우리 서비스를 노출하는 어댑터, (b) 개발 중 비교·탐색 용도로만 쓴다. (`02-mcp-review.md`)

## 2. `/v1` 계약 (Phase 2 범위)

| 메서드·경로 | 용도 |
|---|---|
| `POST /v1/legal/search` | 키워드로 법령 후보 검색 (현행·시행예정 구분) |
| `POST /v1/legal/articles` | 특정 법령 버전의 조문 원문 조회 (조문번호/가지번호 지정, 시행일 지정) |
| `GET  /v1/legal/versions` | 한 법령의 시행일별 버전 목록 (연혁) |
| `GET  /v1/health` | 서비스·법제처 접속·OC 상태 (키 값은 노출하지 않음) |

모든 응답은 `ApiResult<T>` (`src/types`): `{ status:'ok', requestId, data }` 또는 `{ status:'error', requestId, error:{code,message,retryable} }`.
요청 콘텍스트(`requestId, userId, organizationId, clientApp, requestedAt, policyId`)는 **서버가 부여**한다. 개인용은 `local-owner / personal`.
클라이언트가 보낸 userId/orgId는 신뢰하지 않는다. (구현: `src/types/legal.ts`)

### 오류 코드
| code | 의미 | retryable |
|---|---|---|
| `LAW_UPSTREAM_FORBIDDEN` | 법제처 접속 거부 (네트워크 정책·IP 미등록) | 아니오 |
| `LAW_OC_INVALID` | OC 미설정·미승인·권한 없음 | 아니오 |
| `LAW_UPSTREAM_TIMEOUT` / `LAW_UPSTREAM_UNAVAILABLE` | 시간 초과·5xx | 예 |
| `LAW_RATE_LIMITED` | 호출 한도 | 예 |
| `LAW_UPSTREAM_BAD_RESPONSE` | HTTP 200이어도 본문이 오류·비정형·빈 값 (법제처는 오류에도 200을 줄 수 있음 — probe로 확인) | 아니오 |
| `LAW_NOT_FOUND` | 해당 법령·조문 없음 | 아니오 |
| `LAW_VERSION_AMBIGUOUS` | 기준일에 적용되는 버전을 하나로 확정하지 못함 → `needs-check` | 아니오 |
| `INVALID_REQUEST` | 입력 검증 실패 | 아니오 |

## 3. 정규화 모델 — 식별자를 섞지 않는다

법제처에는 서로 다른 식별자가 있고 혼용하면 **엉뚱한 시점의 조문**을 돌려준다. 우리 모델은 이를 별도 필드로 고정한다.

| 우리 필드 | 의미 | 비고 |
|---|---|---|
| `lawId` | 법령ID. 개정되어도 같은 법령이면 유지 | 법령 "종류"를 식별 |
| `mst` | 법령일련번호. **개정 버전마다 다름** | 특정 시점 본문을 식별 |
| `effectiveDate` | 시행일 (YYYY-MM-DD) | 버전이 효력을 갖기 시작한 날 |
| `promulgationDate` / `promulgationNo` | 공포일 / 공포번호 | 시행일과 다름 |
| `articleNo` / `branchNo` | 조 번호 / 가지번호 (예: 제3조의2 → 3, 2) | 문자열 "제55조"만으로 저장하지 않는다 |
| `articleKey` | 조문키 (법제처 조문 고유 식별자가 있으면 사용) | probe로 확인 |
| `sourceType` | 법률/시행령/시행규칙/조례/해석례/참고자료 | 효력을 섞어 표기하지 않는다 |
| `retrievedAt` | 우리가 조회한 시각 | 캐시 TTL·재검증 기준 |

기준일 규칙: 요청에 `asOf`(기준일)가 없으면 **오늘(Asia/Seoul)**. 해당 기준일에 시행 중인 버전 = `effectiveDate ≤ asOf` 중 가장 늦은 시행일.
시행 **예정** 버전은 현행으로 표시하지 않고 별도 `pending` 플래그로 알린다. 하나로 확정이 안 되면 `LAW_VERSION_AMBIGUOUS`.

법령 3종 관계: 건축법(법률) ↔ 건축법 시행령 ↔ 건축법 시행규칙은 **각각 별도 `lawId`**. 한 응답에서 `sourceType`으로 구분해 묶는다.

## 4. 조회 흐름 (`/v1/legal/search` → `/v1/legal/articles`)

1. 입력 검증 (질의 길이·문자, 조문 번호 형식).
2. 법령 후보 검색 → `lawId` 후보. 건축 3종은 허용 목록(설정값)과 대조해 우선 노출.
3. 기준일에 맞는 버전(`mst`, `effectiveDate`) 확정. 불명확하면 `needs-check`.
4. 본문 조회 → 조문 단위로 분해(조/항/호/목, 가지번호 유지).
5. 검증: 법령명·조문번호·시행일·공식 URL이 모두 채워졌는지. 빠지면 `verification:'needs-check'`.
6. 응답: 원문 + `LegalSource[]`(출처 메타데이터). 법령 원문 검색만으로는 AI 호출 0회, 비용 0원.

## 5. 캐시
- 키: `{lawId, mst|effectiveDate, articleKey|query, sourceType}`. **법령 버전이 키에 포함**되므로 개정 시 새 키가 생긴다.
- TTL: 본문(특정 `mst`)은 길게, 검색·"현행 버전 확인"은 짧게. 값은 설정으로 둔다.
- 캐시된 응답도 `retrievedAt`을 유지해 UI가 조회 시점을 표시한다.

## 6. 보안·운영
- OC는 비밀이 아니라는 의견도 있으나(요청 URL에 노출) **IP/도메인 등록과 묶인 인증값**이므로 서버 설정으로만 관리하고 로그에서 마스킹한다.
- 입력은 길이·문자 검증. 법제처로 나가는 질의에 사용자의 개인정보(주소·성명·연락처)를 넣지 않는다 (Phase 3 마스킹 정책의 선행 규칙).
- 외부 호스팅 MCP(제3자 서버)로는 **질의와 OC를 보내지 않는다.**
- 타임아웃·재시도(지수 백오프, 최대 2회)·동시 호출 상한을 둔다. 법제처 호출 한도를 로컬에서 추적한다.
- 정본 호출은 서버 → law.go.kr 직접. 브라우저 CORS 우회 용도의 공개 프록시를 만들지 않는다.

## 6.1 알려진 위험
- 클라우드 컨테이너의 외부 IP가 바뀌면 IP 기반 OC 등록과 맞지 않을 수 있다 → 개발은 `03-setup-guide.md`의 확인 절차로 먼저 검증, 운영 IP가 고정된 환경에서 재등록.
- 법제처 JSON/XML 필드명·중첩 구조는 문서와 실제가 다를 수 있다 → 실제 응답을 `tests/fixtures/law/raw/`에 보관하고 그 기준으로 매핑·테스트한다.

## 7. Phase 2 구현 순서 (연결 확인 후)
1. `probe-law-api.mjs` 실행 → 원본 응답 보관 (이 단계에서 가정 검증)
2. 서버 골격(`server/`): config(`LAW_OC`), 로깅(마스킹), `RequestContext`, `ApiResult`
3. `LawGoKrAdapter` + 응답 정규화기 (fixture 기반 단위 테스트)
4. `LegalSearchService` (기준일 버전 확정, 검증 상태)
5. `/v1/legal/*` 라우트 + 계약 테스트
6. UI의 `LegalSearchClient`를 HTTP 클라이언트로 교체 (Mock은 유지: 오프라인 시연)
7. MCP 어댑터(서비스 노출) — 선택

완료 기준: 건축법·시행령·시행규칙에서 지정 조문의 **원문·시행일·공식 URL**을 조회하고, 실패·모호한 경우 추정 없이 오류/`needs-check`를 반환하며, 오류 경로 테스트를 포함해 `npm run test`가 통과한다.
