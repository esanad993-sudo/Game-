import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { userId } = await req.json()
    
    const item = await db.shopItem.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 })

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (user.coins < item.price) return NextResponse.json({ error: "Not enough coins" }, { status: 400 })

    // Check if already owned
    const owned = await db.userItem.findUnique({ where: { userId_itemId: { userId, itemId: id } } })
    if (owned) return NextResponse.json({ error: "Already owned" }, { status: 409 })

    // Purchase
    const [userItem] = await db.$transaction([
      db.userItem.create({
        data: { userId, itemId: id },
      }),
      db.user.update({
        where: { id: userId },
        data: { coins: { decrement: item.price } },
      }),
    ])

    return NextResponse.json(userItem, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Purchase failed" }, { status: 500 })
  }
}
