export function Toast({ message, show }: { message: string; show: boolean }) {
  return <div className={`toast${show ? ' show' : ''}`} role="status" aria-live="polite" id="toast">{message}</div>;
}
