'use client'

import { useEditorStore, BUILTIN_DEVICES } from '@/lib/editor/store'
import { z } from 'zod'

// Permissive schema type — Zod 4's $ZodType vs the public ZodType
// don't always line up cleanly. We only need instanceof checks below.
type AnySchema = any

function PropertyField({
  label,
  value,
  schema,
  onChange,
}: {
  label: string
  value: any
  schema: AnySchema
  onChange: (v: any) => void
}) {
  let inner = schema
  while (inner instanceof z.ZodDefault) inner = inner._def.innerType
  while (inner instanceof z.ZodOptional) inner = inner._def.innerType

  const inputCls =
    'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none'

  if (inner instanceof z.ZodNumber) {
    return (
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <input
          type="number"
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className={inputCls}
        />
      </label>
    )
  }

  if (inner instanceof z.ZodString) {
    return (
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      </label>
    )
  }

  if (inner instanceof z.ZodRecord) {
    const text = typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)
    return (
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-400">{label} (JSON)</span>
        <textarea
          defaultValue={text}
          onBlur={(e) => {
            try {
              onChange(JSON.parse(e.target.value))
            } catch {
              /* keep last good value */
            }
          }}
          className={`${inputCls} h-24 font-mono text-xs`}
        />
      </label>
    )
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-400">{label} (raw)</span>
      <textarea
        defaultValue={JSON.stringify(value ?? '', null, 2)}
        onBlur={(e) => {
          try {
            onChange(JSON.parse(e.target.value))
          } catch {
            /* keep last good value */
          }
        }}
        className={`${inputCls} h-20 font-mono text-xs`}
      />
    </label>
  )
}

export function Inspector() {
  const devices = useEditorStore((s) => s.project.scene.devices)
  const selectedId = useEditorStore((s) => s.selectedDeviceId)
  const updateDeviceProperty = useEditorStore((s) => s.updateDeviceProperty)

  const instance = devices.find((d) => d.id === selectedId)
  const def = instance ? BUILTIN_DEVICES.find((d) => d.type === instance.type) : null

  if (!instance || !def) {
    return (
      <aside className="flex w-72 flex-col border-l border-slate-800 bg-slate-950 p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Inspector
        </h2>
        <p className="text-sm text-slate-600">
          Select a device on the canvas to edit its properties.
        </p>

        <div className="mt-6 rounded-md border border-slate-800 bg-slate-900 p-3 text-xs leading-relaxed text-slate-500">
          <strong className="text-slate-300">Ports</strong>
          <ul className="mt-2 space-y-1">
            <li>
              <span className="text-emerald-300">● Left ports</span> = inputs
              <br />
              <span className="text-slate-500">click to receive a wire</span>
            </li>
            <li>
              <span className="text-sky-300">● Right ports</span> = outputs
              <br />
              <span className="text-slate-500">click to start a wire</span>
            </li>
          </ul>
        </div>
      </aside>
    )
  }

  let propsSchema: any = def.propertiesSchema
  while (propsSchema instanceof z.ZodDefault) propsSchema = propsSchema._def.innerType
  const shape = propsSchema instanceof z.ZodObject ? propsSchema.shape : {}

  const inputs = Object.keys(def.inputs)
  const outputs = Object.keys(def.outputs)

  return (
    <aside className="flex w-72 flex-col overflow-y-auto border-l border-slate-800 bg-slate-950 p-4">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Inspector
      </h2>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">{def.icon}</span>
        <div>
          <p className="text-sm font-semibold text-slate-100">{def.name}</p>
          <p className="font-mono text-[10px] text-slate-500">{instance.id}</p>
        </div>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-slate-400">{def.description}</p>

      <div className="mb-5">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Properties
        </h3>
        <div className="space-y-3">
          {Object.entries(shape).map(([key, fieldSchema]) => (
            <PropertyField
              key={key}
              label={key}
              value={instance.properties[key]}
              schema={fieldSchema as AnySchema}
              onChange={(v) => updateDeviceProperty(instance.id, key, v)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
            Inputs
          </h3>
          {inputs.length === 0 ? (
            <p className="text-xs text-slate-600">None</p>
          ) : (
            <ul className="space-y-0.5 text-xs text-slate-300">
              {inputs.map((p) => (
                <li key={p} className="font-mono">● {p}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
            Outputs
          </h3>
          {outputs.length === 0 ? (
            <p className="text-xs text-slate-600">None</p>
          ) : (
            <ul className="space-y-0.5 text-xs text-slate-300">
              {outputs.map((p) => (
                <li key={p} className="font-mono">{p} ●</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  )
}
