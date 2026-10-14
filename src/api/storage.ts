// localStorage가 막혀 있어도 앱이 중단되지 않도록 모든 접근을 감싼다.
export const safeLoad = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const x = JSON.parse(raw);
    return x == null ? fallback : (x as T);
  } catch {
    return fallback;
  }
};

export const safeSave = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    /* 저장 실패는 무시 */
  }
};

export const safeGetRaw = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
