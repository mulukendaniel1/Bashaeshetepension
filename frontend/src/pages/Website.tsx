import { motion } from "framer-motion";
import {
  BedDouble,
  Edit3,
  Eye,
  EyeOff,
  Palette,
  Plus,
  Save,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, assetUrl } from "../api";
import ImageField from "../components/ImageField";

type RoomTypeRow = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  maxGuests: number;
  beds: number;
  imageUrl: string | null;
  isPublic: boolean;
  roomCount: number;
  customPriceRooms: number;
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white";

export default function Website() {
  const [tab, setTab] = useState<"types" | "content">("types");

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight">Website</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Change the room photos, prices, and text your guests see on the public website.
          </p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-medium transition hover:bg-gray-50"
        >
          View website
        </a>
      </div>

      <div className="flex gap-2">
        {(
          [
            { key: "types", label: "Room types" },
            { key: "content", label: "Site content" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
              tab === item.key
                ? "border-[#123c2c] bg-[#123c2c] text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-[#123c2c]/30"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "types" ? <RoomTypesTab /> : <SiteContentTab />}
    </div>
  );
}

function RoomTypesTab() {
  const [types, setTypes] = useState<RoomTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<RoomTypeRow | null>(null);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setError("");

    try {
      const res = await api.get<{ success: boolean; roomTypes: RoomTypeRow[] }>("/room-types");
      setTypes(res.roomTypes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load room types.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const toggleVisible = async (type: RoomTypeRow) => {
    try {
      await api.patch(`/room-types/${type.id}`, { isPublic: !type.isPublic });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not update the room type.");
    }
  };

  const remove = async (type: RoomTypeRow) => {
    if (!window.confirm(`Delete the room type "${type.name}"?`)) return;

    try {
      await api.delete(`/room-types/${type.id}`);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not delete the room type.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          The website shows the name, photo, price, and text of each visible room type.
        </p>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024]"
        >
          <Plus size={18} />
          Add Room Type
        </motion.button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading room types...
        </div>
      ) : types.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
          No room types yet. Add your first one.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {types.map((type) => (
            <div
              key={type.id}
              className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm"
            >
              {type.imageUrl ? (
                <img src={assetUrl(type.imageUrl)} alt={type.name} className="h-44 w-full object-cover" />
              ) : (
                <div className="flex h-44 items-center justify-center bg-gray-50 text-sm text-gray-400">
                  No photo yet
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold">{type.name}</h3>

                  {!type.isPublic && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      Hidden
                    </span>
                  )}
                </div>

                <p className="mt-1 text-lg font-bold text-[#123c2c]">
                  {type.basePrice.toLocaleString()} ETB
                  <span className="text-sm font-normal text-gray-500"> / night</span>
                </p>

                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users size={13} />
                    Up to {type.maxGuests}
                  </span>
                  <span className="flex items-center gap-1">
                    <BedDouble size={13} />
                    {type.beds} bed{type.beds > 1 ? "s" : ""}
                  </span>
                  <span>{type.roomCount} room{type.roomCount === 1 ? "" : "s"}</span>
                </div>

                {type.customPriceRooms > 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    {type.customPriceRooms} room{type.customPriceRooms > 1 ? "s have" : " has"} its own
                    price.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setEditing(type);
                      setShowModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium transition hover:bg-gray-50"
                  >
                    <Edit3 size={15} />
                    Edit
                  </button>

                  <button
                    onClick={() => toggleVisible(type)}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium transition hover:bg-gray-50"
                  >
                    {type.isPublic ? <EyeOff size={15} /> : <Eye size={15} />}
                    {type.isPublic ? "Hide" : "Show"}
                  </button>

                  <button
                    onClick={() => remove(type)}
                    className="rounded-xl border border-red-100 px-3 py-2 text-red-500 transition hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <RoomTypeModal
          type={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setShowModal(false);
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function RoomTypeModal({
  type,
  onClose,
  onSaved,
}: {
  type: RoomTypeRow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(type?.name || "");
  const [description, setDescription] = useState(type?.description || "");
  const [price, setPrice] = useState(type ? String(type.basePrice) : "");
  const [maxGuests, setMaxGuests] = useState(type ? String(type.maxGuests) : "2");
  const [beds, setBeds] = useState(type ? String(type.beds) : "1");
  const [imageUrl, setImageUrl] = useState<string | null>(type?.imageUrl || null);
  const [isPublic, setIsPublic] = useState(type?.isPublic ?? true);
  const [applyPrice, setApplyPrice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError("");

    if (name.trim().length < 2) {
      setError("Enter the room type name.");
      return;
    }

    if (!(Number(price) > 0)) {
      setError("Enter a price above zero.");
      return;
    }

    setSaving(true);

    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        basePrice: Number(price),
        maxGuests: Number(maxGuests) || 1,
        beds: Number(beds) || 1,
        imageUrl,
        isPublic,
        ...(type && applyPrice ? { applyPriceToRooms: true } : {}),
      };

      if (type) {
        await api.patch(`/room-types/${type.id}`, body);
      } else {
        await api.post("/room-types", body);
      }

      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the room type.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="my-5 w-full max-w-xl rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-xl font-bold">{type ? "Edit Room Type" : "Add Room Type"}</h2>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <XCircle size={21} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <ImageField
            label="Photo"
            value={imageUrl}
            onChange={setImageUrl}
            hint="A wide photo works best. It shows on the home page, the rooms page, and the booking page."
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">Name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Double Room"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Private bathroom, hot water, a desk, and a double bed."
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Price per night (ETB)</label>
              <input
                type="number"
                min="1"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Max guests</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxGuests}
                  onChange={(event) => setMaxGuests(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Beds</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={beds}
                  onChange={(event) => setBeds(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
              className="h-4 w-4"
            />
            Show this room type on the website
          </label>

          {type && type.customPriceRooms > 0 && (
            <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              <input
                type="checkbox"
                checked={applyPrice}
                onChange={(event) => setApplyPrice(event.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                {type.customPriceRooms} room{type.customPriceRooms > 1 ? "s have" : " has"} its own price.
                Tick this box to reset them to the price above.
              </span>
            </label>
          )}

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={save}
              disabled={saving}
              className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : type ? "Save Changes" : "Add Room Type"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const CONTENT_KEYS = [
  "siteHeroImage",
  "siteAboutImage",
  "siteTagline",
  "siteEmail",
  "siteHours",
  "siteMapQuery",
  "siteAboutText",
] as const;

type ContentKey = (typeof CONTENT_KEYS)[number];
type Content = Record<ContentKey, string>;

const emptyContent: Content = {
  siteHeroImage: "",
  siteAboutImage: "",
  siteTagline: "",
  siteEmail: "",
  siteHours: "",
  siteMapQuery: "",
  siteAboutText: "",
};

function SiteContentTab() {
  const [content, setContent] = useState<Content>(emptyContent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get<{ success: boolean; settings: Record<string, string> }>("/settings")
      .then((res) => {
        const next = { ...emptyContent };
        CONTENT_KEYS.forEach((key) => {
          next[key] = res.settings[key] ?? "";
        });
        setContent(next);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load the site content.")
      )
      .finally(() => setLoading(false));
  }, []);

  const update = (key: ContentKey, value: string) => {
    setContent((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");

    try {
      await api.put("/settings", content);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the site content.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        Loading site content...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm lg:grid-cols-2">
        <ImageField
          label="Home page photo"
          value={content.siteHeroImage || null}
          onChange={(url) => update("siteHeroImage", url || "")}
          hint="The big photo behind the welcome panel. Use a wide photo of your building."
        />

        <ImageField
          label="About page photo"
          value={content.siteAboutImage || null}
          onChange={(url) => update("siteAboutImage", url || "")}
          hint="Shows next to your story on the About page."
        />
      </div>

      <div className="grid gap-5 rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium">Tagline</label>
          <input
            value={content.siteTagline}
            onChange={(event) => update("siteTagline", event.target.value)}
            placeholder="A quiet, comfortable stay with warm hospitality."
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Public email</label>
          <input
            type="email"
            value={content.siteEmail}
            onChange={(event) => update("siteEmail", event.target.value)}
            placeholder="info@bashaeshetepension.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Opening hours text</label>
          <input
            value={content.siteHours}
            onChange={(event) => update("siteHours", event.target.value)}
            placeholder="Front desk open 24 hours"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium">Map search text</label>
          <input
            value={content.siteMapQuery}
            onChange={(event) => update("siteMapQuery", event.target.value)}
            placeholder="Basha Eshete Pension"
            className={inputClass}
          />
          <p className="mt-2 text-xs text-gray-500">
            The Contact page uses your address for the map. This text works when the address is empty.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium">About page story</label>
          <textarea
            value={content.siteAboutText}
            onChange={(event) => update("siteAboutText", event.target.value)}
            rows={6}
            placeholder="Write your story here. Leave a blank line between paragraphs."
            className={inputClass}
          />
        </div>

        <p className="text-xs text-gray-500 sm:col-span-2">
          A blank field uses the built-in text. Change your phone, address, and check-in times on the{" "}
          <Link to="/settings" className="font-semibold text-[#123c2c]">
            Settings page
          </Link>
          .
        </p>
      </div>

      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={18} />
          {saving ? "Saving..." : "Save Changes"}
        </motion.button>

        {saved && <p className="text-sm text-emerald-600">Saved. The website shows it now.</p>}
      </div>
    </div>
  );
}