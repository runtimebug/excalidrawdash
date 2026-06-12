import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// IDs are app-generated UUIDs (no DB extension required, portable).
const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name"),
  password: text("password").notNull(), // bcrypt hash
  // Bumped to invalidate every outstanding session JWT for this account (logout,
  // and any future password-change / "sign out everywhere"). Embedded in the
  // token as `v` and re-checked server-side on each request.
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const folders = pgTable(
  "folders",
  {
    id: id(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#6965db"),
    position: integer("position").notNull().default(0),
    // Self-referencing parent for nested folders. When a parent is removed its
    // children are re-parented in the API (delete handler), so set-null here.
    parentId: text("parent_id").references((): AnyPgColumn => folders.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => ({
    userIdx: index("folders_user_idx").on(t.userId),
    parentIdx: index("folders_parent_idx").on(t.parentId),
  })
);

export const boards = pgTable(
  "boards",
  {
    id: id(),
    title: text("title").notNull().default("Untitled board"),
    // Excalidraw scene, stored as JSON strings.
    elements: text("elements").notNull().default("[]"),
    appState: text("app_state").notNull().default("{}"),
    files: text("files").notNull().default("{}"),
    thumbnail: text("thumbnail"), // small JPEG data URL rendered on save
    tags: text("tags").notNull().default(""), // comma-separated classification
    favorite: boolean("favorite").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    folderId: text("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => ({
    userIdx: index("boards_user_idx").on(t.userId),
    folderIdx: index("boards_folder_idx").on(t.folderId),
    userUpdatedIdx: index("boards_user_updated_idx").on(
      t.userId,
      t.updatedAt.desc()
    ),
  })
);

export type User = typeof users.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type Board = typeof boards.$inferSelect;
