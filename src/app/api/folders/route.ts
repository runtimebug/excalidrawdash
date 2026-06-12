import { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { folders } from "@/db/schema";
import { handle, readJsonBody, requireSession, HttpError } from "@/lib/api";
import { listFoldersForUser, toFolderDTO } from "@/lib/folders";
import { createFolderSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const session = await requireSession();
    return { folders: await listFoldersForUser(session.uid) };
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession();
    const body = await readJsonBody(req);
    const { name, color, parentId } = createFolderSchema.parse(body);

    if (parentId) {
      const [parent] = await db
        .select({ id: folders.id, userId: folders.userId })
        .from(folders)
        .where(eq(folders.id, parentId))
        .limit(1);
      if (!parent || parent.userId !== session.uid) {
        throw new HttpError(404, "Parent folder not found");
      }
    }

    // Position is the count of existing siblings under the same parent.
    const [countRow] = await db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(folders)
      .where(
        and(
          eq(folders.userId, session.uid),
          parentId ? eq(folders.parentId, parentId) : sql`${folders.parentId} is null`
        )
      );

    const [folder] = await db
      .insert(folders)
      .values({
        name,
        color: color ?? "#6965db",
        parentId: parentId ?? null,
        position: countRow?.c ?? 0,
        userId: session.uid,
      })
      .returning();

    return { folder: toFolderDTO(folder, 0) };
  });
}
