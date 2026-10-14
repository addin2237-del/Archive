import { describe, expect, it } from 'vitest';
import { isIsoDate, pickVersionAsOf, todaySeoul } from '../../src/domain/legalVersion';
import { LEGAL_ERROR_RETRYABLE } from '../../src/types/legal';
import type { LawVersionRef } from '../../src/types/legal';

const v = (mst: string, effectiveDate: string): LawVersionRef => ({ lawId: 'L1', mst, lawName: '테스트법', sourceType: '법률', effectiveDate, promulgationDate: null, promulgationNo: null });
const versions = [v('1', '2020-01-01'), v('2', '2022-06-30'), v('3', '2025-03-01')];

describe('기준일에 적용되는 버전 선택', () => {
  it('시행일이 기준일 이하인 것 중 가장 늦은 버전', () => {
    const r = pickVersionAsOf(versions, '2023-01-01');
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.version.mst).toBe('2');
  });
  it('기준일이 시행일 당일이면 그 버전 (경계 포함)', () => {
    const r = pickVersionAsOf(versions, '2022-06-30');
    expect(r.status === 'ok' && r.version.mst).toBe('2');
  });
  it('기준일 이후 시행 예정 버전은 pending으로 분리되고 현행이 아니다', () => {
    const r = pickVersionAsOf(versions, '2024-01-01');
    expect(r.status === 'ok' && r.version.mst).toBe('2');
    expect(r.status === 'ok' && r.pending.map((p) => p.mst)).toEqual(['3']);
  });
  it('시행 중인 버전이 없으면 none (임의로 가장 가까운 버전을 고르지 않는다)', () => {
    expect(pickVersionAsOf(versions, '2019-12-31').status).toBe('none');
    expect(pickVersionAsOf([], '2024-01-01').status).toBe('none');
  });
  it('같은 시행일에 일련번호가 다르면 ambiguous', () => {
    const r = pickVersionAsOf([v('1', '2020-01-01'), v('2', '2022-06-30'), v('9', '2022-06-30')], '2023-01-01');
    expect(r.status).toBe('ambiguous');
  });
  it('같은 일련번호가 중복되어도 하나로 확정', () => {
    expect(pickVersionAsOf([v('2', '2022-06-30'), v('2', '2022-06-30')], '2023-01-01').status).toBe('ok');
  });
  it('입력 순서와 무관', () => {
    const r = pickVersionAsOf([...versions].reverse(), '2026-01-01');
    expect(r.status === 'ok' && r.version.mst).toBe('3');
  });
});

describe('날짜 유틸', () => {
  it('todaySeoul은 Asia/Seoul 기준 날짜 (UTC 15:00 이후는 다음 날)', () => {
    expect(todaySeoul(new Date('2026-10-14T14:59:00Z'))).toBe('2026-10-14');
    expect(todaySeoul(new Date('2026-10-14T15:00:00Z'))).toBe('2026-10-15');
  });
  it('isIsoDate', () => {
    expect(isIsoDate('2026-10-14')).toBe(true);
    expect(isIsoDate('2026-13-40')).toBe(false);
    expect(isIsoDate('20261014')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });
});

describe('오류 코드 규약', () => {
  it('접속 거부·OC 오류·비정형 응답은 재시도하지 않는다', () => {
    for (const c of ['LAW_UPSTREAM_FORBIDDEN', 'LAW_OC_INVALID', 'LAW_UPSTREAM_BAD_RESPONSE', 'LAW_VERSION_AMBIGUOUS'] as const) expect(LEGAL_ERROR_RETRYABLE[c]).toBe(false);
  });
  it('시간 초과·장애·한도는 재시도 가능', () => {
    for (const c of ['LAW_UPSTREAM_TIMEOUT', 'LAW_UPSTREAM_UNAVAILABLE', 'LAW_RATE_LIMITED'] as const) expect(LEGAL_ERROR_RETRYABLE[c]).toBe(true);
  });
});
