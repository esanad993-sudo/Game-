'use client'

import { useMemo } from 'react'
import { useEditorStore } from '@/lib/editor/store'
import { BUILTIN_DEVICES } from '@/lib/editor/store'
import { portPosition, wirePath } from '@/lib/editor/geometry'
import type { DeviceInstance, DeviceDefinition } from '@/lib/runtime'

function useDeviceDefMap(): Map<string, { instance: DeviceInstance; def: DeviceDefinition }> {
  const devices = useEditorStore((s) => s.project.scene.devices)
  return useMemo(() => {
    const map = new Map()
    for (const instance of devices) {
      const def = BUILTIN_DEVICES.find((d) => d.type === instance.type)
      if (def) map.set(instance.id, { instance, def })
    }
    return map
  }, [devices])
}

export function WireLayer() {
  const wires = useEditorStore((s) => s.project.scene.wires)
  const removeWire = useEditorStore((s) => s.removeWire)
  const drawingWire = useEditorStore((s) => s.drawingWire)
  const mousePos = useEditorStore((s) => s.mousePos)
  const defMap = useDeviceDefMap()

  const wirePaths = useMemo(() => {
    return wires
      .map((w) => {
        const from = defMap.get(w.from.deviceId)
        const to = defMap.get(w.to.deviceId)
        if (!from || !to) return null
        const p1 = portPosition(from.instance, from.def, 'output', w.from.port)
        const p2 = portPosition(to.instance, to.def, 'input', w.to.port)
        if (!p1 || !p2) return null
        return { id: w.id, d: wirePath(p1, p2), p1, p2 }
      })
      .filter(Boolean) as { id: string; d: string; p1: [number, number]; p2: [number, number] }[]
  }, [wires, defMap])

  const drawingPath = drawingWire ? wirePath(drawingWire.fromPos, mousePos) : null

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ overflow: 'visible' }}
    >
      {wirePaths.map((wire) => (
        <g key={wire.id} className="pointer-events-auto">
          <path
            d={wire.d}
            fill="none"
            stroke="transparent"
            strokeWidth={14}
            className="cursor-pointer"
            onClick={() => removeWire(wire.id)}
          />
          <path
            d={wire.d}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={2}
            className="transition-colors hover:stroke-rose-400"
          />
          <circle cx={wire.p1[0]} cy={wire.p1[1]} r={3} fill="#38bdf8" />
          <circle cx={wire.p2[0]} cy={wire.p2[1]} r={3} fill="#38bdf8" />
        </g>
      ))}

      {drawingPath && (
        <path
          d={drawingPath}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={2}
          strokeDasharray="4 4"
          opacity={0.7}
        />
      )}
    </svg>
  )
}
