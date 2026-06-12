import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, folders } from "@/db/schema";
import { handle, readJsonBody, requireSession, HttpError } from "@/lib/api";
import { updateBoardSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Hard ceiling on a board update body. Big enough for scenes with several
// embedded images (base64 in `files`), small enough to stop a single request
// from writing hundreds of MB. Enforced on the bytes actually received (see
// readJsonBody), not just the client-supplied Content-Length header.
const MAX_BODY_BYTES = 25 * 1024 * 1024;

type Params = { params: { id: string } };

async function ownedBoardOrThrow(userId: string, id: string) {
  const [board] = await db
    .select()
    .from(boards)
    .where(eq(boards.id, id))
    .limit(1);
  if (!board || board.userId !== userId) {
    throw new HttpError(404, "Board not found");
  }
  return board;
}

export async function GET(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const session = await requireSession();
    const board = await ownedBoardOrThrow(session.uid, params.id);
    return {
      board: {
        id: board.id,
        title: board.title,
        folderId: board.folderId,
        favorite: board.favorite,
        tags: board.tags ? board.tags.split(",").filter(Boolean) : [],
        elements: safeParse(board.elements, []),
        appState: safeParse(board.appState, {}),
        files: safeParse(board.files, {}),
        createdAt: board.createdAt.toISOString(),
        updatedAt: board.updatedAt.toISOString(),
      },
    };
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const session = await requireSession();
    await ownedBoardOrThrow(session.uid, params.id);

    const body = await readJsonBody(req, MAX_BODY_BYTES);
    const input = updateBoardSchema.parse(body);

    if (input.folderId) {
      const [folder] = await db
        .select({ id: folders.id, userId: folders.userId })
        .from(folders)
        .where(eq(folders.id, input.folderId))
        .limit(1);
      if (!folder || folder.userId !== session.uid) {
        throw new HttpError(404, "Folder not found");
      }
    }

    const data: Partial<typeof boards.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.title !== undefined) data.title = input.title;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.favorite !== undefined) data.favorite = input.favorite;
    if (input.folderId !== undefined) data.folderId = input.folderId;
    if (input.elements !== undefined)
      data.elements = JSON.stringify(input.elements);
    if (input.appState !== undefined)
      data.appState = JSON.stringify(input.appState);
    if (input.files !== undefined) data.files = JSON.stringify(input.files);
    if (input.thumbnail !== undefined) data.thumbnail = input.thumbnail;

    const [board] = await db
      .update(boards)
      .set(data)
      .where(eq(boards.id, params.id))
      .returning({ id: boards.id, updatedAt: boards.updatedAt });

    return { ok: true, id: board.id, updatedAt: board.updatedAt.toISOString() };
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const session = await requireSession();
    await ownedBoardOrThrow(session.uid, params.id);
    await db.delete(boards).where(eq(boards.id, params.id));
    return { ok: true };
  });
}

function safeParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
