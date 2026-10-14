import { Icon } from './Icon';

export function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button className="icon-btn theme-toggle" aria-label="다크 모드 전환" title="밝기 전환" onClick={onToggle}>
      <Icon name={dark ? 'sun' : 'moon'} size="sm" />
    </button>
  );
}
