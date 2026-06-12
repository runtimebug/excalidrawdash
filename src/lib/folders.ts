import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { boards, folders } from "@/db/schema";
import type { Folder as FolderRow } from "@/db/schema";
import type { FolderDTO } from "@/lib/types";

/** Shape a folder row into the JSON-friendly DTO the client consumes. */
export function toFolderDTO(folder: FolderRow, boardCount: number): FolderDTO {
  return {
    id: folder.id,
    name: folder.name,
    color: folder.color,
    position: folder.position,
    parentId: folder.parentId,
    boardCount,
  };
}

/** List a user's folders (ordered) with their per-folder board counts. */
export async function listFoldersForUser(userId: string): Promise<FolderDTO[]> {
  const rows = await db
    .select()
    .from(folders)
    .where(eq(folders.userId, userId))
    .orderBy(asc(folders.position), asc(folders.createdAt));

  const counts = await db
    .select({
      folderId: boards.folderId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(boards)
    .where(eq(boards.userId, userId))
    .groupBy(boards.folderId);
  const countByFolder = new Map(counts.map((c) => [c.folderId, c.count]));

  return rows.map((f) => toFolderDTO(f, countByFolder.get(f.id) ?? 0));
}
