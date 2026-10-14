# 합성(synthetic) 테스트 데이터

**이 폴더의 데이터는 실제 법제처 API 응답이 아닙니다.** 모든 파일은 `_meta.synthetic: true`, `verifiedAgainstLiveApi: false`를 가집니다.

- 공식 문서(open.law.go.kr)를 직접 확인하지 못해, 제3자 MCP 구현과 일반 지식을 바탕으로 **가정한** 필드 구조입니다.
- 법령ID·일련번호는 `SYN-`으로 시작하고, 조문 본문은 `[합성 …]`으로 표시해 실제 법령과 혼동되지 않게 했습니다.
- 용도: 파서·어댑터·서비스의 오류 처리와 식별자 구분 로직 테스트.
- 실제 응답은 `node scripts/probe-law-api.mjs`가 `../raw/`에 보관하며, 이 폴더와 섞지 않습니다.
