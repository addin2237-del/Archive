import type { LegalAnswer, LegalSource } from '../types';

// 시연 전용 예시 답변. 공식 API 조회나 AI 검증을 거치지 않은 데이터다.
interface Topic {
  key: string;
  primary: string[]; // 주제를 직접 가리키는 용어 (예: 다락, 건폐율)
  secondary: string[]; // 여러 주제에 걸칠 수 있는 보조 용어 (예: 연면적, 건축면적)
  title: string;
  lead: { text: string; strong?: boolean }[];
  graphic: string;
  label: string;
  value: string;
  pyeong?: boolean;
  copy: string;
  strip: number;
  points: string[];
  source: string;
  law?: { lawName: string; article: string };
  steps: string[];
}

const TOPICS: Topic[] = [
  { key: 'coverage', primary: ['건폐율'], secondary: ['건축면적'], title: '건폐율은 대지에서 건물이 차지하는 비율이에요.',
    lead: [{ text: '건폐율은 ' }, { text: '건축면적 ÷ 대지면적 × 100', strong: true }, { text: '으로 계산하는 비율입니다. 같은 땅이라도 용도지역과 조례에 따라 허용되는 기준이 달라질 수 있어요.' }],
    graphic: '40평', label: '100평 대지 · 건폐율 40% 가정', value: '40', pyeong: true, copy: '전체 대지 100평 중 건축면적을 40평으로 가정한 단순 계산', strip: 40,
    points: ['건폐율은 건축면적을 기준으로 계산합니다.', '2층을 올리더라도 건폐율과 용적률은 별도로 검토해야 합니다.'],
    source: '건축법 제55조 (건축물의 건폐율)', law: { lawName: '건축법', article: '제55조' },
    steps: ['대지의 용도지역·지구 및 지구단위계획 확인', '해당 지자체 건축조례와 특례 적용 여부 확인', '건축면적 산정 방식과 실제 인허가 조건 별도 검토'] },
  { key: 'far', primary: ['용적률'], secondary: ['연면적'], title: '용적률은 대지에 비해 얼마나 넓게 지을 수 있는지를 보는 비율이에요.',
    lead: [{ text: '용적률은 ' }, { text: '용적률 산정에 사용하는 연면적 ÷ 대지면적 × 100', strong: true }, { text: '으로 계산합니다. 연면적 전체가 항상 그대로 산입되는 것은 아니므로 제외 규정도 확인해야 합니다.' }],
    graphic: '100평', label: '100평 대지 · 용적률 100% 가정', value: '100', pyeong: true, copy: '용적률 산정 대상 연면적의 단순 계산 예시', strip: 100,
    points: ['건폐율과 용적률은 서로 다른 개념입니다.', '연면적 산정에서 제외되는 부분이 있는지 확인해야 합니다.'],
    source: '건축법 제56조 (건축물의 용적률)', law: { lawName: '건축법', article: '제56조' },
    steps: ['적용 용도지역 및 용적률 확인', '연면적 산정 제외 대상 확인', '지자체 조례 및 지구단위계획 확인'] },
  { key: 'attic', primary: ['다락'], secondary: ['층고'], title: '다락은 높이와 구조 등에 따라 면적 산정을 검토해야 해요.',
    lead: [{ text: '다락의 바닥면적 산정은 ' }, { text: '단순히 이름을 다락이라고 붙이는 것으로 결정되지 않습니다.', strong: true }, { text: ' 실제 층고와 지붕 형태, 관련 기준을 확인해야 합니다.' }],
    graphic: '조건', label: '다락 면적 검토', value: '확인', copy: '치수 및 단면 정보가 있어야 정확한 기준 검토 가능', strip: 32,
    points: ['평균 높이 등 적용 기준을 원문으로 확인해야 합니다.', '관할 허가권자의 적용 기준도 확인하는 편이 안전합니다.'],
    source: '건축법 시행령 제119조 (면적 등의 산정방법)', law: { lawName: '건축법 시행령', article: '제119조' },
    steps: ['지붕 형태와 단면 치수 확인', '최신 시행령의 바닥면적 산정 기준 확인', '관련 지자체 운영 기준 확인'] },
  { key: 'porch', primary: ['포치', '데크'], secondary: ['처마', '발코니'], title: '포치와 데크는 형태에 따라 면적 포함 여부가 달라질 수 있어요.',
    lead: [{ text: '건축면적 포함 여부는 ' }, { text: '지붕, 기둥, 돌출 정도, 구조적 형태', strong: true }, { text: ' 등에 따라 검토합니다. 현장 사진과 도면을 함께 확인하면 더 정확합니다.' }],
    graphic: '도면', label: '구조 형태별 검토', value: '확인', copy: '지붕·기둥·돌출 구조에 따라 판단이 달라질 수 있음', strip: 32,
    points: ['용어보다 실제 건축물의 형태가 중요합니다.', '바닥면적과 건축면적 산정 기준을 구분해야 합니다.'],
    source: '건축법 시행령 제119조 (면적 등의 산정방법)', law: { lawName: '건축법 시행령', article: '제119조' },
    steps: ['포치·데크의 지붕과 기둥 유무 확인', '건축면적 및 바닥면적 산정 기준 구분', '허가권자 기준 확인'] },
  { key: 'setback', primary: ['이격'], secondary: ['경계선', '인접', '도로'], title: '이격거리는 대지 경계와 다양한 기준을 함께 봐야 해요.',
    lead: [{ text: '대지 경계선과 건축물 간 거리에는 ' }, { text: '지역별 건축조례, 용도지역 및 건축물 용도', strong: true }, { text: ' 등이 관계할 수 있습니다. 주소와 대지 조건이 필요합니다.' }],
    graphic: '주소', label: '현장별 조건 검토', value: '확인', copy: '지역·대지 조건 없이 거리 확정 불가', strip: 32,
    points: ['법령 일반 기준과 지자체 조례를 함께 조회해야 합니다.', '건축선, 접도 및 인접대지 조건도 검토합니다.'],
    source: '건축법 제58조 (대지 안의 공지)', law: { lawName: '건축법', article: '제58조' },
    steps: ['대지 소재지와 용도지역 확인', '해당 지자체 건축조례 확인', '배치도 및 대지 경계 조건 확인'] },
];

const OTHER: Topic = {
  key: 'other', primary: [], secondary: [], title: '질문을 받았습니다. 관련 법령 검색은 연결 예정입니다.',
  lead: [{ text: '현재는 ' }, { text: 'UI 디자인을 확인하는 시연 모드', strong: true }, { text: '입니다. 정식 구현에서는 질문을 분석한 뒤 공식 법령 API에서 원문을 조회하고 출처와 함께 답합니다.' }],
  graphic: 'AI', label: '맞춤형 법령 조회', value: '준비', copy: '실제 검색 및 해설 기능 개발 전 화면', strip: 32,
  points: ['정식 버전에서 최신 시행 법령을 조회합니다.', '지역 조례와 적용 조건을 함께 제시할 예정입니다.'],
  source: '관련 법령 자동 검색 예정', steps: ['질문 내용에서 검색 키워드 추출', '법령·시행령·시행규칙·조례 검색', '원문 근거와 적용 조건 표시'],
};

export const DEFAULT_QUESTION = '건폐율이 뭐야? 계산 예시도 알려줘';

/**
 * 시연용 결정적 분류 규칙 (질문 분석 엔진이 아님).
 * 1) 주제를 직접 가리키는 primary 용어가 하나라도 있으면 primary만 비교한다.
 *    없을 때만 secondary 용어를 비교한다. (예: "다락은 연면적에 포함?" → 다락)
 * 2) 같은 단계에서 여러 주제가 겹치면 질문에서 먼저 등장하는 용어의 주제를 고른다.
 *    (예: "건폐율과 용적률 차이" → 건폐율)
 * 3) 위치까지 같으면 TOPICS 배열 순서가 우선한다.
 */
function classify(question: string): Topic {
  for (const tier of ['primary', 'secondary'] as const) {
    let best: { topic: Topic; pos: number } | null = null;
    for (const topic of TOPICS) {
      for (const kw of topic[tier]) {
        const pos = question.indexOf(kw);
        if (pos >= 0 && (best === null || pos < best.pos)) best = { topic, pos };
      }
    }
    if (best) return best.topic;
  }
  return OTHER;
}

export const classifyTopicKey = (question: string): string => classify(question).key;

export function getDemoAnswer(question: string): LegalAnswer {
  const t = classify(question);
  const sources: LegalSource[] = t.law
    ? [{ sourceId: `demo-${t.key}`, sourceType: t.law.lawName.endsWith('시행령') ? '시행령' : '법률', lawName: t.law.lawName, article: t.law.article,
        effectiveDate: null, jurisdiction: '전국', officialUrl: null, retrievedAt: null }]
    : [];
  return {
    question, topicKey: t.key, title: t.title, leadParts: t.lead,
    visual: { graphic: t.graphic, label: t.label, value: t.value, showPyeongUnit: !!t.pyeong, copy: t.copy, stripPercent: t.strip },
    points: t.points, sourceLabel: t.source, sources, reviewSteps: t.steps, verification: 'demo', isFallback: t.key === 'other',
  };
}
