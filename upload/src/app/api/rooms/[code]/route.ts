import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/rooms/[code] — fetch room info (for student join page)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const room = await db.gameRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      set: { include: { questions: { orderBy: { order: 'asc' } } } },
      players: { orderBy: { score: 'desc' } },
    },
  })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  return NextResponse.json({
    room: {
      id: room.id,
      code: room.code,
      status: room.status,
      mode: room.mode,
      setId: room.setId,
      setTitle: room.set.title,
      subject: room.set.subject,
      gradeLevel: room.set.gradeLevel,
      questions: room.set.questions.map(q => ({ ...q, choices: JSON.parse(q.choices) })),
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        correct: p.correct,
        wrong: p.wrong,
        bestStreak: p.bestStreak,
        coins: p.coins,
        isHost: p.isHost,
      })),
    },
  })
}

// POST /api/rooms/[code] — join room (register player)
export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const name = (body.name || '').toString().trim().slice(0, 14)
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const room = await db.gameRoom.findUnique({
    where: { code: code.toUpperCase() },
  })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.status === 'ended') return NextResponse.json({ error: 'Room has ended' }, { status: 400 })

  // De-dupe: if a player with the same name is already in the room, reuse them
  const existing = await db.player.findFirst({
    where: { roomId: room.id, name },
  })
  if (existing) {
    return NextResponse.json({ player: existing, room })
  }

  const player = await db.player.create({
    data: { roomId: room.id, name, isHost: !!body.isHost },
  })
  return NextResponse.json({ player, room })
}

// PATCH /api/rooms/[code] — update room status (start/ended)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const room = await db.gameRoom.update({
    where: { code: code.toUpperCase() },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.status === 'ended' ? { endedAt: new Date() } : {}),
    },
  })
  return NextResponse.json({ room })
}
