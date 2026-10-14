import { Icon } from './Icon';
import { ThemeToggle } from './ThemeToggle';

interface Props { breadcrumb: string; modelStatus: string; dark: boolean; onToggleTheme: () => void }

export function Header({ breadcrumb, modelStatus, dark, onToggleTheme }: Props) {
  return (
    <header className="topbar">
      <div className="mobile-header"><span className="logo-mark"><Icon name="home" /></span><strong>아키로.</strong></div>
      <div className="breadcrumbs"><span>내 작업공간</span><span>›</span><strong id="breadcrumb">{breadcrumb}</strong></div>
      <div className="top-actions"><span className="model-status" id="modelTopStatus">{modelStatus}</span><span className="demo-pill"><span className="demo-dot"></span> UI 시연 모드</span><span className="top-divider"></span><ThemeToggle dark={dark} onToggle={onToggleTheme} /></div>
    </header>
  );
}
