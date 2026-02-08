export interface CursorData {
  createdAt: string;
  id: string;
}

export function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export function decodeCursor(cursor: string): CursorData {
  const json = Buffer.from(cursor, "base64url").toString("utf-8");
  const data = JSON.parse(json);
  if (!data.createdAt || !data.id) {
    throw new Error("Invalid cursor");
  }
  return data;
}
