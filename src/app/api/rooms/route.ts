import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const rooms = await db.gameRoom.findMany({
      where: { status: { in: ["lobby", "playing"] } },
      include: { 
        set: { select: { title: true, subject: true } },
        host: { select: { name: true } },
        _count: { select: { players: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(rooms)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { setId, hostId, mode, maxPlayers, timeLimit, goalScore, isTeamMode } = await req.json()

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const room = await db.gameRoom.create({
      data: {
        code,
        setId,
        hostId,
        mode: mode || "heart",
        maxPlayers: maxPlayers || 50,
        timeLimit: timeLimit || null,
        goalScore: goalScore || null,
        isTeamMode: isTeamMode || false,
        players: {
          create: {
            userId: hostId,
            name: "Host",
            isHost: true,
          },
        },
      },
      include: { set: true, players: true },
    })

    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    console.error("Error creating room:", error)
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
  }
}
