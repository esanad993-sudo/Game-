import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/homework/[id] — fetch homework with question set
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const hw = await db.homework.findUnique({
    where: { id },
    include: {
      set: { include: { questions: { orderBy: { order: 'asc' } } } },
    },
  })
  if (!hw) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({
    homework: {
      id: hw.id,
      title: hw.title,
      dueDate: hw.dueDate,
      setId: hw.setId,
      setTitle: hw.set.title,
      subject: hw.set.subject,
      gradeLevel: hw.set.gradeLevel,
      questions: hw.set.questions.map(q => ({ ...q, choices: JSON.parse(q.choices) })),
    },
  })
}
