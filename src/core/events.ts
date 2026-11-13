/** Tiny typed event emitter. Events with a `void` payload are emitted without arguments. */
export class Emitter<E extends object> {
  private handlers: { [K in keyof E]?: Set<(payload: E[K]) => void> } = {};

  on<K extends keyof E>(event: K, fn: (payload: E[K]) => void): () => void {
    const set = (this.handlers[event] ??= new Set<(payload: E[K]) => void>());
    set.add(fn);
    return () => {
      set.delete(fn);
    };
  }

  emit<K extends keyof E>(event: K, ...payload: E[K] extends void ? [] : [E[K]]): void {
    this.handlers[event]?.forEach((fn) => fn(payload[0] as E[K]));
  }
}
