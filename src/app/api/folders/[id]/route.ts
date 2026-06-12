import { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { boards, folders } from "@/db/schema";
import { handle, readJsonBody, requireSession, HttpError } from "@/lib/api";
import { toFolderDTO } from "@/lib/folders";
import { updateFolderSchema } from "@/lib/validation";
import { collectDescendantIds } from "@/lib/folder-tree";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

async function ownedFolderOrThrow(userId: string, id: string) {
  const [folder] = await db
    .select()
    .from(folders)
    .where(eq(folders.id, id))
    .limit(1);
  if (!folder || folder.userId !== userId) {
    throw new HttpError(404, "Folder not found");
  }
  return folder;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const session = await requireSession();
    await ownedFolderOrThrow(session.uid, params.id);

    const body = await readJsonBody(req);
    const data = updateFolderSchema.parse(body);

    // Validate a parent change: must be owned and must not create a cycle.
    if (data.parentId !== undefined && data.parentId !== null) {
      if (data.parentId === params.id) {
        throw new HttpError(400, "A folder cannot be its own parent");
      }
      const all = await db
        .select({ id: folders.id, parentId: folders.parentId, position: folders.position })
        .from(folders)
        .where(eq(folders.userId, session.uid));
      const target = all.find((f) => f.id === data.parentId);
      if (!target) throw new HttpError(404, "Parent folder not found");
      const descendants = collectDescendantIds(all, params.id);
      if (descendants.has(data.parentId)) {
        throw new HttpError(400, "Cannot move a folder into its own subtree");
      }
    }

    const [folder] = await db
      .update(folders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(folders.id, params.id))
      .returning();

    const [countRow] = await db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(boards)
      .where(eq(boards.folderId, params.id));

    return { folder: toFolderDTO(folder, countRow?.c ?? 0) };
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const session = await requireSession();
    const folder = await ownedFolderOrThrow(session.uid, params.id);

    // Promote direct children up to the deleted folder's own parent so nested
    // folders aren't orphaned, then delete. Boards inside become Unfiled (FK).
    await db.transaction(async (tx) => {
      await tx
        .update(folders)
        .set({ parentId: folder.parentId })
        .where(eq(folders.parentId, params.id));
      await tx.delete(folders).where(eq(folders.id, params.id));
    });

    return { ok: true };
  });
}
