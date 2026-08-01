import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function genCode() {
  // 6-char A-Z0-9 (no confusing chars)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = genCode()
    const exists = await db.gameRoom.findUnique({ where: { code } })
    if (!exists) return code
  }
  throw new Error('could not allocate room code')
}

// GET /api/rooms?status=open — list active rooms
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') || 'active'
  const where = status === 'active' ? { status: { in: ['lobby', 'playing'] } } : {}
  const rooms = await db.gameRoom.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      set: { select: { title: true, subject: true, gradeLevel: true } },
      _count: { select: { players: true } },
    },
  })
  return NextResponse.json({ rooms })
}

// POST /api/rooms — create a new room
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.setId) {
    return NextResponse.json({ error: 'setId is required' }, { status: 400 })
  }
  const code = await uniqueCode()
  const room = await db.gameRoom.create({
    data: {
      code,
      setId: body.setId,
      mode: body.mode === 'heart' ? 'heart' : 'slow',
      status: 'lobby',
    },
    include: { set: true },
  })
  return NextResponse.json({ room })
}
