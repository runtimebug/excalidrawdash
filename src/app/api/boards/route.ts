import { NextRequest } from "next/server";
import { and, asc, desc, eq, ilike, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { boards, folders } from "@/db/schema";
import { handle, readJsonBody, requireSession, HttpError } from "@/lib/api";
import {
  createBoardSchema,
  sceneColumns,
  MAX_BOARD_BODY_BYTES,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

// Columns for the dashboard grid — excludes the heavy scene payload.
const listColumns = {
  id: boards.id,
  title: boards.title,
  thumbnail: boards.thumbnail,
  tags: boards.tags,
  favorite: boards.favorite,
  folderId: boards.folderId,
  createdAt: boards.createdAt,
  updatedAt: boards.updatedAt,
};

type ListRow = {
  id: string;
  title: string;
  thumbnail: string | null;
  tags: string;
  favorite: boolean;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function serialize(b: ListRow) {
  return {
    id: b.id,
    title: b.title,
    thumbnail: b.thumbnail,
    favorite: b.favorite,
    folderId: b.folderId,
    tags: b.tags ? b.tags.split(",").filter(Boolean) : [],
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession();
    const { searchParams } = req.nextUrl;

    const q = searchParams.get("q")?.trim();
    const folder = searchParams.get("folder"); // folderId | "unfiled" | null(all)
    const tag = searchParams.get("tag")?.trim();
    const favorite = searchParams.get("favorite") === "1";
    const sort = searchParams.get("sort") ?? "updated";

    const conditions: SQL[] = [eq(boards.userId, session.uid)];
    if (q) conditions.push(ilike(boards.title, `%${q}%`)); // case-insensitive
    if (favorite) conditions.push(eq(boards.favorite, true));
    if (tag) conditions.push(ilike(boards.tags, `%${tag}%`));
    if (folder === "unfiled") conditions.push(isNull(boards.folderId));
    else if (folder) conditions.push(eq(boards.folderId, folder));

    const orderBy =
      sort === "created"
        ? desc(boards.createdAt)
        : sort === "title"
          ? asc(boards.title)
          : desc(boards.updatedAt);

    const rows = await db
      .select(listColumns)
      .from(boards)
      .where(and(...conditions))
      .orderBy(orderBy);

    return { boards: rows.map(serialize) };
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession();
    const body = await readJsonBody(req, MAX_BOARD_BODY_BYTES);
    const input = createBoardSchema.parse(body);
    const { title, folderId, tags } = input;

    if (folderId) {
      const [folder] = await db
        .select({ id: folders.id, userId: folders.userId })
        .from(folders)
        .where(eq(folders.id, folderId))
        .limit(1);
      if (!folder || folder.userId !== session.uid) {
        throw new HttpError(404, "Folder not found");
      }
    }

    const [board] = await db
      .insert(boards)
      .values({
        title: title && title.length > 0 ? title : "Untitled board",
        folderId: folderId ?? null,
        tags: tags ?? "",
        userId: session.uid,
        ...sceneColumns(input),
      })
      .returning(listColumns);

    return { board: serialize(board) };
  });
}
