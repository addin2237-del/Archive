import type { CSSProperties } from 'react';

export type IconName = 'home' | 'search' | 'book' | 'bookmark' | 'calc' | 'arrow' | 'spark' | 'moon' | 'sun' | 'copy' | 'clock' | 'info' | 'file' | 'check' | 'settings' | 'external';

interface Props { name: IconName; size?: 'sm' | 'lg'; style?: CSSProperties }

export function Icon({ name, size, style }: Props) {
  return (
    <svg className={`icon${size ? ` ${size}` : ''}`} style={style}>
      <use href={`#i-${name}`} />
    </svg>
  );
}

export function IconSprite() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true" style={{ position: 'absolute', overflow: 'hidden' }}>
      <symbol id="i-home" viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 21v-7h6v7" /></symbol>
      <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></symbol>
      <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 19.5V5a2 2 0 0 1 2-2h14v17H6a2 2 0 0 1 0-4h14" /><path d="M8 7h8M8 11h5" /></symbol>
      <symbol id="i-bookmark" viewBox="0 0 24 24"><path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4z" /></symbol>
      <symbol id="i-calc" viewBox="0 0 24 24"><rect x="5" y="2.5" width="14" height="19" rx="2" /><path d="M8 6h8v4H8zM8 14h1m3 0h1m3 0h0M8 18h1m3 0h1m3 0h0" /></symbol>
      <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" /></symbol>
      <symbol id="i-spark" viewBox="0 0 24 24"><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" /></symbol>
      <symbol id="i-moon" viewBox="0 0 24 24"><path d="M20 16a8 8 0 0 1-12-12 8.5 8.5 0 1 0 12 12z" /></symbol>
      <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></symbol>
      <symbol id="i-copy" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></symbol>
      <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></symbol>
      <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 11v6m0-10h.01" /></symbol>
      <symbol id="i-file" viewBox="0 0 24 24"><path d="M5 2h10l4 4v16H5zM15 2v5h4M8 12h8M8 16h7" /></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></symbol>
      <symbol id="i-settings" viewBox="0 0 24 24"><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" /><circle cx="16" cy="17" r="2" fill="currentColor" stroke="none" /></symbol>
      <symbol id="i-external" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M20 14v6H4V4h6" /></symbol>
    </svg>
  );
}
