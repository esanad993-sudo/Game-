'use client'

import { Suspense } from 'react'
import { Editor } from '@/components/editor/Editor'
import { useSearchParams } from 'next/navigation'

function EditorPageInner() {
  const params = useSearchParams()
  const projectId = params.get('id')
  return <Editor projectId={projectId} />
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading editor…</div>}>
      <EditorPageInner />
    </Suspense>
  )
}
