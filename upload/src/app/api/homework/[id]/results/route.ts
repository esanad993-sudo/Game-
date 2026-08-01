import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/homework/[id]/results — list all submissions for a homework
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const hw = await db.homework.findUnique({
    where: { id },
    include: {
      set: { select: { title: true, subject: true, gradeLevel: true } },
      submissions: { orderBy: { score: 'desc' } },
    },
  })
  if (!hw) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({
    homework: {
      id: hw.id,
      title: hw.title,
      setTitle: hw.set.title,
      subject: hw.set.subject,
      gradeLevel: hw.set.gradeLevel,
      dueDate: hw.dueDate,
      submissions: hw.submissions.map(s => ({
        ...s,
        mistakes: JSON.parse(s.mistakes),
      })),
    },
  })
}
