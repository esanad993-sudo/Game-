type Handler = (data: any) => void

export class EventBus {
  private handlers = new Map<string, Set<Handler>>()

  on(topic: string, handler: Handler): () => void {
    let set = this.handlers.get(topic)
    if (!set) {
      set = new Set()
      this.handlers.set(topic, set)
    }
    set.add(handler)
    return () => {
      set!.delete(handler)
      if (set!.size === 0) this.handlers.delete(topic)
    }
  }

  emit(topic: string, data: any): void {
    const set = this.handlers.get(topic)
    if (!set) return
    for (const handler of Array.from(set)) {
      try {
        handler(data)
      } catch (err) {
        console.error(`[EventBus] handler error on "${topic}":`, err)
      }
    }
  }

  clear(): void {
    this.handlers.clear()
  }

  listenerCount(topic: string): number {
    return this.handlers.get(topic)?.size ?? 0
  }
}
