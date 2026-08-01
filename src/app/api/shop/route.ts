import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const items = await db.shopItem.findMany({
      where: { isActive: true },
      orderBy: [{ rarity: "asc" }, { price: "asc" }],
    })
    return NextResponse.json(items)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch shop items" }, { status: 500 })
  }
}
