import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const achievements = await db.achievement.findMany({ orderBy: { category: "asc" } })
    return NextResponse.json(achievements)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 })
  }
}
