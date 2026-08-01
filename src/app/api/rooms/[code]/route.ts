import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  try {
    const room = await db.gameRoom.findUnique({
      where: { code },
      include: {
        set: { include: { questions: { orderBy: { order: "asc" } } } },
        host: { select: { name: true } },
        players: { orderBy: { score: "desc" } },
      },
    })
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 })
    return NextResponse.json(room)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  try {
    const { name, userId } = await req.json()
    const room = await db.gameRoom.findUnique({ where: { code }, include: { players: true } })
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 })
    if (room.status !== "lobby") return NextResponse.json({ error: "Game already in progress" }, { status: 400 })
    if (room.players.length >= room.maxPlayers) return NextResponse.json({ error: "Room is full" }, { status: 400 })

    // Check if name already in room
    const existing = room.players.find(p => p.name === name)
    if (existing) return NextResponse.json({ error: "Name already taken in this room" }, { status: 409 })

    const player = await db.player.create({
      data: { roomId: room.id, name, userId: userId || null },
    })

    return NextResponse.json({ player, room: { id: room.id, code: room.code, status: room.status } })
  } catch (error) {
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  try {
    const { status, hostId } = await req.json()
    const room = await db.gameRoom.findUnique({ where: { code } })
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 })

    // Verify host
    if (hostId && room.hostId !== hostId) {
      return NextResponse.json({ error: "Only the host can change room status" }, { status: 403 })
    }

    const updated = await db.gameRoom.update({
      where: { code },
      data: { 
        status,
        endedAt: status === "ended" ? new Date() : null,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 })
  }
}
