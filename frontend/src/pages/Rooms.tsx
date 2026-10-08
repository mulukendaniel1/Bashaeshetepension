import { motion } from "framer-motion";
import {
  BedDouble,
  Building2,
  CalendarPlus,
  Edit3,
  LogIn,
  LogOut,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import RecordPayment from "../components/RecordPayment";

type RoomStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "RESERVED"
  | "CLEANING"
  | "MAINTENANCE";

type RoomType = {
  id: string;
  name: string;
  basePrice: number;
  maxGuests: number;
  beds: number;
};

type Room = {
  id: string;
  roomNumber: string;
  floor: string | null;
  status: RoomStatus;
  price: number | null;
  description: string | null;
  roomTypeId: string;
  roomType: RoomType;
};

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
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: BookingStatus;
  guest: { id: string; fullName: string; phone: string };
};

type Guest = {
  id: string;
  fullName: string;
  phone: string;
  idNumber: string | null;
};

type RoomBookings = { current?: Booking; upcoming?: Booking };

const statusStyles: Record<RoomStatus, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OCCUPIED: "bg-blue-50 text-blue-700 border-blue-200",
  CLEANING: "bg-amber-50 text-amber-700 border-amber-200",
  RESERVED: "bg-purple-50 text-purple-700 border-purple-200",
  MAINTENANCE: "bg-gray-50 text-gray-700 border-gray-200",
};

const statusLabels: Record<RoomStatus, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  RESERVED: "Reserved",
  MAINTENANCE: "Maintenance",
};

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    setError("");

    try {
      const [roomsRes, typesRes, bookingsRes] = await Promise.all([
        api.get<{ success: boolean; rooms: Room[] }>("/rooms"),
        api.get<{ success: boolean; roomTypes: RoomType[] }>("/rooms/types"),
        api.get<{ success: boolean; bookings: Booking[] }>("/bookings"),
      ]);

      setRooms(roomsRes.rooms);
      setRoomTypes(typesRes.roomTypes);
      setBookings(bookingsRes.bookings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load rooms.");
    } finally {
      setLoading(false);
    }
  }

  // The guest staying now and the next guest arriving, for every room.
  const bookingsByRoom = useMemo(() => {
    const map: Record<string, RoomBookings> = {};

    const sorted = [...bookings].sort(
      (a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime()
    );

    for (const booking of sorted) {
      const entry = map[booking.roomId] || (map[booking.roomId] = {});

      if (booking.status === "CHECKED_IN") {
        entry.current = booking;
      } else if (
        (booking.status === "PENDING" || booking.status === "CONFIRMED") &&
        !entry.upcoming
      ) {
        entry.upcoming = booking;
      }
    }

    return map;
  }, [bookings]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const query = search.toLowerCase();

      const guestName =
        bookingsByRoom[room.id]?.current?.guest.fullName ||
        bookingsByRoom[room.id]?.upcoming?.guest.fullName ||
        "";

      const matchesSearch =
        room.roomNumber.toLowerCase().includes(query) ||
        room.roomType.name.toLowerCase().includes(query) ||
        guestName.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || room.status === statusFilter;

      const matchesType =
        typeFilter === "All" || room.roomType.name === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [rooms, bookingsByRoom, search, statusFilter, typeFilter]);

  const deleteRoom = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this room?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/rooms/${id}`);
      setRooms((current) => current.filter((room) => room.id !== id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not delete room.");
    }
  };

  const openAddModal = () => {
    setEditingRoom(null);
    setShowModal(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setShowModal(true);
  };

  const saveRoom = async (data: {
    roomNumber: string;
    floor: string;
    status: RoomStatus;
    price: number;
    description: string;
    roomTypeId: string;
  }) => {
    try {
      if (editingRoom) {
        const res = await api.patch<{ success: boolean; room: Room }>(
          `/rooms/${editingRoom.id}`,
          data
        );
        setRooms((current) =>
          current.map((room) => (room.id === editingRoom.id ? res.room : room))
        );
      } else {
        await api.post<{ success: boolean; room: Room }>("/rooms", data);
        await loadData();
      }

      setShowModal(false);
      setEditingRoom(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not save room.");
    }
  };

  const changeBookingStatus = async (
    booking: Booking,
    status: "CHECKED_IN" | "CHECKED_OUT"
  ) => {
    try {
      await api.patch(`/bookings/${booking.id}/status`, { status });
      await loadData(true);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not update booking.");
    }
  };

  // Row buttons. They act at once when nothing is missing.
  // If a payment or a balance needs attention, they open the room popup.
  const rowCheckIn = async (room: Room, booking: Booking) => {
    if (Number(booking.amountPaid) <= 0) {
      setSelectedRoomId(room.id);
      return;
    }

    const confirmed = window.confirm(
      `Check in ${booking.guest.fullName} to Room ${room.roomNumber}?`
    );

    if (!confirmed) return;

    await changeBookingStatus(booking, "CHECKED_IN");
  };

  const rowCheckOut = async (room: Room, booking: Booking) => {
    if (Number(booking.balance) > 0) {
      setSelectedRoomId(room.id);
      return;
    }

    const confirmed = window.confirm(
      `Check out ${booking.guest.fullName} from Room ${room.roomNumber}? The room goes to Cleaning.`
    );

    if (!confirmed) return;

    await changeBookingStatus(booking, "CHECKED_OUT");
  };

  const uniqueTypeNames = useMemo(
    () => Array.from(new Set(roomTypes.map((type) => type.name))),
    [roomTypes]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: rooms.length };

    (Object.keys(statusLabels) as RoomStatus[]).forEach((status) => {
      counts[status] = rooms.filter((room) => room.status === status).length;
    });

    return counts;
  }, [rooms]);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || null;

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight">Rooms</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Click a room to book, check in, check out, and manage its guest.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024]"
        >
          <Plus size={18} />
          Add Room
        </motion.button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        {(["All", "AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE"] as const).map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-2xl border p-4 text-left transition ${
                statusFilter === status
                  ? "border-[#123c2c] bg-[#123c2c]/5"
                  : "border-black/5 bg-white hover:border-[#123c2c]/20"
              }`}
            >
              <p className="text-xs text-gray-500">
                {status === "All" ? "All" : statusLabels[status]}
              </p>
              <p className="mt-1 text-xl font-bold">
                {statusCounts[status] || 0}
              </p>
            </button>
          )
        )}
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
              placeholder="Search room number, type, or guest..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#123c2c] focus:bg-white focus:ring-4 focus:ring-[#123c2c]/5"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
          >
            <option>All</option>
            {uniqueTypeNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading rooms...
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Building2 className="mx-auto text-gray-300" size={42} />
          <h3 className="mt-4 font-semibold">No rooms found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try changing your search or filter, or add a new room.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRooms.map((room, index) => {
            const entry = bookingsByRoom[room.id] || {};
            const guestBooking = entry.current || entry.upcoming;

            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.4) }}
                onClick={() => setSelectedRoomId(room.id)}
                className="cursor-pointer rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:border-[#123c2c]/30 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-[#123c2c]/10 text-lg font-bold text-[#123c2c]">
                      {room.roomNumber}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">Room {room.roomNumber}</p>

                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[room.status]}`}
                        >
                          {statusLabels[room.status]}
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs text-gray-500">
                        {room.roomType.name}
                        {room.floor ? ` · ${room.floor}` : ""} ·{" "}
                        {Number(room.price ?? room.roomType.basePrice).toLocaleString()} ETB / night
                      </p>

                      {guestBooking && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                          <UserRound size={13} />
                          {guestBooking.guest.fullName}
                          <span className="text-gray-400">
                            · {entry.current ? "staying now" : "arriving"} · {guestBooking.bookingNumber}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {entry.upcoming && !entry.current && (
                      <button
                        onClick={() => rowCheckIn(room, entry.upcoming as Booking)}
                        className="flex items-center gap-1.5 rounded-xl bg-[#123c2c] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3024]"
                      >
                        <LogIn size={15} />
                        Check In
                      </button>
                    )}

                    {entry.current && (
                      <button
                        onClick={() => rowCheckOut(room, entry.current as Booking)}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                      >
                        <LogOut size={15} />
                        Check Out
                      </button>
                    )}

                    {room.status === "AVAILABLE" && !entry.current && !entry.upcoming && (
                      <button
                        onClick={() => setSelectedRoomId(room.id)}
                        className="flex items-center gap-1.5 rounded-xl border border-[#123c2c]/30 px-3.5 py-2 text-sm font-semibold text-[#123c2c] transition hover:bg-[#123c2c]/5"
                      >
                        <CalendarPlus size={15} />
                        Book
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(room)}
                      className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium transition hover:bg-gray-50"
                    >
                      <Edit3 size={15} />
                      Edit
                    </button>

                    <button
                      onClick={() => deleteRoom(room.id)}
                      className="rounded-xl border border-red-100 px-3 py-2 text-red-500 transition hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          current={bookingsByRoom[selectedRoom.id]?.current}
          upcoming={bookingsByRoom[selectedRoom.id]?.upcoming}
          onClose={() => setSelectedRoomId(null)}
          onChanged={() => loadData(true)}
        />
      )}

      {showModal && (
        <RoomModal
          room={editingRoom}
          roomTypes={roomTypes}
          onClose={() => {
            setShowModal(false);
            setEditingRoom(null);
          }}
          onSave={saveRoom}
        />
      )}
    </div>
  );
}

function RoomDetailModal({
  room,
  current,
  upcoming,
  onClose,
  onChanged,
}: {
  room: Room;
  current?: Booking;
  upcoming?: Booking;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const changeStatus = async (
    booking: Booking,
    status: "CHECKED_IN" | "CHECKED_OUT"
  ) => {
    setBusy(true);

    try {
      await api.patch(`/bookings/${booking.id}/status`, { status });
      await onChanged();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not update booking.");
    } finally {
      setBusy(false);
    }
  };

  const price = Number(room.price ?? room.roomType.basePrice);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="my-5 w-full max-w-2xl rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Room {room.roomNumber}</h2>

            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[room.status]}`}
            >
              {statusLabels[room.status]}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <XCircle size={21} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Detail label="Type" value={room.roomType.name} />
            <Detail label="Floor" value={room.floor || "-"} />
            <Detail
              label="Beds"
              value={room.roomType.beds.toString()}
              icon={<BedDouble size={13} />}
            />
            <Detail
              label="Max guests"
              value={room.roomType.maxGuests.toString()}
              icon={<Users size={13} />}
            />
            <Detail label="Price per night" value={`${price.toLocaleString()} ETB`} />
            {room.description && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-gray-400">Notes</p>
                <p className="mt-1 text-sm">{room.description}</p>
              </div>
            )}
          </div>

          {current && (
            <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
              <h3 className="font-bold">Current guest</h3>

              <BookingSummary booking={current} />

              {Number(current.balance) > 0 ? (
                <div className="mt-4 space-y-3">
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    The guest still owes {Number(current.balance).toLocaleString()} ETB.
                    Record the payment to unlock check-out.
                  </p>

                  <RecordPayment
                    bookingId={current.id}
                    defaultAmount={Number(current.balance)}
                    submitLabel="Record payment"
                    onRecorded={onChanged}
                  />
                </div>
              ) : null}

              <button
                onClick={() => changeStatus(current, "CHECKED_OUT")}
                disabled={busy || Number(current.balance) > 0}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogOut size={16} />
                {busy ? "Working..." : "Check Out (guest has left)"}
              </button>

              <p className="mt-2 text-center text-xs text-gray-500">
                After check-out the room goes to Cleaning.
              </p>
            </section>
          )}

          {!current && upcoming && (
            <section className="rounded-2xl border border-purple-100 bg-purple-50/40 p-5">
              <h3 className="font-bold">Next booking</h3>

              <BookingSummary booking={upcoming} />

              {Number(upcoming.amountPaid) <= 0 ? (
                <div className="mt-4 space-y-3">
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Payment is required before check-in. Choose the amount and
                    the method, then record it.
                  </p>

                  <RecordPayment
                    bookingId={upcoming.id}
                    defaultAmount={Number(upcoming.balance)}
                    submitLabel="Record payment"
                    onRecorded={onChanged}
                  />
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Payment received: {Number(upcoming.amountPaid).toLocaleString()} ETB.
                </p>
              )}

              <button
                onClick={() => changeStatus(upcoming, "CHECKED_IN")}
                disabled={busy || Number(upcoming.amountPaid) <= 0}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:bg-[#0d3024] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogIn size={16} />
                {busy ? "Working..." : "Check In"}
              </button>
            </section>
          )}

          {!current && !upcoming && room.status === "AVAILABLE" && (
            <section className="rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold">New booking</h3>
              <p className="mt-1 text-sm text-gray-500">
                Pick a guest or add a new one, then choose the dates.
              </p>

              <BookingForm room={room} price={price} onCreated={onChanged} />
            </section>
          )}

          {!current && !upcoming && room.status !== "AVAILABLE" && (
            <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              This room is {statusLabels[room.status].toLowerCase()}. You can book it
              when its status is Available.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function BookingSummary({ booking }: { booking: Booking }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
      <Detail label="Guest" value={booking.guest.fullName} />
      <Detail label="Phone" value={booking.guest.phone} />
      <Detail label="Booking" value={booking.bookingNumber} />
      <Detail label="Check-in" value={formatDate(booking.checkInDate)} />
      <Detail label="Check-out" value={formatDate(booking.checkOutDate)} />
      <Detail label="Guests" value={booking.numberOfGuests.toString()} />
      <Detail label="Total" value={`${Number(booking.totalAmount).toLocaleString()} ETB`} />
      <Detail label="Paid" value={`${Number(booking.amountPaid).toLocaleString()} ETB`} />
      <Detail label="Balance" value={`${Number(booking.balance).toLocaleString()} ETB`} />
    </div>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
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

function toDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function BookingForm({
  room,
  price,
  onCreated,
}: {
  room: Room;
  price: number;
  onCreated: () => Promise<void>;
}) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nationality, setNationality] = useState("");
  const [idNumber, setIdNumber] = useState("");

  const [checkInDate, setCheckInDate] = useState(toDateInput(today));
  const [checkOutDate, setCheckOutDate] = useState(toDateInput(tomorrow));
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<{ success: boolean; guests: Guest[] }>("/guests")
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

  const nights = Math.max(
    Math.ceil(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000
    ),
    1
  );

  const submit = async () => {
    if (checkOutDate <= checkInDate) {
      alert("Check-out date must be after check-in date.");
      return;
    }

    if (mode === "existing" && !selectedGuest) {
      alert("Choose a guest, or switch to New guest.");
      return;
    }

    if (mode === "new" && (fullName.trim().length < 2 || phone.trim().length < 3)) {
      alert("Enter the guest's full name and phone number.");
      return;
    }

    setSaving(true);

    try {
      let guestId = selectedGuest?.id || "";

      if (mode === "new") {
        const res = await api.post<{ success: boolean; guest: { id: string } }>(
          "/guests",
          {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            nationality: nationality.trim() || undefined,
            idNumber: idNumber.trim() || undefined,
          }
        );
        guestId = res.guest.id;
      }

      await api.post("/bookings", {
        guestId,
        roomId: room.id,
        checkInDate,
        checkOutDate,
        numberOfGuests,
      });

      await onCreated();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not create booking.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white";

  return (
    <div className="mt-4 space-y-5">
      <div className="flex gap-2">
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
      </div>

      {mode === "existing" ? (
        <div className="space-y-2">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedGuest(null);
              }}
              placeholder="Search by name, phone, or ID number..."
              className={`${inputClass} pl-11`}
            />
          </div>

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

          {!selectedGuest && query.trim() && matches.length === 0 && (
            <p className="text-sm text-gray-500">
              No guest found. Switch to New guest to add one.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Full name</label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Guest full name"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Phone</label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="09XXXXXXXX"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">ID number (optional)</label>
            <input
              value={idNumber}
              onChange={(event) => setIdNumber(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Nationality (optional)</label>
            <input
              value={nationality}
              onChange={(event) => setNationality(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium">Check-in</label>
          <input
            type="date"
            value={checkInDate}
            onChange={(event) => setCheckInDate(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Check-out</label>
          <input
            type="date"
            value={checkOutDate}
            onChange={(event) => setCheckOutDate(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Guests</label>
          <input
            type="number"
            min="1"
            max={room.roomType.maxGuests}
            value={numberOfGuests}
            onChange={(event) => setNumberOfGuests(Number(event.target.value))}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-[#123c2c] px-5 py-4 text-white">
        <div>
          <p className="text-xs text-white/60">
            {nights} night{nights > 1 ? "s" : ""} x {price.toLocaleString()} ETB
          </p>
          <p className="text-lg font-bold">{(nights * price).toLocaleString()} ETB</p>
        </div>

        <button
          onClick={submit}
          disabled={saving}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#123c2c] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Create Booking"}
        </button>
      </div>
    </div>
  );
}

function RoomModal({
  room,
  roomTypes,
  onClose,
  onSave,
}: {
  room: Room | null;
  roomTypes: RoomType[];
  onClose: () => void;
  onSave: (data: {
    roomNumber: string;
    floor: string;
    status: RoomStatus;
    price: number;
    description: string;
    roomTypeId: string;
  }) => void;
}) {
  const [roomNumber, setRoomNumber] = useState(room?.roomNumber || "");
  const [floor, setFloor] = useState(room?.floor || "");
  const [status, setStatus] = useState<RoomStatus>(room?.status || "AVAILABLE");
  const [price, setPrice] = useState(room?.price || 0);
  const [description, setDescription] = useState(room?.description || "");
  const [roomTypeId, setRoomTypeId] = useState(
    room?.roomTypeId || roomTypes[0]?.id || ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!roomNumber || !roomTypeId) {
      return;
    }

    setSaving(true);

    try {
      await onSave({ roomNumber, floor, status, price, description, roomTypeId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="my-5 w-full max-w-lg rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-xl font-bold">
              {room ? "Edit Room" : "Add Room"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {room ? "Update room details." : "Add a new room."}
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
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Room number
              </label>

              <input
                value={roomNumber}
                onChange={(event) => setRoomNumber(event.target.value)}
                placeholder="e.g. 107"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Floor</label>

              <input
                value={floor}
                onChange={(event) => setFloor(event.target.value)}
                placeholder="e.g. Ground Floor"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Room type
              </label>

              <select
                value={roomTypeId}
                onChange={(event) => setRoomTypeId(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
              >
                {roomTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as RoomStatus)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
              >
                {(Object.keys(statusLabels) as RoomStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {statusLabels[key]}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Price per night (ETB)
              </label>

              <input
                type="number"
                min="0"
                value={price}
                onChange={(event) => setPrice(Number(event.target.value))}
                placeholder="Leave 0 to use room type's base price"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Description
              </label>

              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional notes about this room"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : room ? "Save Changes" : "Add Room"}
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