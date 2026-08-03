import type { DeviceInstance, DeviceDefinition } from '@/lib/runtime'

export const NODE_W = 200
export const HEADER_H = 36
export const PORT_SPACING = 24
export const PORT_RADIUS = 7

export function nodeHeight(def: DeviceDefinition): number {
  const inputs = Object.keys(def.inputs).length
  const outputs = Object.keys(def.outputs).length
  const portRows = Math.max(inputs, outputs, 1)
  return HEADER_H + portRows * PORT_SPACING + 8
}

export function portPosition(
  instance: DeviceInstance,
  def: DeviceDefinition,
  side: 'input' | 'output',
  portName: string,
): [number, number] | null {
  const portList = side === 'input' ? Object.keys(def.inputs) : Object.keys(def.outputs)
  const idx = portList.indexOf(portName)
  if (idx === -1) return null

  const x = side === 'input'
    ? instance.position[0]
    : instance.position[0] + NODE_W
  const y = instance.position[1] + HEADER_H + idx * PORT_SPACING + PORT_SPACING / 2
  return [x, y]
}

export function wirePath(p1: [number, number], p2: [number, number]): string {
  const dx = Math.abs(p2[0] - p1[0])
  const cx = Math.max(40, dx * 0.5)
  const c1x = p1[0] + cx
  const c2x = p2[0] - cx
  return `M ${p1[0]} ${p1[1]} C ${c1x} ${p1[1]}, ${c2x} ${p2[1]}, ${p2[0]} ${p2[1]}`
}
