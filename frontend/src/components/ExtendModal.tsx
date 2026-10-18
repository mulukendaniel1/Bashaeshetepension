import { CalendarPlus, XCircle } from "lucide-react";
import { useState } from "react";
import { api, ApiError } from "../api";

// Add days to a stay. The server checks that the room is free for the extra days.
export default function ExtendModal({
  booking,
  onClose,
  onDone,
}: {
  booking: {
    id: string;
    bookingNumber: string;
    checkOutDate: string;
    pricePerNight: number;
    guest: { fullName: string };
  };
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [days, setDays] = useState(1);
  const [saving, setSaving] = useState(false);

  const safeDays = Number.isFinite(days) && days >= 1 ? Math.floor(days) : 1;

  const newCheckOut = new Date(new Date(booking.checkOutDate).getTime() + safeDays * 86400000);
  const extra = Number(booking.pricePerNight) * safeDays;

  const format = (date: Date) =>
    date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const submit = async () => {
    setSaving(true);

    try {
      await api.patch(`/bookings/${booking.id}/extend`, { days: safeDays });
      await onDone();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not extend the stay.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <div className="my-5 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Extend stay</h2>
            <p className="mt-1 text-sm text-gray-500">
              {booking.guest.fullName} · {booking.bookingNumber}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <XCircle size={21} />
          </button>
        </div>

        <p className="mt-5 text-sm text-gray-600">
          Now leaving on <span className="font-semibold">{format(new Date(booking.checkOutDate))}</span>
        </p>

        <label className="mb-2 mt-4 block text-sm font-medium">Days to add</label>

        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 5, 7].map((value) => (
            <button
              key={value}
              onClick={() => setDays(value)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                safeDays === value
                  ? "border-[#123c2c] bg-[#123c2c]/5 text-[#123c2c]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              +{value}
            </button>
          ))}

          <input
            type="number"
            min="1"
            max="60"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="w-24 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#123c2c]"
          />
        </div>

        <div className="mt-5 rounded-2xl bg-[#f6f8f6] p-4 text-sm">
          <p className="flex justify-between">
            <span className="text-gray-500">New check-out</span>
            <span className="font-semibold">{format(newCheckOut)}</span>
          </p>
          <p className="mt-2 flex justify-between">
            <span className="text-gray-500">
              {safeDays} night{safeDays > 1 ? "s" : ""} x {Number(booking.pricePerNight).toLocaleString()} ETB
            </span>
            <span className="font-semibold">+{extra.toLocaleString()} ETB</span>
          </p>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          The extra amount joins the balance of the booking. The guest pays it at check-out or earlier.
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
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:bg-[#0d3024] disabled:opacity-60"
          >
            <CalendarPlus size={16} />
            {saving ? "Saving..." : "Extend"}
          </button>
        </div>
      </div>
    </div>
  );
}