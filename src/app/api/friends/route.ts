import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    const friends = await db.friendship.findMany({
      where: {
        OR: [
          { fromUserId: userId, status: "accepted" },
          { toUserId: userId, status: "accepted" },
        ],
      },
      include: {
        fromUser: { select: { id: true, name: true, image: true, avatarColor: true } },
        toUser: { select: { id: true, name: true, image: true, avatarColor: true } },
      },
    })

    const friendList = friends.map(f => {
      const friend = f.fromUserId === userId ? f.toUser : f.fromUser
      return friend
    })

    return NextResponse.json(friendList)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch friends" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { fromUserId, toUserId } = await req.json()
    if (!fromUserId || !toUserId) return NextResponse.json({ error: "Both user IDs required" }, { status: 400 })

    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      },
    })
    if (existing) return NextResponse.json({ error: "Friend request already exists" }, { status: 409 })

    const friendship = await db.friendship.create({
      data: { fromUserId, toUserId, status: "pending" },
    })

    // Create notification
    await db.notification.create({
      data: {
        userId: toUserId,
        type: "friend_request",
        title: "New Friend Request",
        message: `Someone wants to be your friend!`,
        link: "/friends",
      },
    })

    return NextResponse.json(friendship, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to send friend request" }, { status: 500 })
  }
}
