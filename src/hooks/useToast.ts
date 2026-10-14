import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast() {
  const [state, setState] = useState({ message: '', show: false });
  const timer = useRef<number>();
  const showToast = useCallback((message: string) => {
    setState({ message, show: true });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState((s) => ({ ...s, show: false })), 2300);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { toast: state, showToast };
}
