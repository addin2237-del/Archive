import type { LawVersionRef } from '../types/legal';

/** 오늘 날짜(YYYY-MM-DD, Asia/Seoul). 기준일이 없을 때의 기본값. */
export const todaySeoul = (now: Date = new Date()): string => now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

export const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export type VersionPick =
  | { status: 'ok'; version: LawVersionRef; pending: LawVersionRef[] }
  | { status: 'none' } // 기준일에 시행 중인 버전 없음
  | { status: 'ambiguous'; candidates: LawVersionRef[] }; // 같은 시행일에 서로 다른 일련번호

/**
 * 기준일(asOf)에 적용되는 버전을 고른다: effectiveDate ≤ asOf 중 가장 늦은 시행일.
 * 기준일 이후 시행 예정 버전은 pending으로 분리한다 (현행으로 표시하지 않는다).
 * 같은 시행일에 일련번호가 다른 버전이 둘 이상이면 하나로 확정하지 않고 ambiguous.
 */
export function pickVersionAsOf(versions: LawVersionRef[], asOf: string): VersionPick {
  const inForce = versions.filter((v) => v.effectiveDate <= asOf);
  const pending = versions.filter((v) => v.effectiveDate > asOf).sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  if (inForce.length === 0) return { status: 'none' };
  const latest = inForce.reduce((m, v) => (v.effectiveDate > m ? v.effectiveDate : m), inForce[0].effectiveDate);
  const top = inForce.filter((v) => v.effectiveDate === latest);
  const distinct = new Set(top.map((v) => v.mst));
  if (distinct.size > 1) return { status: 'ambiguous', candidates: top };
  return { status: 'ok', version: top[0], pending };
}
