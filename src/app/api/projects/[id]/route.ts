import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ProjectSchema } from "@/lib/runtime"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"

const UpdateProjectSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  data: z.any().optional(),
  // Required for anonymous edits — the original edit token.
  // Ignored if the requester is the project's author.
  editToken: z.string().optional(),
})

interface RouteParams { params: Promise<{ id: string }> }

async function canEdit(projectId: string, editToken?: string): Promise<boolean> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { editToken: true, authorId: true },
  })
  if (!project) return false

  // Author overrides the token requirement.
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id && session.user.id === project.authorId) return true
  } catch { /* anonymous */ }

  if (editToken && editToken === project.editToken) return true
  return false
}

// GET /api/projects/[id]
// - If `?view=published`: returns the published snapshot (anyone can read).
// - Else: requires editToken (via header `X-Edit-Token`) or author session.
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const url = new URL(req.url)
    const view = url.searchParams.get("view")

    const project = await db.project.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        data: true,
        publishedData: true,
        isPublic: true,
        version: true,
        playCount: true,
        forkCount: true,
        authorId: true,
        editToken: true,
        updatedAt: true,
      },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Public/published view: return the snapshot only.
    if (view === "published") {
      if (!project.isPublic || !project.publishedData) {
        return NextResponse.json({ error: "Project is not published" }, { status: 403 })
      }
      // Increment play count — best-effort, doesn't block the response.
      db.project.update({
        where: { id },
        data: { playCount: { increment: 1 } },
      }).catch(() => {})

      return NextResponse.json({
        id: project.id,
        title: project.title,
        description: project.description,
        version: project.version,
        playCount: project.playCount,
        data: project.publishedData,
        isPublic: true,
      })
    }

    // Edit view: must have edit token or be the author.
    const editToken = req.headers.get("X-Edit-Token") ?? undefined
    const ok = await canEdit(id, editToken)
    if (!ok) {
      return NextResponse.json({ error: "Forbidden — need edit token or author session" }, { status: 403 })
    }

    return NextResponse.json({
      id: project.id,
      title: project.title,
      description: project.description,
      version: project.version,
      isPublic: project.isPublic,
      playCount: project.playCount,
      forkCount: project.forkCount,
      data: project.data,
      updatedAt: project.updatedAt,
    })
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error)
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 })
  }
}

// PUT /api/projects/[id] — update title/description/data
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => null)
    const parsed = UpdateProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update payload", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const ok = await canEdit(id, parsed.data.editToken)
    if (!ok) {
      return NextResponse.json({ error: "Forbidden — need edit token or author session" }, { status: 403 })
    }

    // If a new project data payload is provided, validate it.
    let serializedData: string | undefined
    if (parsed.data.data !== undefined) {
      const projectParse = ProjectSchema.safeParse(parsed.data.data)
      if (!projectParse.success) {
        return NextResponse.json(
          { error: "Invalid project data", details: projectParse.error.flatten() },
          { status: 400 },
        )
      }
      serializedData = JSON.stringify(projectParse.data)
    }

    const updated = await db.project.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(serializedData ? { data: serializedData } : {}),
      },
      select: {
        id: true,
        title: true,
        version: true,
        isPublic: true,
        updatedAt: true,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("PUT /api/projects/[id] error:", error)
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

// DELETE /api/projects/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const editToken = req.headers.get("X-Edit-Token") ?? undefined
    const ok = await canEdit(id, editToken)
    if (!ok) {
      return NextResponse.json({ error: "Forbidden — need edit token or author session" }, { status: 403 })
    }
    await db.project.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
