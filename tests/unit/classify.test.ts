import { describe, expect, it } from 'vitest';
import { classifyTopicKey, getDemoAnswer } from '../../src/data/demoTopics';

const cases: [string, string][] = [
  // 추천 질문 / 용어 카드 (UI에 노출되는 질문)
  ['건폐율이 뭐야? 계산 예시도 알려줘', 'coverage'],
  ['용적률이란 무엇이고 어떻게 계산해?', 'far'],
  ['다락은 언제 연면적에 포함될까?', 'attic'],
  ['포치와 데크가 건축면적에 포함돼?', 'porch'],
  // 다락 우선
  ['다락 연면적 포함 여부', 'attic'],
  ['연면적에 다락이 포함되나요?', 'attic'],
  ['다락 층고 1.5m면 면적에 들어가?', 'attic'],
  // 기존 주제 유지
  ['대지 100평에 건폐율 40%면 건물을 몇 평까지 지을 수 있어?', 'coverage'],
  ['건축면적 산정 방법 알려줘', 'coverage'],
  ['연면적 계산은 어떻게 해?', 'far'],
  ['발코니는 건축면적에 포함돼?', 'porch'],
  ['대지 경계선에서 이격거리는 얼마야?', 'setback'],
  ['인접 대지와 거리 기준', 'setback'],
  // 복합 질문: 같은 단계에서는 먼저 등장한 주제
  ['건폐율과 용적률 차이가 뭐야?', 'coverage'],
  ['용적률이랑 건폐율 비교해줘', 'far'],
  ['도로 접한 대지의 건폐율은?', 'coverage'],
  ['도로 이격 거리 알려줘', 'setback'],
  // 매칭 없음
  ['오늘 날씨 어때?', 'other'],
  ['', 'other'],
];

describe('질문 주제 분류 (시연용 규칙)', () => {
  it.each(cases)('%s → %s', (q, key) => {
    expect(classifyTopicKey(q)).toBe(key);
  });

  it('분류 결과는 같은 질문에 항상 같다', () => {
    for (const [q] of cases) expect(classifyTopicKey(q)).toBe(classifyTopicKey(q));
  });

  it('getDemoAnswer는 분류 결과와 일치하고 시연(demo) 상태다', () => {
    for (const [q, key] of cases) {
      const a = getDemoAnswer(q);
      expect(a.topicKey).toBe(key);
      expect(a.verification).toBe('demo');
      expect(a.isFallback).toBe(key === 'other');
    }
  });

  it('매칭 없는 질문은 법령 출처를 만들어내지 않는다', () => {
    expect(getDemoAnswer('오늘 날씨 어때?').sources).toHaveLength(0);
  });
});
