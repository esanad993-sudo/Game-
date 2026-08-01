import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/homework?setId=... — list homework (optionally filtered)
export async function GET(req: NextRequest) {
  const setId = req.nextUrl.searchParams.get('setId')
  const where = setId ? { setId } : {}
  const list = await db.homework.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      set: { select: { title: true, subject: true, gradeLevel: true } },
      _count: { select: { submissions: true } },
    },
  })
  return NextResponse.json({ homework: list })
}

// POST /api/homework — create homework assignment
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.setId || !body.title) {
    return NextResponse.json({ error: 'setId and title required' }, { status: 400 })
  }
  const hw = await db.homework.create({
    data: {
      setId: body.setId,
      title: body.title,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  })
  return NextResponse.json({ homework: hw })
}
