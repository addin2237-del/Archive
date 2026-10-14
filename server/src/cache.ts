/** 단순 TTL 캐시. 키에 법령 버전(mst)이 들어가므로 개정되면 새 키가 생겨 자연스럽게 갱신된다. */
export class TtlCache<V> {
  private readonly map = new Map<string, { v: V; exp: number }>();
  constructor(private readonly now: () => number = Date.now) {}
  get(key: string): V | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.exp <= this.now()) { this.map.delete(key); return undefined; }
    return e.v;
  }
  set(key: string, v: V, ttlMs: number): void { this.map.set(key, { v, exp: this.now() + ttlMs }); }
  get size(): number { return this.map.size; }
}
