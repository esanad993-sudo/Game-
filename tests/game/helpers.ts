// Shared test helpers: a null renderer stub so engine + modes can be driven
// headlessly (no canvas/DOM needed) and deterministically.

import { Renderer } from '../../src/game/core/renderer'

/** Minimal Renderer stub that records a few calls for assertions. */
export function makeNullRenderer() {
  const calls: string[] = []
  const renderer: Renderer = {
    kind: 'canvas2d' as const,
    canvas: {} as HTMLCanvasElement,
    cameraX: 0,
    cameraY: 0,
    resize() {},
    begin() {},
    drawSprite() { calls.push('sprite') },
    drawRect() { calls.push('rect') },
    drawGradientRect() { calls.push('gradient') },
    drawText() { calls.push('text') },
    textWidth() { return 40 },
    end() {},
  }
  return { renderer, calls }
}

/** A no-op canvas stub (WebGL/2D constructors are never invoked headlessly). */
export function makeCanvasStub(): HTMLCanvasElement {
  const c = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => null,
    clientWidth: 800,
    clientHeight: 600,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement
  return c
}
