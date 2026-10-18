import { XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";

type GuestOption = {
  id: string;
  fullName: string;
  phone: string;
  idNumber?: string | null;
};

// Give a booking to another guest, for example when one person reserved several rooms.
export default function ChangeGuestModal({
  booking,
  onClose,
  onDone,
}: {
  booking: { id: string; bookingNumber: string; guest: { fullName: string } };
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [guests, setGuests] = useState<GuestOption[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [query, setQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<GuestOption | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<{ success: boolean; guests: GuestOption[] }>("/guests")
      .then((res) => setGuests(res.guests))
      .catch(() => setGuests([]));
  }, []);

  const matches = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return [];

    return guests
      .filter(
        (guest) =>
          guest.fullName.toLowerCase().includes(text) ||
          guest.phone.includes(text) ||
          (guest.idNumber || "").toLowerCase().includes(text)
      )
      .slice(0, 5);
  }, [guests, query]);

  const submit = async () => {
    if (mode === "existing" && !selectedGuest) {
      alert("Choose a guest from the list.");
      return;
    }

    if (mode === "new" && (fullName.trim().length < 2 || phone.trim().length < 3)) {
      alert("Enter the full name and the phone number.");
      return;
    }

    setSaving(true);

    try {
      await api.patch(
        `/bookings/${booking.id}/guest`,
        mode === "existing"
          ? { guestId: selectedGuest!.id }
          : { fullName: fullName.trim(), phone: phone.trim() }
      );

      await onDone();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not change the guest.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <div className="my-5 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Change guest name</h2>
            <p className="mt-1 text-sm text-gray-500">
              {booking.bookingNumber} · now under {booking.guest.fullName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <XCircle size={21} />
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setMode("new")}
            className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
              mode === "new"
                ? "border-[#123c2c] bg-[#123c2c]/5 text-[#123c2c]"
                : "border-gray-200 text-gray-600"
            }`}
          >
            New guest
          </button>

          <button
            onClick={() => setMode("existing")}
            className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
              mode === "existing"
                ? "border-[#123c2c] bg-[#123c2c]/5 text-[#123c2c]"
                : "border-gray-200 text-gray-600"
            }`}
          >
            Existing guest
          </button>
        </div>

        {mode === "new" ? (
          <div className="mt-4 space-y-3">
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Full name of the guest who arrives"
              className={inputClass}
            />

            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone number"
              className={inputClass}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedGuest(null);
              }}
              placeholder="Search by name, phone or ID number"
              className={inputClass}
            />

            {selectedGuest && (
              <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
                Selected: {selectedGuest.fullName} · {selectedGuest.phone}
              </p>
            )}

            {!selectedGuest &&
              matches.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => {
                    setSelectedGuest(guest);
                    setQuery(guest.fullName);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-100 px-4 py-2.5 text-left text-sm transition hover:bg-gray-50"
                >
                  <span className="font-medium">{guest.fullName}</span>
                  <span className="text-xs text-gray-500">{guest.phone}</span>
                </button>
              ))}
          </div>
        )}

        <p className="mt-4 text-xs text-gray-500">
          Only this room changes. The other rooms of {booking.guest.fullName} keep their own
          bookings.
        </p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:bg-[#0d3024] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}