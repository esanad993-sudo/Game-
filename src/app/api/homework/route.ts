import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const homeworks = await db.homework.findMany({
      include: {
        set: { select: { title: true, subject: true } },
        teacher: { select: { name: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(homeworks)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch homework" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { setId, teacherId, title, description, dueDate, mode } = await req.json()
    const homework = await db.homework.create({
      data: {
        setId,
        teacherId,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        mode: mode || "heart",
      },
      include: { set: true },
    })
    return NextResponse.json(homework, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create homework" }, { status: 500 })
  }
}
