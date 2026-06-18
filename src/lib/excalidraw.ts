"use client";

// Client-side `.excalidraw` import + thumbnail helpers. The heavy
// `@excalidraw/excalidraw` bundle is lazy-imported (only for the thumbnail) so it
// never loads on first paint.

import { MAX_BOARD_BODY_BYTES } from "@/lib/validation";

// Loosely typed — we only forward these to Excalidraw's own helpers, which
// validate and migrate them.
export type Scene = {
  elements: readonly unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

// Same cap the server enforces on the POST body. file.size is a cheap early gate
// in readImportFile; importBoards re-checks the assembled body, which is what the
// server actually measures.
export const MAX_IMPORT_BYTES = MAX_BOARD_BODY_BYTES;

export type ImportErrorCode = "tooLarge" | "notJson" | "notExcalidraw";

export class ImportError extends Error {
  code: ImportErrorCode;
  constructor(code: ImportErrorCode) {
    super(code);
    this.name = "ImportError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Parse a `.excalidraw` file into a storable scene. Fields are kept as-authored —
// Excalidraw migrates them when the board is opened, so we don't normalize here.
export function parseExcalidrawFile(text: string): Scene {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError("notJson");
  }
  if (!isRecord(data)) throw new ImportError("notExcalidraw");

  // Reject library files (`.excalidrawlib`) and anything that isn't a scene.
  if (typeof data.type === "string" && data.type !== "excalidraw") {
    throw new ImportError("notExcalidraw");
  }
  if (!Array.isArray(data.elements)) throw new ImportError("notExcalidraw");

  return {
    elements: data.elements,
    appState: isRecord(data.appState) ? data.appState : {},
    files: isRecord(data.files) ? data.files : {},
  };
}

// file.size is an early reject; importBoards does the authoritative body check.
export async function readImportFile(file: File): Promise<Scene> {
  if (file.size > MAX_IMPORT_BYTES) throw new ImportError("tooLarge");
  return parseExcalidrawFile(await file.text());
}

/** Strip the path and `.excalidraw` extension to get a sensible board title. */
export function titleFromFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  return base.replace(/\.excalidraw$/i, "").trim().slice(0, 160);
}

// Serve Excalidraw's fonts/locale chunks from our own /public, not the CDN, so a
// self-hosted instance works offline. Idempotent.
export function ensureAssetPath() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { EXCALIDRAW_ASSET_PATH?: string };
  if (!w.EXCALIDRAW_ASSET_PATH) w.EXCALIDRAW_ASSET_PATH = "/";
}

// Best-effort JPEG thumbnail (data URL); undefined for empty scenes or on failure.
export async function buildSceneThumbnail(
  scene: Scene
): Promise<string | undefined> {
  if (scene.elements.length === 0) return undefined;
  try {
    ensureAssetPath();
    const { exportToCanvas } = await import("@excalidraw/excalidraw");
    const canvas = await exportToCanvas({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      elements: scene.elements as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appState: {
        ...(scene.appState as any),
        exportBackground: true,
        exportWithDarkMode: false,
        viewBackgroundColor: "#ffffff",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      files: scene.files as any,
      maxWidthOrHeight: 480,
      exportPadding: 12,
    });
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
}
