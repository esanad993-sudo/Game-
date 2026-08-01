// ─── renderer.ts ─────────────────────────────────────────────────────────────
// Batched WebGL2 renderer with an automatic Canvas 2D fallback.
//
// Why WebGL2 (chosen for the Dell Chromebook 3310 / UHD 600) with a 2D
// fallback: WebGL gives us a single batched draw call per frame, which keeps
// CPU cost low on a weak dual-core CPU, and the fallback guarantees the game
// still runs even if the WebGL context fails or driver is bad.
//
// Both renderers draw from the SAME atlas (sprites + font), so gameplay code
// is renderer-agnostic. World coordinates are CSS pixels, origin top-left.

import { Atlas, Rect } from './atlas'

export type RendererKind = 'webgl2' | 'canvas2d'

export interface Renderer {
  kind: RendererKind
  canvas: HTMLCanvasElement
  /** Configure backing store + viewport from CSS size and device-pixel-ratio. */
  resize(cssW: number, cssH: number, dpr: number): void
  /** Start a frame: clear the background. */
  begin(bg: [number, number, number]): void
  /** World-space camera offset (top-left of the view). */
  cameraX: number
  cameraY: number
  /** Draw a sprite (atlas name) centered at (cx, cy) with size (w, h). */
  drawSprite(name: string, cx: number, cy: number, w: number, h: number, rot?: number, tint?: [number, number, number, number]): void
  /** Solid rectangle from (x, y) with size (w, h). */
  drawRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): void
  /** Vertical gradient rectangle (top→bottom color). */
  drawGradientRect(x: number, y: number, w: number, h: number, top: [number, number, number], bottom: [number, number, number]): void
  /** Text from the built-in font atlas. size = cap-height in world px. */
  drawText(text: string, x: number, y: number, size: number, color: [number, number, number, number]): void
  /** Width of text at the given size (for centering). */
  textWidth(text: string, size: number): number
  /** Flush remaining geometry + end the frame. */
  end(): void
}

export interface RendererOptions {
  /** Force a specific renderer (used by tests / diagnostics). */
  force?: RendererKind
}

// ─────────────────────────────────────────────────────────────────────────────
// WebGL2 implementation
// ─────────────────────────────────────────────────────────────────────────────

const VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
layout(location=1) in vec2 a_uv;
layout(location=2) in vec4 a_color;
out vec2 v_uv;
out vec4 v_color;
void main(){ v_uv=a_uv; v_color=a_color; gl_Position=vec4(a_pos,0.0,1.0); }`

const FRAG = `#version 300 es
precision mediump float;
in vec2 v_uv;
in vec4 v_color;
uniform sampler2D u_tex;
out vec4 fragColor;
void main(){ fragColor = texture(u_tex, v_uv) * v_color; }`

const STRIDE = 8 // pos(2) + uv(2) + color(4)
const MAX_FLOATS = 1 << 20

class WebGL2Renderer implements Renderer {
  kind: RendererKind = 'webgl2'
  canvas: HTMLCanvasElement
  cameraX = 0
  cameraY = 0

  private gl: WebGL2RenderingContext
  private atlas: Atlas
  private texW = 1
  private texH = 1
  private logicalW = 1
  private logicalH = 1
  private buf: Float32Array = new Float32Array(MAX_FLOATS)
  private count = 0 // floats used
  private capacity: number
  private prog: WebGLProgram

  constructor(canvas: HTMLCanvasElement, atlas: Atlas) {
    this.canvas = canvas
    this.atlas = atlas
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false }) as WebGL2RenderingContext | null
    if (!gl) throw new Error('webgl2 unavailable')
    this.gl = gl
    this.capacity = MAX_FLOATS

    // Upload atlas texture
    this.texW = atlas.canvas.width
    this.texH = atlas.canvas.height
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Shader program
    const vs = this.compile(gl.VERTEX_SHADER, VERT)
    const fs = this.compile(gl.FRAGMENT_SHADER, FRAG)
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('webgl link failed')
    gl.useProgram(prog)
    this.prog = prog

    // Vertex buffer
    const vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, this.buf.byteLength, gl.DYNAMIC_DRAW)

    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, STRIDE * 4, 0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, STRIDE * 4, 8)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, STRIDE * 4, 16)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    const gl = this.gl
    const w = Math.max(1, Math.round(cssW * dpr))
    const h = Math.max(1, Math.round(cssH * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    gl.viewport(0, 0, w, h)
    this.logicalW = cssW
    this.logicalH = cssH
  }

  begin(bg: [number, number, number]): void {
    this.count = 0
    const gl = this.gl
    gl.clearColor(bg[0], bg[1], bg[2], 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.prog)
  }

  private ensure(extra: number): void {
    if (this.count + extra <= this.capacity) return
    this.flush()
  }

  private flush(): void {
    if (this.count === 0) return
    const gl = this.gl
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.buf.subarray(0, this.count))
    gl.drawArrays(gl.TRIANGLES, 0, this.count / STRIDE)
    this.count = 0
  }

  private pushVert(x: number, y: number, u: number, v: number, c: number, ci: number): void {
    // ndc
    const nx = (x - this.cameraX) / this.logicalW * 2 - 1
    const ny = 1 - (y - this.cameraY) / this.logicalH * 2
    const f = this.buf
    let o = this.count
    f[o] = nx; f[o + 1] = ny
    f[o + 2] = u; f[o + 3] = v
    f[o + 4] = c; f[o + 5] = c; f[o + 6] = c; f[o + 7] = c
    this.count = o + STRIDE
  }

  /** Push a textured quad (already normalized uv rect). */
  private quad(cx: number, cy: number, w: number, h: number, rot: number, u0: number, v0: number, u1: number, v1: number, tint: [number, number, number, number]): void {
    this.ensure(STRIDE * 6)
    const hw = w / 2
    const hh = h / 2
    const cr = Math.cos(rot)
    const sr = Math.sin(rot)
    // local corners
    const lx = [-hw, hw, hw, -hw]
    const ly = [-hh, -hh, hh, hh]
    const co = tint
    const c = co[0], c2 = co[1], c3 = co[2], c4 = co[3]
    const col = [c, c2, c3, c4]
    const b = this.buf
    // We'll write directly for speed.
    const base = this.count
    let o = base
    const idx = [0, 1, 2, 0, 2, 3]
    for (let k = 0; k < 6; k++) {
      const i = idx[k]
      const x = cx + (lx[i] * cr - ly[i] * sr)
      const y = cy + (lx[i] * sr + ly[i] * cr)
      const nx = (x - this.cameraX) / this.logicalW * 2 - 1
      const ny = 1 - (y - this.cameraY) / this.logicalH * 2
      const u = i === 0 || i === 3 ? u0 : u1
      const v = i < 2 ? v0 : v1
      b[o] = nx; b[o + 1] = ny; b[o + 2] = u; b[o + 3] = v
      b[o + 4] = col[0]; b[o + 5] = col[1]; b[o + 6] = col[2]; b[o + 7] = col[3]
      o += STRIDE
    }
    this.count = o
  }

  private spriteRect(name: string): Rect {
    const r = this.atlas.sprites[name]
    if (!r) throw new Error(`missing sprite: ${name}`)
    return r
  }

  drawSprite(name: string, cx: number, cy: number, w: number, h: number, rot = 0, tint: [number, number, number, number] = [1, 1, 1, 1]): void {
    const r = this.spriteRect(name)
    this.quad(cx, cy, w, h, rot, r.x / this.texW, r.y / this.texH, (r.x + r.w) / this.texW, (r.y + r.h) / this.texH, tint)
  }

  drawRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): void {
    const wr = this.spriteRect('white')
    this.quad(x + w / 2, y + h / 2, w, h, 0, wr.x / this.texW, wr.y / this.texH, (wr.x + wr.w) / this.texW, (wr.y + wr.h) / this.texH, [r, g, b, a])
  }

  drawGradientRect(x: number, y: number, w: number, h: number, top: [number, number, number], bottom: [number, number, number]): void {
    // Gradient requires two overlapping quads with alpha ramps — simplest is to
    // render via the Canvas2D compositor. To keep WebGL single-texture, we draw
    // 32 horizontal bands (fast, one-time per frame for the background).
    const bands = 24
    for (let i = 0; i < bands; i++) {
      const t = i / bands
      const t2 = (i + 1) / bands
      const y0 = y + t * h
      const hh = (t2 - t) * h + 1
      const cr = Math.round(top[0] + (bottom[0] - top[0]) * t)
      const cg = Math.round(top[1] + (bottom[1] - top[1]) * t)
      const cb = Math.round(top[2] + (bottom[2] - top[2]) * t)
      this.drawRect(x, y0, w, hh, cr / 255, cg / 255, cb / 255, 1)
    }
  }

  textWidth(text: string, size: number): number {
    const scale = size / this.atlas.font.capHeight
    return text.length * this.atlas.font.cellW * scale
  }

  drawText(text: string, x: number, y: number, size: number, color: [number, number, number, number] = [1, 1, 1, 1]): void {
    const font = this.atlas.font
    const scale = size / font.capHeight
    const gw = font.cellW * scale
    const gh = font.cellH * scale
    let cx = x
    const cy = y - gh / 2
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      let g = font.glyphs[ch]
      if (!g) g = font.glyphs[' ']
      this.quad(cx + gw / 2, cy + gh / 2, gw, gh, 0, g.x / this.texW, g.y / this.texH, (g.x + g.w) / this.texW, (g.y + g.h) / this.texH, color)
      cx += gw
    }
  }

  end(): void {
    this.flush()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas 2D fallback
// ─────────────────────────────────────────────────────────────────────────────

class Canvas2DRenderer implements Renderer {
  kind: RendererKind = 'canvas2d'
  canvas: HTMLCanvasElement
  cameraX = 0
  cameraY = 0

  private ctx: CanvasRenderingContext2D
  private atlas: Atlas
  private logicalW = 1
  private logicalH = 1

  constructor(canvas: HTMLCanvasElement, atlas: Atlas) {
    this.canvas = canvas
    this.atlas = atlas
    const ctx = canvas.getContext('2d')!
    if (!ctx) throw new Error('2d unavailable')
    this.ctx = ctx
    ctx.imageSmoothingEnabled = true
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    const w = Math.max(1, Math.round(cssW * dpr))
    const h = Math.max(1, Math.round(cssH * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.logicalW = cssW
    this.logicalH = cssH
  }

  begin(): void {
    this.ctx.save()
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.clearRect(0, 0, this.logicalW, this.logicalH)
    this.ctx.restore()
    this.ctx.save()
    this.ctx.translate(-this.cameraX, -this.cameraY)
  }

  private rect(name: string): Rect {
    const r = this.atlas.sprites[name]
    if (!r) throw new Error(`missing sprite: ${name}`)
    return r
  }

  drawSprite(name: string, cx: number, cy: number, w: number, h: number, rot = 0, tint: [number, number, number, number] = [1, 1, 1, 1]): void {
    const r = this.rect(name)
    const ctx = this.ctx
    ctx.save()
    ctx.translate(cx, cy)
    if (rot) ctx.rotate(rot)
    if (tint[0] !== 1 || tint[1] !== 1 || tint[2] !== 1 || tint[3] !== 1) {
      ctx.globalAlpha *= tint[3]
    }
    ctx.drawImage(this.atlas.canvas, r.x, r.y, r.w, r.h, -w / 2, -h / 2, w, h)
    ctx.restore()
  }

  drawRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): void {
    const ctx = this.ctx
    ctx.fillStyle = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`
    ctx.fillRect(x, y, w, h)
  }

  drawGradientRect(x: number, y: number, w: number, h: number, top: [number, number, number], bottom: [number, number, number]): void {
    const ctx = this.ctx
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, `rgb(${top[0]},${top[1]},${top[2]})`)
    g.addColorStop(1, `rgb(${bottom[0]},${bottom[1]},${bottom[2]})`)
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
  }

  textWidth(text: string, size: number): number {
    const font = this.atlas.font
    const scale = size / font.capHeight
    return text.length * font.cellW * scale
  }

  drawText(text: string, x: number, y: number, size: number, color: [number, number, number, number] = [1, 1, 1, 1]): void {
    const font = this.atlas.font
    const scale = size / font.capHeight
    const gw = font.cellW * scale
    const gh = font.cellH * scale
    const ctx = this.ctx
    ctx.save()
    ctx.globalAlpha *= color[3]
    // Tint is skipped in the 2D path (sprites are used as-is); text uses white
    // glyphs so we tint via composite, but keeping it simple: draw glyphs.
    let cx = x
    const cy = y - gh / 2
    for (let i = 0; i < text.length; i++) {
      const g = font.glyphs[text[i]] || font.glyphs[' ']
      ctx.drawImage(this.atlas.canvas, g.x, g.y, g.w, g.h, cx, cy, gw, gh)
      cx += gw
    }
    ctx.restore()
  }

  end(): void {
    this.ctx.restore()
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export function createRenderer(canvas: HTMLCanvasElement, atlas: Atlas, opts: RendererOptions = {}): Renderer {
  if (opts.force !== 'canvas2d') {
    try {
      return new WebGL2Renderer(canvas, atlas)
    } catch {
      // fall through to Canvas 2D
    }
  }
  return new Canvas2DRenderer(canvas, atlas)
}

/** Quick feature probe without constructing a renderer. */
export function webgl2Available(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}
