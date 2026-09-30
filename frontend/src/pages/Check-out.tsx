import { motion } from "framer-motion";
import {
  BedDouble,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  LogOut,
  Phone,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";

type Booking = {
  id: string;
  bookingNumber: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
  guest: { fullName: string; phone: string };
  room: { roomNumber: string; roomType: { name: string } };
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

export default function CheckOut() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [settleBookingId, setSettleBookingId] = useState<string | null>(null);
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
      setError(err instanceof ApiError ? err.message : "Could not load departures.");
    } finally {
      setLoading(false);
    }
  }

  const pendingDepartures = useMemo(() => {
    return bookings.filter((booking) => {
      const query = search.toLowerCase();

      const matchesSearch =
        booking.guest.fullName.toLowerCase().includes(query) ||
        booking.bookingNumber.toLowerCase().includes(query) ||
        booking.room.roomNumber.toLowerCase().includes(query) ||
        booking.guest.phone.includes(query);

      return matchesSearch && booking.status === "CHECKED_IN";
    });
  }, [bookings, search]);

  const checkedOutToday = bookings.filter(
    (booking) => booking.status === "CHECKED_OUT" && isToday(booking.checkOutDate)
  );

  const todaysDepartures = bookings.filter((booking) =>
    isToday(booking.checkOutDate)
  ).length;

  const outstandingBalance = pendingDepartures.reduce(
    (sum, booking) => sum + booking.balance,
    0
  );

  const checkOutGuest = async (booking: Booking) => {
    if (booking.balance > 0) {
      setSettleBookingId(booking.id);
      return;
    }

    setProcessingId(booking.id);

    try {
      await api.patch(`/bookings/${booking.id}/status`, { status: "CHECKED_OUT" });
      await loadBookings();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not check out guest.");
    } finally {
      setProcessingId(null);
    }
  };

  const settleAndCheckOut = async (bookingId: string, amount: number) => {
    setProcessingId(bookingId);

    try {
      if (amount > 0) {
        await api.post(`/bookings/${bookingId}/payments`, {
          amount,
          method: "CASH",
        });
      }

      await api.patch(`/bookings/${bookingId}/status`, { status: "CHECKED_OUT" });
      await loadBookings();
      setSettleBookingId(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not settle payment.");
    } finally {
      setProcessingId(null);
    }
  };

  const settleBooking = bookings.find((b) => b.id === settleBookingId) || null;

  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-center gap-2">
          <LogOut className="text-[#123c2c]" size={24} />
          <h1 className="text-2xl font-bold tracking-tight">Check-out</h1>
        </div>

        <p className="mt-1 text-sm text-gray-500">
          Process guest departures and settle outstanding balances.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Today's Departures"
          value={todaysDepartures.toString()}
          icon={<CalendarClock size={20} />}
        />

        <SummaryCard
          title="Awaiting Check-out"
          value={pendingDepartures.length.toString()}
          icon={<ClipboardList size={20} />}
        />

        <SummaryCard
          title="Outstanding Balance"
          value={`${outstandingBalance.toLocaleString()} ETB`}
          icon={<CreditCard size={20} />}
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
          Loading departures...
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-bold">Pending Departures</h3>

          {pendingDepartures.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center">
              <CheckCircle2 className="mx-auto text-gray-300" size={38} />
              <p className="mt-3 text-sm text-gray-500">
                No pending departures right now.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pendingDepartures.map((booking, index) => (
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
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                        booking.balance > 0
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {booking.balance > 0 ? "Pending Payment" : "Checked-in"}
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

                    <InfoItem label="Total" value={`${booking.totalAmount.toLocaleString()} ETB`} />
                    <InfoItem label="Balance" value={`${booking.balance.toLocaleString()} ETB`} />
                  </div>

                  <button
                    onClick={() => checkOutGuest(booking)}
                    disabled={processingId === booking.id}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#123c2c] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogOut size={16} />
                    {booking.balance > 0 ? "Settle & Check Out" : "Check Out"}
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {checkedOutToday.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="font-bold">Checked-out Today</h3>

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
                      {checkedOutToday.map((booking) => (
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
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              Checked-out
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

      {settleBooking && (
        <SettleModal
          booking={settleBooking}
          processing={processingId === settleBooking.id}
          onClose={() => setSettleBookingId(null)}
          onConfirm={(amount) => settleAndCheckOut(settleBooking.id, amount)}
        />
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

function SettleModal({
  booking,
  processing,
  onClose,
  onConfirm,
}: {
  booking: Booking;
  processing: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="my-5 w-full max-w-md rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-xl font-bold">Settle Balance</h2>
            <p className="mt-1 text-sm text-gray-500">
              {booking.guest.fullName} · Room {booking.room.roomNumber}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <XCircle size={21} />
          </button>
        </div>

        <div className="p-6">
          <div className="rounded-2xl bg-[#123c2c] p-5 text-white">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/70">Amount due</p>
              <p className="text-2xl font-bold">
                {booking.balance.toLocaleString()} ETB
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div>
                <p className="text-xs text-white/60">Total bill</p>
                <p className="mt-1 font-semibold">
                  {booking.totalAmount.toLocaleString()} ETB
                </p>
              </div>

              <div>
                <p className="text-xs text-white/60">Already paid</p>
                <p className="mt-1 font-semibold">
                  {booking.amountPaid.toLocaleString()} ETB
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 text-sm text-gray-500">
            Confirm that the remaining balance has been collected before
            checking this guest out.
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={() => onConfirm(booking.balance)}
              disabled={processing}
              className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? "Processing..." : "Confirm Payment & Check Out"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}