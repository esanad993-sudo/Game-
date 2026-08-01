import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    const results = await db.gameResult.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, gameType, setId, score, correct, wrong, bestStreak, coinsEarned, duration } = await req.json()

    const result = await db.gameResult.create({
      data: {
        userId,
        gameType,
        setId: setId || null,
        score: score || 0,
        correct: correct || 0,
        wrong: wrong || 0,
        bestStreak: bestStreak || 0,
        coinsEarned: coinsEarned || 0,
        duration: duration || null,
      },
    })

    // Award coins to user
    if (coinsEarned > 0) {
      await db.user.update({
        where: { id: userId },
        data: { coins: { increment: coinsEarned } },
      })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save game result" }, { status: 500 })
  }
}
