import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ApiError, assetUrl } from "../api";
import { uploadImage } from "../imageUpload";

export default function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined) => {
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      onChange(await uploadImage(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload the photo.");
    } finally {
      setUploading(false);

      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {value ? (
          <img src={assetUrl(value)} alt="" className="h-44 w-full object-cover" />
        ) : (
          <div className="flex h-44 flex-col items-center justify-center gap-2 text-gray-400">
            <ImagePlus size={28} />
            <p className="text-xs">No photo yet</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => pick(event.target.files?.[0])}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-xl border border-[#123c2c]/30 px-4 py-2.5 text-sm font-semibold text-[#123c2c] transition hover:bg-[#123c2c]/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus size={16} />
          {uploading ? "Uploading..." : value ? "Replace photo" : "Choose photo"}
        </button>

        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-2 rounded-xl border border-red-100 px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
          >
            <Trash2 size={16} />
            Remove
          </button>
        )}
      </div>

      {hint && <p className="mt-2 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}