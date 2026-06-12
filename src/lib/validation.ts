import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  name: z.string().trim().max(80).optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required").max(200),
});

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value");

export const createFolderSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  color: hexColor.optional(),
  parentId: z.string().nullable().optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  color: hexColor.optional(),
  position: z.number().int().optional(),
  parentId: z.string().nullable().optional(),
});

// Batch reorder/move payload used by drag-and-drop in the sidebar.
export const reorderFoldersSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string(),
        parentId: z.string().nullable(),
        position: z.number().int().min(0),
      })
    )
    .max(500),
});

export const createBoardSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  folderId: z.string().nullable().optional(),
  tags: z.string().max(300).optional(),
});

// Upper bounds on the scene payload so a single authenticated user can't balloon
// a row to exhaust storage. Generous enough for real Excalidraw scenes (embedded
// images live in `files`); the per-request size cap in the route is the backstop.
const MAX_ELEMENTS = 100_000;
// A 480px thumbnail data URL is well under this; the cap just stops abuse.
const MAX_THUMBNAIL_CHARS = 1_500_000;

// Only accept a real raster data URL for the thumbnail — it's rendered straight
// into <img src>, and this keeps arbitrary strings out of that attribute.
const thumbnailDataUrl = z
  .string()
  .max(MAX_THUMBNAIL_CHARS, "Thumbnail is too large")
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Invalid thumbnail");

// Excalidraw scene payload + metadata for updates. Scene fields are accepted as
// already-parsed JSON values and stored stringified.
export const updateBoardSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  folderId: z.string().nullable().optional(),
  tags: z.string().max(300).optional(),
  favorite: z.boolean().optional(),
  elements: z.array(z.any()).max(MAX_ELEMENTS).optional(),
  appState: z.record(z.any()).optional(),
  files: z.record(z.any()).optional(),
  thumbnail: thumbnailDataUrl.nullable().optional(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
