import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const set = await db.questionSet.findUnique({
      where: { id },
      include: { 
        questions: { orderBy: { order: "asc" } },
        creator: { select: { name: true } },
      },
    })
    if (!set) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(set)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch set" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.questionSet.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete set" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const data = await req.json()
    const set = await db.questionSet.update({
      where: { id },
      data: {
        title: data.title,
        subject: data.subject,
        gradeLevel: data.gradeLevel,
        description: data.description,
        isPublic: data.isPublic,
      },
    })
    return NextResponse.json(set)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update set" }, { status: 500 })
  }
}
