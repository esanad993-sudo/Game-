'use client'

import { useRef, useCallback } from 'react'
import type { DeviceDefinition } from '@/lib/runtime'
import { useEditorStore } from '@/lib/editor/store'
import { NODE_W, HEADER_H, PORT_SPACING, nodeHeight, portPosition } from '@/lib/editor/geometry'

const CATEGORY_BORDER: Record<string, string> = {
  trigger: 'border-emerald-500/40',
  logic: 'border-sky-500/40',
  action: 'border-amber-500/40',
  world: 'border-violet-500/40',
  quiz: 'border-rose-500/40',
}

const CATEGORY_HEADER_BG: Record<string, string> = {
  trigger: 'bg-emerald-500/10 text-emerald-300',
  logic: 'bg-sky-500/10 text-sky-300',
  action: 'bg-amber-500/10 text-amber-300',
  world: 'bg-violet-500/10 text-violet-300',
  quiz: 'bg-rose-500/10 text-rose-300',
}

interface Props {
  instanceId: string
  def: DeviceDefinition
  position: [number, number]
  properties: Record<string, any>
  selected: boolean
}

export function DeviceNode({ instanceId, def, position, properties, selected }: Props) {
  const selectDevice = useEditorStore((s) => s.selectDevice)
  const moveDevice = useEditorStore((s) => s.moveDevice)
  const removeDevice = useEditorStore((s) => s.removeDevice)
  const startWire = useEditorStore((s) => s.startWire)
  const addWire = useEditorStore((s) => s.addWire)
  const drawingWire = useEditorStore((s) => s.drawingWire)

  const dragOffset = useRef<{ dx: number; dy: number } | null>(null)
  const instance = { id: instanceId, type: def.type, position, properties }
  const h = nodeHeight(def)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).dataset.port) return
      selectDevice(instanceId)
      const startX = e.clientX
      const startY = e.clientY
      const origX = position[0]
      const origY = position[1]
      dragOffset.current = { dx: 0, dy: 0 }

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        moveDevice(instanceId, [origX + dx, origY + dy])
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        dragOffset.current = null
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      e.stopPropagation()
    },
    [instanceId, position, moveDevice, selectDevice],
  )

  const onPortPointerDown = useCallback(
    (e: React.PointerEvent, side: 'input' | 'output', portName: string) => {
      e.stopPropagation()
      const portPos = portPosition(instance, def, side, portName)
      if (!portPos) return

      if (side === 'output') {
        selectDevice(instanceId)
        startWire(instanceId, portName, portPos)
        return
      }

      if (drawingWire && drawingWire.fromDeviceId !== instanceId) {
        addWire(
          { deviceId: drawingWire.fromDeviceId, port: drawingWire.fromPort },
          { deviceId: instanceId, port: portName },
        )
      }
    },
    [instance, def, instanceId, drawingWire, selectDevice, startWire, addWire],
  )

  const inputs = Object.keys(def.inputs)
  const outputs = Object.keys(def.outputs)

  return (
    <div
      onPointerDown={onPointerDown}
      className={`absolute select-none rounded-lg border-2 bg-slate-900 shadow-lg transition-shadow ${selected ? 'border-teal-400 ring-2 ring-teal-400/30' : CATEGORY_BORDER[def.category] ?? 'border-slate-700'} ${selected ? 'shadow-teal-500/20' : ''}`}
      style={{ left: position[0], top: position[1], width: NODE_W, height: h }}
    >
      <div
        className={`flex items-center gap-2 rounded-t-md px-2.5 ${CATEGORY_HEADER_BG[def.category] ?? 'bg-slate-800 text-slate-200'}`}
        style={{ height: HEADER_H }}
      >
        <span className="text-base">{def.icon}</span>
        <span className="truncate text-xs font-semibold uppercase tracking-wide">{def.name}</span>
        {selected && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => removeDevice(instanceId)}
            className="ml-auto rounded px-1.5 text-slate-400 hover:bg-rose-500/30 hover:text-rose-200"
            title="Delete (or press Delete)"
          >
            ×
          </button>
        )}
      </div>

      <div className="relative" style={{ height: h - HEADER_H }}>
        {inputs.map((name, idx) => {
          const y = idx * PORT_SPACING + PORT_SPACING / 2
          return (
            <div
              key={name}
              data-port={`in:${name}`}
              onPointerDown={(e) => onPortPointerDown(e, 'input', name)}
              className="group absolute flex items-center gap-1.5"
              style={{ left: 0, top: y, transform: 'translate(-50%, -50%)' }}
            >
              <div
                className={`rounded-full border-2 border-emerald-300 bg-slate-800 transition group-hover:bg-emerald-400 ${drawingWire ? 'h-4 w-4' : 'h-3.5 w-3.5'}`}
              />
              <span className="ml-1 text-[11px] text-slate-300">{name}</span>
            </div>
          )
        })}

        {outputs.map((name, idx) => {
          const y = idx * PORT_SPACING + PORT_SPACING / 2
          return (
            <div
              key={name}
              data-port={`out:${name}`}
              onPointerDown={(e) => onPortPointerDown(e, 'output', name)}
              className="group absolute flex items-center gap-1.5"
              style={{ left: NODE_W, top: y, transform: 'translate(-50%, -50%)' }}
            >
              <span className="mr-1 text-[11px] text-slate-300">{name}</span>
              <div
                className="rounded-full border-2 border-sky-300 bg-slate-800 transition group-hover:bg-sky-400 h-3.5 w-3.5"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
