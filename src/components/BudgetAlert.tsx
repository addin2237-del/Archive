import { Icon } from './Icon';

// 50% 안내 / 80% 경고 / 100% 차단 (임계치는 월간 사용률 기준)
export function BudgetAlert({ pct }: { pct: number }) {
  return (
    <div className={`usage-alert${pct >= 50 ? ' visible' : ''}`} id="usageAlert" role="status" aria-live="polite">
      <Icon name="info" size="sm" style={{ color: '#C58D48' }} />
      <span id="usageAlertText">
        {pct >= 100 ? <><strong>예산 100% 도달</strong> · 유료 AI 요청은 자동 중단됩니다.</>
          : pct >= 80 ? <><strong>월 예산 80% 이상</strong> · 추가 유료 요청 전에 확인하세요.</>
          : pct >= 50 ? <><strong>월 예산 50% 이상</strong> · 사용량을 확인하세요.</> : null}
      </span>
    </div>
  );
}
