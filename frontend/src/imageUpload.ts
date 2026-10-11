import { api, ApiError } from "./api";

const MAX_SIDE = 1600;
const MAX_BYTES = 1_000_000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ApiError("Could not read this photo. Use a JPG or PNG file.", 400));
    };

    img.src = url;
  });
}

// Shrinks the photo in the browser, so uploads stay fast on a phone connection.
async function compress(file: File): Promise<string> {
  const img = await loadImage(file);

  let side = MAX_SIDE;
  let quality = 0.82;

  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, side / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));

    const context = canvas.getContext("2d");
    if (!context) break;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);

    if (dataUrl.length * 0.75 <= MAX_BYTES) return dataUrl;

    quality = Math.max(0.6, quality - 0.08);
    side = Math.round(side * 0.85);
  }

  throw new ApiError("This photo is too large. Choose a smaller photo.", 400);
}

// Sends the photo to the server. Returns the link to save with the room type or the setting.
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new ApiError("Choose an image file.", 400);
  }

  const dataUrl = await compress(file);
  const res = await api.post<{ success: boolean; url: string }>("/uploads", { dataUrl });

  return res.url;
}