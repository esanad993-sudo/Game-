export type ComponentMap = Record<string, any>

export interface Entity {
  id: string
  components: ComponentMap
}

export class World {
  private entities = new Map<string, Entity>()

  spawn(id: string, components: ComponentMap = {}): Entity {
    if (this.entities.has(id)) throw new Error(`Entity already exists: ${id}`)
    const entity: Entity = { id, components: { ...components } }
    this.entities.set(id, entity)
    return entity
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id)
  }

  despawn(id: string): boolean {
    return this.entities.delete(id)
  }

  query(...componentKeys: string[]): Entity[] {
    if (componentKeys.length === 0) return Array.from(this.entities.values())
    return Array.from(this.entities.values()).filter((e) =>
      componentKeys.every((k) => k in e.components),
    )
  }

  snapshot(): Entity[] {
    return Array.from(this.entities.values()).map((e) => ({
      id: e.id,
      components: { ...e.components },
    }))
  }

  clear(): void {
    this.entities.clear()
  }
}
