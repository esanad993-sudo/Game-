import { create } from 'zustand'
import type { Project, DeviceInstance, Wire } from '@/lib/runtime'
import { BUILTIN_DEVICES } from '@/lib/runtime'

function uid(prefix = 'd'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function emptyProject(): Project {
  return {
    version: 1,
    name: 'Untitled Project',
    scene: {
      world: { width: 1600, height: 900, background: '#0F172A' },
      devices: [],
      wires: [],
    },
    assets: {},
    scripts: {},
  }
}

interface DrawingWire {
  fromDeviceId: string
  fromPort: string
  fromPos: [number, number]
}

interface EditorState {
  project: Project
  selectedDeviceId: string | null
  drawingWire: DrawingWire | null
  mousePos: [number, number]
  lastSavedAt: number | null

  setProject: (p: Project) => void
  newProject: () => void
  setProjectName: (name: string) => void
  selectDevice: (id: string | null) => void
  addDevice: (type: string, position: [number, number]) => string
  moveDevice: (id: string, position: [number, number]) => void
  removeDevice: (id: string) => void
  updateDeviceProperty: (id: string, key: string, value: any) => void
  addWire: (from: { deviceId: string; port: string }, to: { deviceId: string; port: string }) => void
  removeWire: (id: string) => void
  startWire: (deviceId: string, port: string, pos: [number, number]) => void
  cancelWire: () => void
  setMousePos: (pos: [number, number]) => void
  markSaved: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: emptyProject(),
  selectedDeviceId: null,
  drawingWire: null,
  mousePos: [0, 0],
  lastSavedAt: null,

  setProject: (p) => set({ project: p, selectedDeviceId: null, drawingWire: null }),
  newProject: () => set({ project: emptyProject(), selectedDeviceId: null, drawingWire: null, lastSavedAt: null }),
  setProjectName: (name) => set((s) => ({ project: { ...s.project, name } })),
  selectDevice: (id) => set({ selectedDeviceId: id, drawingWire: null }),

  addDevice: (type, position) => {
    const def = BUILTIN_DEVICES.find((d) => d.type === type)
    if (!def) throw new Error(`Unknown device type: ${type}`)
    const id = uid(type)
    const instance: DeviceInstance = {
      id,
      type,
      position,
      properties: { ...def.defaultProperties },
    }
    set((s) => ({
      project: {
        ...s.project,
        scene: { ...s.project.scene, devices: [...s.project.scene.devices, instance] },
      },
      selectedDeviceId: id,
    }))
    return id
  },

  moveDevice: (id, position) =>
    set((s) => ({
      project: {
        ...s.project,
        scene: {
          ...s.project.scene,
          devices: s.project.scene.devices.map((d) =>
            d.id === id ? { ...d, position } : d,
          ),
        },
      },
    })),

  removeDevice: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        scene: {
          ...s.project.scene,
          devices: s.project.scene.devices.filter((d) => d.id !== id),
          wires: s.project.scene.wires.filter(
            (w) => w.from.deviceId !== id && w.to.deviceId !== id,
          ),
        },
      },
      selectedDeviceId: s.selectedDeviceId === id ? null : s.selectedDeviceId,
    })),

  updateDeviceProperty: (id, key, value) =>
    set((s) => ({
      project: {
        ...s.project,
        scene: {
          ...s.project.scene,
          devices: s.project.scene.devices.map((d) =>
            d.id === id
              ? { ...d, properties: { ...d.properties, [key]: value } }
              : d,
          ),
        },
      },
    })),

  addWire: (from, to) => {
    const exists = get().project.scene.wires.some(
      (w) =>
        w.from.deviceId === from.deviceId &&
        w.from.port === from.port &&
        w.to.deviceId === to.deviceId &&
        w.to.port === to.port,
    )
    if (exists) return
    const wire: Wire = { id: uid('w'), from, to }
    set((s) => ({
      project: {
        ...s.project,
        scene: { ...s.project.scene, wires: [...s.project.scene.wires, wire] },
      },
      drawingWire: null,
    }))
  },

  removeWire: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        scene: {
          ...s.project.scene,
          wires: s.project.scene.wires.filter((w) => w.id !== id),
        },
      },
    })),

  startWire: (deviceId, port, pos) =>
    set({ drawingWire: { fromDeviceId: deviceId, fromPort: port, fromPos: pos } }),
  cancelWire: () => set({ drawingWire: null }),
  setMousePos: (pos) => set({ mousePos: pos }),
  markSaved: () => set({ lastSavedAt: Date.now() }),
}))

export { BUILTIN_DEVICES }
