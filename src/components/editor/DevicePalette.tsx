'use client'

import { BUILTIN_DEVICES } from '@/lib/editor/store'
import type { DeviceCategory } from '@/lib/runtime'

const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  trigger: 'Triggers',
  logic: 'Logic',
  action: 'Actions',
  world: 'World',
  quiz: 'Quiz',
}

const CATEGORY_COLORS: Record<DeviceCategory, string> = {
  trigger: 'bg-emerald-500/10 border-emerald-500/30',
  logic: 'bg-sky-500/10 border-sky-500/30',
  action: 'bg-amber-500/10 border-amber-500/30',
  world: 'bg-violet-500/10 border-violet-500/30',
  quiz: 'bg-rose-500/10 border-rose-500/30',
}

const CATEGORY_ACCENTS: Record<DeviceCategory, string> = {
  trigger: 'text-emerald-300',
  logic: 'text-sky-300',
  action: 'text-amber-300',
  world: 'text-violet-300',
  quiz: 'text-rose-300',
}

export function DevicePalette() {
  const byCategory = BUILTIN_DEVICES.reduce<Record<string, typeof BUILTIN_DEVICES>>(
    (acc, def) => {
      ;(acc[def.category] ??= []).push(def)
      return acc
    },
    {},
  )

  return (
    <aside className="flex w-60 flex-col overflow-y-auto border-r border-slate-800 bg-slate-950 p-3">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Devices
      </h2>

      {(Object.keys(CATEGORY_LABELS) as DeviceCategory[]).map((cat) => {
        const devices = byCategory[cat]
        if (!devices?.length) return null
        return (
          <div key={cat} className="mb-4">
            <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wider ${CATEGORY_ACCENTS[cat]}`}>
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="space-y-1.5">
              {devices.map((def) => (
                <div
                  key={def.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-gameforge-device', def.type)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  className={`group flex cursor-grab items-center gap-2 rounded-md border ${CATEGORY_COLORS[def.category]} px-2.5 py-2 transition active:cursor-grabbing hover:border-slate-500`}
                  title={def.description}
                >
                  <span className="text-lg">{def.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-100">{def.name}</span>
                    <span className="text-[10px] leading-tight text-slate-500 line-clamp-2">
                      {def.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="mt-auto rounded-md border border-slate-800 bg-slate-900 p-2 text-[10px] leading-relaxed text-slate-500">
        <strong className="text-slate-300">Tips:</strong>
        <br />
        • Drag a device onto the canvas.
        <br />
        • Click an output port (●) then an input port to wire.
        <br />
        • Click a device to edit its properties.
        <br />
        • Delete key removes the selected device.
      </div>
    </aside>
  )
}
