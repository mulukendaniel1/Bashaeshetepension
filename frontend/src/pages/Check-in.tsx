import { motion } from "framer-motion";
import {
  BedDouble,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LogIn,
  Phone,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";

type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

type Booking = {
  id: string;
  bookingNumber: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  status: BookingStatus;
  guest: { fullName: string; phone: string };
  room: { roomNumber: string; roomType: { name: string } };
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function isToday(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default function CheckIn() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get<{ success: boolean; bookings: Booking[] }>(
        "/bookings"
      );
      setBookings(res.bookings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load arrivals.");
    } finally {
      setLoading(false);
    }
  }

  const pendingArrivals = useMemo(() => {
    return bookings.filter((booking) => {
      const query = search.toLowerCase();

      const matchesSearch =
        booking.guest.fullName.toLowerCase().includes(query) ||
        booking.bookingNumber.toLowerCase().includes(query) ||
        booking.room.roomNumber.toLowerCase().includes(query) ||
        booking.guest.phone.includes(query);

      const isArrival =
        booking.status === "PENDING" || booking.status === "CONFIRMED";

      return matchesSearch && isArrival;
    });
  }, [bookings, search]);

  const checkedInToday = bookings.filter(
    (booking) => booking.status === "CHECKED_IN" && isToday(booking.checkInDate)
  );

  const todaysArrivals = bookings.filter((booking) =>
    isToday(booking.checkInDate)
  ).length;

  const checkInGuest = async (id: string) => {
    setProcessingId(id);

    try {
      await api.patch(`/bookings/${id}/status`, { status: "CHECKED_IN" });
      await loadBookings();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not check in guest.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-center gap-2">
          <LogIn className="text-[#123c2c]" size={24} />
          <h1 className="text-2xl font-bold tracking-tight">Check-in</h1>
        </div>

        <p className="mt-1 text-sm text-gray-500">
          Process guest arrivals from confirmed bookings.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Today's Arrivals"
          value={todaysArrivals.toString()}
          icon={<CalendarClock size={20} />}
        />

        <SummaryCard
          title="Awaiting Check-in"
          value={pendingArrivals.length.toString()}
          icon={<ClipboardList size={20} />}
        />

        <SummaryCard
          title="Checked-in Today"
          value={checkedInToday.length.toString()}
          icon={<CheckCircle2 size={20} />}
        />
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search guest, booking reference, room, or phone..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#123c2c] focus:bg-white focus:ring-4 focus:ring-[#123c2c]/5"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading arrivals...
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-bold">Pending Arrivals</h3>

          {pendingArrivals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center">
              <CheckCircle2 className="mx-auto text-gray-300" size={38} />
              <p className="mt-3 text-sm text-gray-500">
                No pending arrivals right now.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pendingArrivals.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#123c2c]/10 text-[#123c2c]">
                        <UserRound size={18} />
                      </div>

                      <div>
                        <p className="font-semibold">{booking.guest.fullName}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {booking.bookingNumber}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[booking.status]}`}
                    >
                      {booking.status === "PENDING" ? "Pending" : "Confirmed"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                    <InfoItem
                      icon={<BedDouble size={14} />}
                      label="Room"
                      value={`${booking.room.roomNumber} · ${booking.room.roomType.name}`}
                    />

                    <InfoItem
                      icon={<Phone size={14} />}
                      label="Phone"
                      value={booking.guest.phone}
                    />

                    <InfoItem label="Guests" value={booking.numberOfGuests.toString()} />
                    <InfoItem label="Check-out" value={formatDate(booking.checkOutDate)} />
                  </div>

                  <button
                    onClick={() => checkInGuest(booking.id)}
                    disabled={processingId === booking.id}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#123c2c] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogIn size={16} />
                    {processingId === booking.id ? "Checking in..." : "Check In"}
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {checkedInToday.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="font-bold">Checked-in Today</h3>

              <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Guest
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Room
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Reference
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {checkedInToday.map((booking) => (
                        <tr key={booking.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-5 py-4 text-sm font-medium">
                            {booking.guest.fullName}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">
                            Room {booking.room.roomNumber}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {booking.bookingNumber}
                          </td>
                          <td className="px-5 py-4">
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              Checked-in
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-lg"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        <div className="rounded-xl bg-[#123c2c]/10 p-2.5 text-[#123c2c]">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </motion.div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-gray-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}