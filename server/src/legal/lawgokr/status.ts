/**
 * 실제 법제처 응답으로 parse.ts의 필드 매핑을 확인했는지 여부.
 * `node scripts/probe-law-api.mjs`로 원본을 tests/fixtures/law/raw/에 보관하고,
 * 그 원본으로 매핑 테스트를 통과시킨 뒤에만 true로 바꾼다. (그 전에는 서비스가 'verified'를 내지 않는다.)
 */
export const LIVE_CONTRACT_VERIFIED = false;
