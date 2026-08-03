'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '@/lib/editor/store'
import { BUILTIN_DEVICES } from '@/lib/editor/store'
import { DeviceNode } from './DeviceNode'
import { WireLayer } from './WireLayer'

export function Canvas() {
  const devices = useEditorStore((s) => s.project.scene.devices)
  const background = useEditorStore((s) => s.project.scene.world.background)
  const selectedDeviceId = useEditorStore((s) => s.selectedDeviceId)
  const addDevice = useEditorStore((s) => s.addDevice)
  const selectDevice = useEditorStore((s) => s.selectDevice)
  const cancelWire = useEditorStore((s) => s.cancelWire)
  const removeDevice = useEditorStore((s) => s.removeDevice)
  const setMousePos = useEditorStore((s) => s.setMousePos)

  const canvasRef = useRef<HTMLDivElement>(null)

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      setMousePos([e.clientX - rect.left, e.clientY - rect.top])
    },
    [setMousePos],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('application/x-gameforge-device')
      if (!type) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left - 100
      const y = e.clientY - rect.top - 20
      addDevice(type, [x, y])
    },
    [addDevice],
  )

  const onCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target === canvasRef.current) {
        selectDevice(null)
        cancelWire()
      }
    },
    [selectDevice, cancelWire],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDeviceId) {
        const active = document.activeElement
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return
        e.preventDefault()
        removeDevice(selectedDeviceId)
      }
      if (e.key === 'Escape') {
        selectDevice(null)
        cancelWire()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedDeviceId, removeDevice, selectDevice, cancelWire])

  return (
    <div
      ref={canvasRef}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={onDrop}
      onMouseMove={onMouseMove}
      onPointerDown={onCanvasPointerDown}
      className="relative flex-1 overflow-hidden"
      style={{
        backgroundColor: background,
        backgroundImage:
          'radial-gradient(circle, rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <WireLayer />

      {devices.map((instance) => {
        const def = BUILTIN_DEVICES.find((d) => d.type === instance.type)
        if (!def) return null
        return (
          <DeviceNode
            key={instance.id}
            instanceId={instance.id}
            def={def}
            position={instance.position}
            properties={instance.properties}
            selected={selectedDeviceId === instance.id}
          />
        )
      })}

      {devices.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <p className="mb-1 text-lg">Empty canvas</p>
            <p className="text-sm">Drag a device from the left to get started.</p>
          </div>
        </div>
      )}
    </div>
  )
}
