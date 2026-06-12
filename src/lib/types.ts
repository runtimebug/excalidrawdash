// Shared client/server DTO types (plain JSON-friendly shapes).

export type FolderDTO = {
  id: string;
  name: string;
  color: string;
  position: number;
  parentId: string | null;
  boardCount: number;
};

export type BoardSummary = {
  id: string;
  title: string;
  thumbnail: string | null;
  tags: string[];
  favorite: boolean;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BoardDetail = {
  id: string;
  title: string;
  folderId: string | null;
  favorite: boolean;
  tags: string[];
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

export type SortKey = "updated" | "created" | "title";
