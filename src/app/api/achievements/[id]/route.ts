import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const achievements = await db.userAchievement.findMany({
      where: { userId: id },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
    })
    return NextResponse.json(achievements)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 })
  }
}
