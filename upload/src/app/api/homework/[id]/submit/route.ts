import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/homework/[id]/submit — submit a homework result
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body || !body.playerName) {
    return NextResponse.json({ error: 'playerName required' }, { status: 400 })
  }
  const hw = await db.homework.findUnique({ where: { id } })
  if (!hw) return NextResponse.json({ error: 'homework not found' }, { status: 404 })

  const sub = await db.submission.create({
    data: {
      homeworkId: id,
      playerName: body.playerName.slice(0, 14),
      score: Math.floor(body.score ?? 0),
      correct: body.correct ?? 0,
      wrong: body.wrong ?? 0,
      bestStreak: body.bestStreak ?? 0,
      coins: body.coins ?? 0,
      mistakes: JSON.stringify(body.mistakes ?? []),
    },
  })
  return NextResponse.json({ submission: sub })
}
