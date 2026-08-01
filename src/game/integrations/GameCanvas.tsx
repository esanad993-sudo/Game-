'use client'
// ─── integrations/GameCanvas.tsx ─────────────────────────────────────────────
// A thin React wrapper that drops the optimized engine into the Next.js app.
// React only mounts/unmounts the canvas + forwards props; the actual game loop
// runs entirely on the canvas/engine (no React re-renders per frame), which is
// what keeps it smooth on constrained Chromebooks.

import { useEffect, useRef } from 'react'
import { GameEngine } from '../core/engine'
import { buildAtlas } from '../core/atlas'
import { createRenderer } from '../core/renderer'
import { buildModeModule } from '../modes/runtime'
import { ModeDefinition, ModeHooks, QuestionData } from '../modes/types'

export interface GameCanvasProps {
  definition: ModeDefinition
  questions: QuestionData[]
  hooks?: ModeHooks
  className?: string
  /** Pause/resume from outside (e.g. when a page tab changes). */
  paused?: boolean
  /** Rebuild + restart when the definition changes. */
  onReady?: (engine: GameEngine) => void
}

export function GameCanvas({ definition, questions, hooks, className, paused, onReady }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)

  // Mount / (re)build when definition or questions change.
  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    const atlas = buildAtlas()
    let renderer
    try {
      renderer = createRenderer(canvas, atlas, {})
    } catch {
      renderer = createRenderer(canvas, atlas, { force: 'canvas2d' })
    }
    const module = buildModeModule(definition, questions, hooks ?? {})
    const engine = new GameEngine(canvas, renderer, { module })
    engineRef.current = engine

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width || host.clientWidth
      const h = entries[0]?.contentRect?.height || host.clientHeight
      if (w > 0 && h > 0) engine.resize(w, h)
    })
    ro.observe(host)

    engine.start()
    onReady?.(engine)

    return () => {
      ro.disconnect()
      engine.destroy()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, questions])

  // Pause control from props.
  useEffect(() => {
    if (paused) engineRef.current?.pause()
    else engineRef.current?.resume()
  }, [paused])

  return (
    <div ref={hostRef} className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />
    </div>
  )
}
