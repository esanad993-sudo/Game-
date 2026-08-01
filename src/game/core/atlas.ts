// ─── atlas.ts ────────────────────────────────────────────────────────────────
// A single texture atlas built ONCE at startup by drawing shapes + glyphs onto
// a Canvas 2D surface with pure code. No image files are fetched at all, which
// means: zero network cost, tiny install, and offline PWA support — ideal for
// flaky school Wi-Fi and 32 GB eMMC storage.

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface FontAtlas {
  /** Character → cell rectangle in the atlas. */
  glyphs: Record<string, Rect>
  /** Logical advance (pixels) per character, monospaced for simplicity. */
  cellW: number
  cellH: number
  /** Height of the cap line above the baseline, in pixels. */
  capHeight: number
  /** Character cells in the atlas are 1px inset to avoid bleeding. */
  pad: number
}

export interface Atlas {
  /** The offscreen canvas holding every sprite + glyph. */
  canvas: HTMLCanvasElement
  /** Named sprites in the atlas. */
  sprites: Record<string, Rect>
  font: FontAtlas
}

const GLYPH_ORDER =
  ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
  '.,!?;:()[]-+*/=<>$%&#@_\'"' + '\u2026\u2192\u2190\u2764\u2605'

/**
 * Draw a rounded rectangle path.
 */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}

export function buildAtlas(): Atlas {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = 1024
  canvas.height = 1024
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const sprites: Record<string, Rect> = {}
  let x = 4
  let y = 4
  let rowH = 0

  const place = (w: number, h: number): Rect => {
    if (x + w > canvas.width - 4) {
      x = 4
      y += rowH
      rowH = 0
    }
    const r = { x, y, w, h }
    x += w + 4
    rowH = Math.max(rowH, h)
    return r
  }

  // ── Car (top-down, pointing up) ──
  const carR = place(64, 96)
  sprites['car'] = carR
  ;(() => {
    ctx.save()
    ctx.translate(carR.x, carR.y)
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    rr(ctx, 2, 4, 60, 92, 14)
    ctx.fill()
    // body
    const g = ctx.createLinearGradient(0, 0, 0, 96)
    g.addColorStop(0, '#38bdf8')
    g.addColorStop(1, '#0284c7')
    ctx.fillStyle = g
    rr(ctx, 6, 0, 52, 92, 12)
    ctx.fill()
    ctx.strokeStyle = '#0c4a6e'
    ctx.lineWidth = 3
    rr(ctx, 6, 0, 52, 92, 12)
    ctx.stroke()
    // windshield
    ctx.fillStyle = '#082f49'
    rr(ctx, 12, 16, 40, 22, 7)
    ctx.fill()
    // hood stripe
    ctx.fillStyle = '#7dd3fc'
    ctx.fillRect(30, 4, 4, 14)
    // wheels (visible as dark stubs)
    ctx.fillStyle = '#111827'
    ctx.fillRect(8, 22, 5, 26)
    ctx.fillRect(51, 22, 5, 26)
    // rear lights
    ctx.fillStyle = '#f43f5e'
    ctx.fillRect(8, 84, 12, 4)
    ctx.fillRect(44, 84, 12, 4)
    ctx.restore()
  })()

  // ── Obstacle cone ──
  const obR = place(56, 56)
  sprites['obstacle'] = obR
  ;(() => {
    ctx.save()
    ctx.translate(obR.x, obR.y)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    rr(ctx, 2, 4, 52, 52, 12)
    ctx.fill()
    ctx.fillStyle = '#fb7185'
    ctx.beginPath()
    ctx.moveTo(28, 2)
    ctx.lineTo(52, 52)
    ctx.lineTo(4, 52)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillRect(8, 26, 40, 8)
    ctx.strokeStyle = '#9f1239'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(28, 2)
    ctx.lineTo(52, 52)
    ctx.lineTo(4, 52)
    ctx.closePath()
    ctx.stroke()
    ctx.restore()
  })()

  // ── Coin ──
  const coinR = place(48, 48)
  sprites['coin'] = coinR
  ;(() => {
    ctx.save()
    ctx.translate(coinR.x, coinR.y)
    const g = ctx.createRadialGradient(16, 14, 2, 24, 24, 22)
    g.addColorStop(0, '#fef08a')
    g.addColorStop(0.6, '#facc15')
    g.addColorStop(1, '#ca8a04')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(24, 24, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#854d0e'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#854d0e'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('¢', 24, 26)
    ctx.restore()
  })()

  // ── Heart ──
  const heartR = place(48, 48)
  sprites['heart'] = heartR
  ;(() => {
    ctx.save()
    ctx.translate(heartR.x, heartR.y)
    ctx.fillStyle = '#e11d48'
    ctx.beginPath()
    ctx.moveTo(24, 40)
    ctx.bezierCurveTo(2, 26, 4, 4, 16, 4)
    ctx.bezierCurveTo(22, 4, 24, 10, 24, 14)
    ctx.bezierCurveTo(24, 10, 26, 4, 32, 4)
    ctx.bezierCurveTo(44, 4, 46, 26, 24, 40)
    ctx.fill()
    ctx.restore()
  })()

  // ── Spark particle ──
  const sparkR = place(28, 28)
  sprites['spark'] = sparkR
  ;(() => {
    ctx.save()
    ctx.translate(sparkR.x, sparkR.y)
    const g = ctx.createRadialGradient(14, 14, 1, 14, 14, 14)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.5, 'rgba(250,204,21,0.8)')
    g.addColorStop(1, 'rgba(250,204,21,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 28, 28)
    ctx.restore()
  })()

  // ── Road tile with lane dashes ──
  const roadR = place(64, 64)
  sprites['road'] = roadR
  ;(() => {
    ctx.save()
    ctx.translate(roadR.x, roadR.y)
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, 64, 64)
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 2
    ctx.strokeRect(0.5, 0.5, 63, 63)
    // edge lines
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(0, 0, 3, 64)
    ctx.fillRect(61, 0, 3, 64)
    // center dashes
    ctx.fillStyle = '#facc15'
    ctx.fillRect(30, 8, 4, 24)
    ctx.restore()
  })()

  // ── Solid white (used by the renderer for colored rectangles) ──
  const whiteR = place(8, 8)
  sprites['white'] = whiteR
  ;(() => {
    ctx.save()
    ctx.translate(whiteR.x, whiteR.y)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 8, 8)
    ctx.restore()
  })()

  // ── Checkered start/finish flag ──
  const flagR = place(64, 32)
  sprites['checker'] = flagR
  ;(() => {
    ctx.save()
    ctx.translate(flagR.x, flagR.y)
    const cell = 8
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#f8fafc' : '#0f172a'
        ctx.fillRect(i * cell, j * cell, cell, cell)
      }
    }
    ctx.restore()
  })()

  // ── Font atlas ──
  const cellW = 28
  const cellH = 40
  const capHeight = 26
  const pad = 2
  const font: FontAtlas = { glyphs: {}, cellW, cellH, capHeight, pad }
  ctx.font = '900 34px "Arial", "Helvetica", sans-serif'
  ctx.textBaseline = 'middle'
  const cols = Math.max(1, Math.floor((canvas.width - 4) / (cellW + 2)))
  let rowStart = y + 8
  let gx = 4
  let gy = rowStart
  ctx.fillStyle = '#ffffff'
  GLYPH_ORDER.split('').forEach((ch, i) => {
    if (gx + cellW > canvas.width - 4) {
      gx = 4
      gy += cellH + 2
    }
    const r = { x: gx + pad, y: gy + pad, w: cellW - pad * 2, h: cellH - pad * 2 }
    font.glyphs[ch] = r
    ctx.save()
    ctx.beginPath()
    ctx.rect(gx, gy, cellW, cellH)
    ctx.clip()
    ctx.fillText(ch, gx + cellW / 2, gy + cellH / 2 + 3)
    ctx.restore()
    gx += cellW + 2
  })

  return { canvas, sprites, font }
}
