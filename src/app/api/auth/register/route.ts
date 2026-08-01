import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    if (!["teacher", "student"].includes(role)) {
      return NextResponse.json({ error: "Role must be 'teacher' or 'student'" }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        role,
        lastLoginAt: new Date(),
      },
    })

    // Create a credentials account for the user
    await db.account.create({
      data: {
        userId: user.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: email,
      },
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      coins: user.coins ?? 0,
      streak: user.streak ?? 0,
      avatarColor: user.avatarColor ?? "#FFD23F",
      carSkin: user.carSkin ?? "default",
      bio: user.bio ?? "",
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
  }
}
