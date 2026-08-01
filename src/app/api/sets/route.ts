import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const sets = await db.questionSet.findMany({
      where: { isPublic: true },
      include: { 
        creator: { select: { name: true } },
        _count: { select: { questions: true } }
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(sets)
  } catch (error) {
    console.error("Error fetching sets:", error)
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, subject, gradeLevel, description, isPublic, questions, creatorId } = await req.json()

    if (!title || !questions?.length || !creatorId) {
      return NextResponse.json({ error: "Title, questions, and creator are required" }, { status: 400 })
    }

    const set = await db.questionSet.create({
      data: {
        title,
        subject: subject || null,
        gradeLevel: gradeLevel || null,
        description: description || null,
        isPublic: isPublic ?? false,
        creatorId,
        questions: {
          create: questions.map((q: any, i: number) => ({
            text: q.text,
            choices: JSON.stringify(q.choices),
            correctIdx: q.correctIdx,
            explanation: q.explanation || null,
            imageUrl: q.imageUrl || null,
            order: i,
          })),
        },
      },
      include: { questions: true },
    })

    return NextResponse.json(set, { status: 201 })
  } catch (error) {
    console.error("Error creating set:", error)
    return NextResponse.json({ error: "Failed to create set" }, { status: 500 })
  }
}
