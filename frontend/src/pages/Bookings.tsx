import { motion } from "framer-motion";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit3,
  Plus,
  Search,
  UserRound,
  XCircle,
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

type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "REFUNDED";

type Guest = { id: string; fullName: string; phone: string };

type RoomType = { id: string; name: string; basePrice: number };

type Room = {
  id: string;
  roomNumber: string;
  price: number | null;
  roomType: RoomType;
};

type Booking = {
  id: string;
  bookingNumber: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  nights: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  guest: Guest;
  room: Room;
};

const bookingStatusStyles: Record<BookingStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CHECKED_IN: "bg-blue-50 text-blue-700 border-blue-200",
  CHECKED_OUT: "bg-gray-50 text-gray-700 border-gray-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  NO_SHOW: "bg-red-50 text-red-700 border-red-200",
};

const bookingStatusLabels: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked-in",
  CHECKED_OUT: "Checked-out",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const paymentStyles: Record<PaymentStatus, string> = {
  PENDING: "bg-red-50 text-red-700",
  PARTIAL: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-50 text-emerald-700",
  REFUNDED: "bg-gray-50 text-gray-700",
};

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [bookingsRes, guestsRes, roomsRes] = await Promise.all([
        api.get<{ success: boolean; bookings: Booking[] }>("/bookings"),
        api.get<{ success: boolean; guests: Guest[] }>("/guests"),
        api.get<{ success: boolean; rooms: Room[] }>("/rooms"),
      ]);

      setBookings(bookingsRes.bookings);
      setGuests(guestsRes.guests);
      setRooms(roomsRes.rooms);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const query = search.toLowerCase();

      const matchesSearch =
        booking.bookingNumber.toLowerCase().includes(query) ||
        booking.guest.fullName.toLowerCase().includes(query) ||
        booking.room.roomNumber.toLowerCase().includes(query) ||
        booking.guest.phone.includes(query);

      const matchesStatus =
        statusFilter === "All" || booking.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  const cancelBooking = async (id: string) => {
    const confirmed = window.confirm("Cancel this booking?");
    if (!confirmed) return;

    try {
      await api.delete(`/bookings/${id}`);
      await loadAll();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not cancel booking.");
    }
  };

  const totalRevenue = bookings
    .filter((booking) => booking.status !== "CANCELLED")
    .reduce((sum, booking) => sum + booking.totalAmount, 0);

  const totalPaid = bookings.reduce((sum, booking) => sum + booking.amountPaid, 0);
  const totalBalance = totalRevenue - totalPaid;

  const createBooking = async (data: {
    guestId: string;
    roomId: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfGuests: number;
  }) => {
    try {
      await api.post("/bookings", data);
      await loadAll();
      setShowModal(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not create booking.");
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Manage reservations, guest stays, payments, and room bookings.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024]"
        >
          <Plus size={18} />
          New Booking
        </motion.button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Bookings"
          value={bookings.length.toString()}
          icon={<CalendarDays size={20} />}
        />

        <SummaryCard
          title="Confirmed"
          value={bookings.filter((b) => b.status === "CONFIRMED").length.toString()}
          icon={<CheckCircle2 size={20} />}
        />

        <SummaryCard
          title="Collected"
          value={`${totalPaid.toLocaleString()} ETB`}
          icon={<CreditCard size={20} />}
        />

        <SummaryCard
          title="Outstanding"
          value={`${Math.max(totalBalance, 0).toLocaleString()} ETB`}
          icon={<Clock3 size={20} />}
        />
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
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

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
          >
            <option>All</option>
            {(Object.keys(bookingStatusLabels) as BookingStatus[]).map((key) => (
              <option key={key} value={key}>
                {bookingStatusLabels[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading bookings...
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Booking
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Guest
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Room
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Stay
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Amount
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map((booking, index) => (
                    <motion.tr
                      key={booking.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.04 }}
                      className="border-b border-gray-100 last:border-0 transition hover:bg-[#f8faf8]"
                    >
                      <td className="px-5 py-5">
                        <p className="font-semibold">{booking.bookingNumber}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {booking.numberOfGuests} guest
                          {booking.numberOfGuests > 1 ? "s" : ""}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#123c2c]/10 text-[#123c2c]">
                            <UserRound size={17} />
                          </div>

                          <div>
                            <p className="font-medium">{booking.guest.fullName}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {booking.guest.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-medium">Room {booking.room.roomNumber}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {booking.room.roomType.name}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm font-medium">
                          {formatDate(booking.checkInDate)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          to {formatDate(booking.checkOutDate)}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-semibold">
                          {booking.totalAmount.toLocaleString()} ETB
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-1 text-[11px] font-medium ${paymentStyles[booking.paymentStatus]}`}
                        >
                          {booking.paymentStatus}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`rounded-full border px-2.5 py-1.5 text-xs font-medium ${bookingStatusStyles[booking.status]}`}
                        >
                          {bookingStatusLabels[booking.status]}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex justify-end gap-2">
                          {booking.status !== "CANCELLED" && booking.status !== "CHECKED_OUT" && (
                            <button
                              onClick={() => cancelBooking(booking.id)}
                              className="rounded-xl border border-red-100 p-2.5 text-red-500 transition hover:bg-red-50"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:hidden">
            {filteredBookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{booking.bookingNumber}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {booking.guest.fullName}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${bookingStatusStyles[booking.status]}`}
                  >
                    {bookingStatusLabels[booking.status]}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <InfoItem
                    label="Room"
                    value={`${booking.room.roomNumber} · ${booking.room.roomType.name}`}
                  />
                  <InfoItem label="Guests" value={booking.numberOfGuests.toString()} />
                  <InfoItem label="Check-in" value={formatDate(booking.checkInDate)} />
                  <InfoItem label="Check-out" value={formatDate(booking.checkOutDate)} />
                  <InfoItem
                    label="Total"
                    value={`${booking.totalAmount.toLocaleString()} ETB`}
                  />
                  <InfoItem label="Payment" value={booking.paymentStatus} />
                </div>

                {booking.status !== "CANCELLED" && booking.status !== "CHECKED_OUT" && (
                  <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
                    <button
                      onClick={() => cancelBooking(booking.id)}
                      className="flex-1 rounded-xl border border-red-100 py-2.5 text-sm font-medium text-red-500"
                    >
                      Cancel Booking
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {filteredBookings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <CalendarCheck className="mx-auto text-gray-300" size={42} />
              <h3 className="mt-4 font-semibold">No bookings found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing your search or filter.
              </p>
            </div>
          )}
        </>
      )}

      {showModal && (
        <BookingModal
          guests={guests}
          rooms={rooms}
          onClose={() => setShowModal(false)}
          onSave={createBooking}
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function BookingModal({
  guests,
  rooms,
  onClose,
  onSave,
}: {
  guests: Guest[];
  rooms: Room[];
  onClose: () => void;
  onSave: (data: {
    guestId: string;
    roomId: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfGuests: number;
  }) => void;
}) {
  const [guestId, setGuestId] = useState(guests[0]?.id || "");
  const [roomId, setRoomId] = useState(rooms[0]?.id || "");
  const [checkIn, setCheckIn] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [checkOut, setCheckOut] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [guestCount, setGuestCount] = useState(1);
  const [saving, setSaving] = useState(false);

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const price = selectedRoom ? Number(selectedRoom.price ?? selectedRoom.roomType.basePrice) : 0;

  const nights = Math.max(
    Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
    ),
    1
  );

  const total = nights * price;

  const handleSave = async () => {
    if (!guestId || !roomId) {
      return;
    }

    setSaving(true);

    try {
      await onSave({
        guestId,
        roomId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: guestCount,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="my-5 w-full max-w-2xl rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-xl font-bold">New Booking</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create a new guest reservation.
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
          {guests.length === 0 || rooms.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              You need at least one guest and one room before creating a booking.
            </p>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Guest</label>

                  <select
                    value={guestId}
                    onChange={(event) => setGuestId(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
                  >
                    {guests.map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.fullName} · {guest.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Number of guests
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={guestCount}
                    onChange={(event) => setGuestCount(Number(event.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Check-in</label>

                  <input
                    type="date"
                    value={checkIn}
                    onChange={(event) => setCheckIn(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Check-out</label>

                  <input
                    type="date"
                    value={checkOut}
                    onChange={(event) => setCheckOut(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium">Room</label>

                  <select
                    value={roomId}
                    onChange={(event) => setRoomId(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
                  >
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.roomNumber} · {room.roomType.name} ·{" "}
                        {Number(room.price ?? room.roomType.basePrice).toLocaleString()} ETB
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-[#123c2c] p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">Booking summary</p>
                    <p className="mt-1 text-lg font-bold">
                      {selectedRoom ? `Room ${selectedRoom.roomNumber}` : "-"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-white/60">Total</p>
                    <p className="text-2xl font-bold">
                      {total.toLocaleString()} ETB
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                  <div>
                    <p className="text-xs text-white/60">Nights</p>
                    <p className="mt-1 font-semibold">{nights}</p>
                  </div>

                  <div>
                    <p className="text-xs text-white/60">Rate</p>
                    <p className="mt-1 font-semibold">
                      {price.toLocaleString()} ETB
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving || guests.length === 0 || rooms.length === 0}
              className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Booking"}
            </button>
          </div>
        </div>
      </motion.div>
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