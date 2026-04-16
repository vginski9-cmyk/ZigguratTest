import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { savedQueries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET() {
  try {
    const queries = db
      .select()
      .from(savedQueries)
      .orderBy(desc(savedQueries.createdAt))
      .all();

    return NextResponse.json(
      queries.map((q) => ({
        ...q,
        queryParams: JSON.parse(q.queryParams),
      }))
    );
  } catch (error) {
    console.error("[queries] Error:", error);
    return NextResponse.json({ error: "Failed to fetch queries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, queryParams } = body;

    if (!name || !queryParams) {
      return NextResponse.json({ error: "name and queryParams required" }, { status: 400 });
    }

    const id = uuid();
    db.insert(savedQueries)
      .values({
        id,
        name,
        description: description || null,
        queryParams: JSON.stringify(queryParams),
        createdAt: new Date().toISOString(),
      })
      .run();

    return NextResponse.json({ id, name });
  } catch (error) {
    console.error("[queries] Error:", error);
    return NextResponse.json({ error: "Failed to save query" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    db.delete(savedQueries).where(eq(savedQueries.id, id)).run();
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[queries] Error:", error);
    return NextResponse.json({ error: "Failed to delete query" }, { status: 500 });
  }
}
