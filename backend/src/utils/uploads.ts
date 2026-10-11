import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Folder for photos uploaded from the admin Website page.
// On the host, set UPLOAD_DIR to a folder outside the app folder so a new deploy never removes photos.
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), "uploads");

export const UPLOAD_URL_PREFIX = "/api/uploads/";

const MAX_BYTES = 1_500_000;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function safeError(message: string, status = 400) {
  return Object.assign(new Error(message), { status, safe: true });
}

function detectType(buffer: Buffer): "jpg" | "png" | "webp" | null {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }

  if (
    buffer.length > 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }

  if (
    buffer.length > 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

// Saves a photo sent as a data URL. Returns the link the website uses to show it.
export async function saveImageFromDataUrl(dataUrl: string): Promise<string> {
  const comma = dataUrl.indexOf(",");

  if (!dataUrl.startsWith("data:image/") || comma === -1 || !dataUrl.slice(0, comma).endsWith(";base64")) {
    throw safeError("Choose a JPG, PNG, or WebP photo.");
  }

  const buffer = Buffer.from(dataUrl.slice(comma + 1), "base64");

  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw safeError("The photo is too large. Choose a smaller photo.");
  }

  // Trust the file bytes, not the name or the declared type.
  const type = detectType(buffer);

  if (!type) {
    throw safeError("Choose a JPG, PNG, or WebP photo.");
  }

  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${type}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), buffer);

  return `${UPLOAD_URL_PREFIX}${name}`;
}

// Deletes a photo saved by saveImageFromDataUrl. Other links are ignored.
export async function removeUpload(url: string | null | undefined) {
  if (!url || !url.startsWith(UPLOAD_URL_PREFIX)) return;

  const name = path.basename(url.slice(UPLOAD_URL_PREFIX.length));
  const file = path.join(UPLOAD_DIR, name);

  if (path.dirname(file) !== UPLOAD_DIR) return;

  await fs.promises.unlink(file).catch(() => undefined);
}