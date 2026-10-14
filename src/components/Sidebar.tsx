import { Icon } from './Icon';
import { ThemeToggle } from './ThemeToggle';
import type { NavKey } from '../types/ui';

interface Props { active: NavKey; onNav: (k: NavKey) => void; dark: boolean; onToggleTheme: () => void }

const ITEMS: { key: NavKey; label: string; icon: 'home' | 'search' | 'bookmark' | 'calc'; hint?: string }[] = [
  { key: 'home', label: '홈', icon: 'home' },
  { key: 'search', label: '법령 검색', icon: 'search', hint: 'AI' },
  { key: 'saved', label: '저장한 답변', icon: 'bookmark' },
  { key: 'calc', label: '빠른 계산기', icon: 'calc' },
];

export function Sidebar({ active, onNav, dark, onToggleTheme }: Props) {
  return (
    <aside className="sidebar" aria-label="사이드 메뉴">
      <div className="logo"><span className="logo-mark"><Icon name="home" size="lg" /></span><div className="logo-word-wrap"><div className="logo-word">아키로<span style={{ color: '#597CE0' }}>.</span></div><div className="logo-caption">ARCHI LAW NOTES</div></div></div>
      <div className="nav-section-label">WORKSPACE</div>
      <nav className="nav">
        {ITEMS.map((i) => (
          <button key={i.key} className={`nav-item${active === i.key ? ' active' : ''}`} aria-label={i.label} onClick={() => onNav(i.key)}>
            <Icon name={i.icon} /><span className="nav-label">{i.label}</span>{i.hint && <span className="nav-hint">{i.hint}</span>}
          </button>
        ))}
      </nav>
      <div className="nav-section-label" style={{ marginTop: 32 }}>REFERENCE</div>
      <nav className="nav"><button className={`nav-item${active === 'guide' ? ' active' : ''}`} aria-label="사용 안내" onClick={() => onNav('guide')}><Icon name="book" /><span className="nav-label">이용 안내</span></button></nav>
      <div className="sidebar-spacer"></div>
      <div className="side-note"><Icon name="spark" size="lg" style={{ color: '#6B83DA' }} /><div className="mini-title">나만의 건축법 비서</div><p>어려운 건축법도 평소 말투로 질문해 보세요.</p></div>
      <div className="sidebar-foot"><div className="avatar">나</div><div className="user-copy"><strong>개인 작업공간</strong><span>Private workspace</span></div><ThemeToggle dark={dark} onToggle={onToggleTheme} /></div>
    </aside>
  );
}
