# 법령 MCP 검토

조사일: 2026-10-14. 출처는 각 GitHub 저장소 README(요약 도구 경유)와 검색 결과이며, **코드 자체를 읽거나 실행해 검증하지는 않았다.** star 수·기능은 변할 수 있으므로 채택 전 직접 확인한다.

## 후보
| 후보 | 언어 / 라이선스 | 특징 | 비고 |
|---|---|---|---|
| [chrisryugj/korean-law-mcp](https://github.com/chrisryugj/korean-law-mcp) | TypeScript / MIT | star 약 2.7k, 커밋 470, 최신 v4.15.8. `search_law`, `get_law_text`(기준일 `efYd` 지원), `get_annexes`, 인용 검증 등. `LAW_OC` 환경변수. 검색 1시간·조문 24시간 캐시. 로컬 stdio/HTTP(127.0.0.1) | **제3자 호스팅 엔드포인트(`mcp.gomdori.app/law`)가 있음 — 질의와 키가 그 서버를 거침**. 라이브러리로 import 가능한지는 미확인 |
| [rubatoyd/law-openapi-mcp](https://github.com/rubatoyd/law-openapi-mcp) | Python / MIT | 72개 데이터 종류, `eflaw` 포함. `law_status`로 OC 연결 점검. HTTP 200 오류 같은 API 특이사항을 문서화 | star 0, 신생. 조문을 개별 레코드로 분리하지 않음(본문 일괄) |
| [rabqatab/LexLink-ko-mcp](https://github.com/rabqatab/LexLink-ko-mcp) | Python / 라이선스 미확인 | 54개 도구. `eflaw_search/eflaw_service`는 시행일 기준, `law_search/law_service`는 공포일 기준으로 구분. stdio/HTTP | star 2. 라이선스 확인 필요 |
| finalchild/law-mcp | — | Claude Code 한정 동작(실험적) | 범용성 낮음 |
| SeoNaRu/korean-law-mcp, ChangooLee/mcp-kr-legislation | — | 법령·판례 통합 | 미조사 |

## 결론 (제안)
1. **정본 경로는 직접 구현한 `LawGoKrAdapter`.** 이유: 우리가 필요한 것은 (a) 법령ID·일련번호·시행일·조문번호를 분리한 정규화 모델, (b) 실패를 성공으로 위장하지 않는 오류 규약, (c) 출처 메타데이터 — 범용 MCP 도구가 문자열 위주로 반환하면 이를 다시 파싱해야 한다. MCP를 거치면 한 겹 더 늘어 장애·버전 불일치 지점도 늘어난다.
2. **MCP는 두 방향으로 활용.**
   - *우리 서비스를 MCP로 노출*: `/v1/legal/*`를 MCP 도구(`search_law`, `get_articles`)로 감싸 Claude 등에서 쓰게 한다(Phase 2 후반, 선택).
   - *외부 MCP는 참고·비교용*: korean-law-mcp를 **로컬 stdio로만** 띄워 우리 어댑터 결과와 대조(정합성 검증)한다. 그 구현의 `efYd`·부칙·시행예정 처리 방식은 설계 참고 가치가 크다(MIT라 참조 가능).
3. **채택하지 않는 것**: 제3자 호스팅 MCP 엔드포인트. 개인정보 가능 질의와 OC가 외부로 나간다.
4. **재검토 조건**: 팀이 이미 특정 MCP를 쓰고 있거나, 우리 어댑터 유지 비용이 커질 때. 그 경우에도 `LawSourceAdapter` 인터페이스 뒤에 MCP 어댑터를 추가하는 방식이라 UI·`/v1` 계약은 바뀌지 않는다.

## 확인이 필요한 것 (연결 후)
- korean-law-mcp의 `get_law_text` 결과 구조(조문 분해 여부)와 우리 probe 원본 응답의 일치 여부
- 각 MCP의 OC 사용 규정(IP 등록 포함)과 법제처 이용약관 상 재배포·호스팅 제한
