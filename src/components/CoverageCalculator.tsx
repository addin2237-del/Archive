import { useState } from 'react';
import { Icon } from './Icon';

export function CoverageCalculator() {
  const [area, setArea] = useState('100');
  const [rate, setRate] = useState('40');
  const a = parseFloat(area), r = parseFloat(rate);
  const ok = Number.isFinite(a) && Number.isFinite(r) && a >= 0 && r >= 0 && r <= 100;
  return (
    <section className="surface-card secondary-card" id="calculator">
      <div className="card-topline"><div className="card-title"><Icon name="calc" style={{ color: '#687CB4' }} /> 건폐율 빠른 계산</div><span className="card-hint">단순 산술</span></div>
      <div className="mini-inputs">
        <div className="field"><label htmlFor="siteArea">대지면적</label><div className="field-box"><input id="siteArea" type="number" inputMode="decimal" value={area} min="0" step="any" onChange={(e) => setArea(e.target.value)} /><span>평</span></div></div>
        <div className="field"><label htmlFor="sitePercent">적용 건폐율</label><div className="field-box"><input id="sitePercent" type="number" inputMode="decimal" value={rate} min="0" max="100" step="any" onChange={(e) => setRate(e.target.value)} /><span>%</span></div></div>
      </div>
      <div className="calc-result"><div><div className="result-kicker">계산상 건축면적</div><div className="result-number" id="calcResult">{ok ? <>{(a * r / 100).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span>평</span></> : <span>값을 확인해 주세요</span>}</div></div><Icon name="arrow" size="lg" style={{ color: '#879CDD' }} /></div>
      <div className="calculator-note">입력한 비율로만 계산합니다. 해당 토지의 허용 건폐율을 자동 판단하지 않습니다.</div>
    </section>
  );
}
