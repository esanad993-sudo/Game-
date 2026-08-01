import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/sets — list all public question sets (with question count)
export async function GET(req: NextRequest) {
  const grade = req.nextUrl.searchParams.get('grade')
  const where: { isPublic?: boolean; gradeLevel?: string } = { isPublic: true }
  if (grade && grade !== 'all') where.gradeLevel = grade

  const sets = await db.questionSet.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { questions: true } } },
  })
  return NextResponse.json({ sets })
}

// POST /api/sets — create a new question set
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
    return NextResponse.json({ error: 'title and questions[] are required' }, { status: 400 })
  }
  const { title, subject = 'General', gradeLevel = 'all', description = '', questions } = body

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (!q.q || !Array.isArray(q.a) || q.a.length < 2 || q.a.length > 4 || typeof q.c !== 'number' || q.c < 0 || q.c >= q.a.length) {
      return NextResponse.json({ error: `Question ${i + 1} is invalid. Need { q, a[2-4], c (0-based index) }` }, { status: 400 })
    }
  }

  const created = await db.questionSet.create({
    data: {
      title,
      subject,
      gradeLevel,
      description,
      isPublic: true,
      questions: {
        create: questions.map((q: { q: string; a: string[]; c: number; explanation?: string }, i: number) => ({
          text: q.q,
          choices: JSON.stringify(q.a),
          correctIdx: q.c,
          explanation: q.explanation ?? '',
          order: i,
        })),
      },
    },
    include: { questions: true },
  })
  return NextResponse.json({ set: created })
}
