'use client'

import { Toolbar } from './Toolbar'
import { DevicePalette } from './DevicePalette'
import { Canvas } from './Canvas'
import { Inspector } from './Inspector'

export function Editor({ projectId }: { projectId: string | null }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <Toolbar projectId={projectId} />
      <div className="flex flex-1 overflow-hidden">
        <DevicePalette />
        <Canvas />
        <Inspector />
      </div>
    </div>
  )
}
