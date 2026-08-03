import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { ProjectSchema } from "@/lib/runtime"

const PublishSchema = z.object({
  // If true, snapshots `data` into `publishedData` and bumps version.
  // If false, unpublishes (sets publishedData to null, isPublic to false).
  publish: z.boolean(),
  editToken: z.string().optional(),
})

interface RouteParams { params: Promise<{ id: string }> }

async function canEdit(projectId: string, editToken?: string): Promise<boolean> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { editToken: true, authorId: true },
  })
  if (!project) return false
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id && session.user.id === project.authorId) return true
  } catch { /* anonymous */ }
  if (editToken && editToken === project.editToken) return true
  return false
}

// POST /api/projects/[id]/publish
// Snapshots the current draft `data` into `publishedData` so anyone can read it
// via GET /api/projects/[id]?view=published without the edit token.
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => null)
    const parsed = PublishSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid publish payload", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const ok = await canEdit(id, parsed.data.editToken)
    if (!ok) {
      return NextResponse.json({ error: "Forbidden — need edit token or author session" }, { status: 403 })
    }

    if (!parsed.data.publish) {
      // Unpublish — publishedData becomes null, isPublic becomes false.
      // The draft `data` is preserved so the author can still edit and re-publish.
      const updated = await db.project.update({
        where: { id },
        data: { isPublic: false, publishedData: null },
        select: { id: true, isPublic: true, version: true },
      })
      return NextResponse.json(updated)
    }

    // Publish — re-validate the current draft, snapshot it, bump version.
    const project = await db.project.findUnique({
      where: { id },
      select: { data: true, version: true },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    let parsedData
    try {
      parsedData = JSON.parse(project.data)
    } catch {
      return NextResponse.json({ error: "Stored project data is corrupt" }, { status: 500 })
    }
    const validated = ProjectSchema.safeParse(parsedData)
    if (!validated.success) {
      return NextResponse.json(
        { error: "Cannot publish — project data is invalid", details: validated.error.flatten() },
        { status: 400 },
      )
    }

    const updated = await db.project.update({
      where: { id },
      data: {
        isPublic: true,
        publishedData: JSON.stringify(validated.data),
        version: project.version + 1,
      },
      select: {
        id: true,
        title: true,
        isPublic: true,
        version: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("POST /api/projects/[id]/publish error:", error)
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 })
  }
}
