import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ProjectSchema } from "@/lib/runtime"
import crypto from "crypto"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"

const CreateProjectSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  // The full .gfpkg JSON object — validated by ProjectSchema.
  data: z.any(),
  isPublic: z.boolean().default(false),
})

function newEditToken(): string {
  return crypto.randomBytes(24).toString("hex")
}

// POST /api/projects — create a new project
// Returns: { id, editToken } — the client MUST persist editToken in localStorage.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = CreateProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid project payload", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    const { title, description, data, isPublic } = parsed.data

    // Validate the embedded .gfpkg payload against the Zod schema.
    // This catches malformed scene data early (bad wires, unknown devices, etc.).
    const projectParse = ProjectSchema.safeParse(data)
    if (!projectParse.success) {
      return NextResponse.json(
        { error: "Invalid project data", details: projectParse.error.flatten() },
        { status: 400 },
      )
    }

    // Attach author if the request is authenticated.
    let authorId: string | undefined
    try {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) authorId = session.user.id
    } catch {
      // NextAuth not configured or unavailable — proceed as anonymous.
    }

    const serialized = JSON.stringify(projectParse.data)
    const project = await db.project.create({
      data: {
        title,
        description: description ?? null,
        data: serialized,
        publishedData: isPublic ? serialized : null,
        isPublic,
        version: isPublic ? 1 : 0,
        editToken: newEditToken(),
        authorId,
      },
      select: {
        id: true,
        title: true,
        editToken: true,
        isPublic: true,
        version: true,
        createdAt: true,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("POST /api/projects error:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}

// GET /api/projects?scope=mine|public&limit=50&cursor=<id>
// Returns a list of project summaries (no embedded scene data — too big).
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const scope = url.searchParams.get("scope") ?? "public"
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100)

    let authorId: string | undefined
    try {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) authorId = session.user.id
    } catch {
      /* anonymous */
    }

    const where =
      scope === "mine" && authorId
        ? { authorId }
        : scope === "public"
          ? { isPublic: true }
          : { OR: [{ isPublic: true }, ...(authorId ? [{ authorId }] : [])] }

    const projects = await db.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        isPublic: true,
        version: true,
        playCount: true,
        forkCount: true,
        updatedAt: true,
        authorId: true,
      },
    })

    // For "mine" scope, also return whether the client has the edit token
    // in localStorage — the client decides this, but we can hint at it.
    return NextResponse.json({ projects, hasSession: !!authorId })
  } catch (error) {
    console.error("GET /api/projects error:", error)
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 })
  }
}
