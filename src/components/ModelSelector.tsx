import { Icon } from './Icon';
import type { AIModelOption } from '../types';

interface Props { models: AIModelOption[]; value: string; onChange: (id: string) => void }

export function ModelSelector({ models, value, onChange }: Props) {
  return (
    <div className="ai-select-row">
      <div className="ai-provider-copy"><Icon name="spark" size="sm" style={{ color: '#7890cb' }} /> AI 답변 모델 <span className="ai-provider-note">현재 선택만 가능 · 실제 API 미연결</span></div>
      <div className="ai-provider-control">
        <select id="modelSelect" aria-label="AI 모델 선택" value={value} onChange={(e) => onChange(e.target.value)}>
          {models.map((m) => <option key={m.id} value={m.id}>{m.optionLabel}</option>)}
        </select>
      </div>
    </div>
  );
}
