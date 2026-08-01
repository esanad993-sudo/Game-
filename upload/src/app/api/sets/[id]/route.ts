import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/sets/[id] — fetch one set with all questions
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const set = await db.questionSet.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: 'asc' } } },
  })
  if (!set) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({
    set: {
      ...set,
      questions: set.questions.map(q => ({ ...q, choices: JSON.parse(q.choices) })),
    },
  })
}

// DELETE /api/sets/[id]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  await db.questionSet.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
