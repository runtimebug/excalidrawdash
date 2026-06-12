import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { folders } from "@/db/schema";
import { handle, readJsonBody, requireSession, HttpError } from "@/lib/api";
import { reorderFoldersSchema } from "@/lib/validation";
import { hasCycle } from "@/lib/folder-tree";

export const dynamic = "force-dynamic";

// Batch move/reorder folders (used by sidebar drag-and-drop). Each update sets
// a folder's parent and position; the whole set is validated for ownership and
// for cycles before anything is written.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession();
    const body = await readJsonBody(req);
    const { updates } = reorderFoldersSchema.parse(body);
    if (updates.length === 0) return { ok: true };

    const all = await db
      .select({ id: folders.id, parentId: folders.parentId })
      .from(folders)
      .where(eq(folders.userId, session.uid));
    const owned = new Set(all.map((f) => f.id));

    for (const u of updates) {
      if (!owned.has(u.id)) throw new HttpError(404, "Folder not found");
      if (u.parentId && !owned.has(u.parentId)) {
        throw new HttpError(404, "Parent folder not found");
      }
    }

    // Build the resulting parent map and reject if it would create a cycle.
    const parentOf = new Map<string, string | null>(
      all.map((f) => [f.id, f.parentId])
    );
    for (const u of updates) parentOf.set(u.id, u.parentId);
    if (hasCycle(parentOf)) {
      throw new HttpError(400, "That move would create a cycle");
    }

    await db.transaction(async (tx) => {
      for (const u of updates) {
        await tx
          .update(folders)
          .set({ parentId: u.parentId, position: u.position, updatedAt: new Date() })
          .where(eq(folders.id, u.id));
      }
    });

    return { ok: true };
  });
}
