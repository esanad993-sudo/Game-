import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { playerName, studentId, score, correct, wrong, bestStreak, coins, mistakes } = await req.json()
    
    const submission = await db.submission.create({
      data: {
        homeworkId: id,
        playerName,
        studentId: studentId || null,
        score: score || 0,
        correct: correct || 0,
        wrong: wrong || 0,
        bestStreak: bestStreak || 0,
        coins: coins || 0,
        mistakes: JSON.stringify(mistakes || []),
      },
    })

    // Award coins to student if they have an account
    if (studentId && coins > 0) {
      await db.user.update({
        where: { id: studentId },
        data: { coins: { increment: coins } },
      })
    }

    return NextResponse.json(submission, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to submit homework" }, { status: 500 })
  }
}
