import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const homework = await db.homework.findUnique({
      where: { id },
      include: {
        set: { include: { questions: { orderBy: { order: "asc" } } } },
        teacher: { select: { name: true } },
        submissions: { orderBy: { submittedAt: "desc" } },
      },
    })
    if (!homework) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(homework)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch homework" }, { status: 500 })
  }
}
