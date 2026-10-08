import { motion } from "framer-motion";
import {
  BedDouble,
  Building2,
  Edit3,
  Plus,
  Search,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [roomsRes, typesRes] = await Promise.all([
        api.get<{ success: boolean; rooms: Room[] }>("/rooms"),
        api.get<{ success: boolean; roomTypes: RoomType[] }>("/rooms/types"),
      ]);

      setRooms(roomsRes.rooms);
      setRoomTypes(typesRes.roomTypes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load rooms.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const query = search.toLowerCase();

      const matchesSearch =
        room.roomNumber.toLowerCase().includes(query) ||
        room.roomType.name.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || room.status === statusFilter;

      const matchesType =
        typeFilter === "All" || room.roomType.name === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [rooms, search, statusFilter, typeFilter]);

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
        await api.post<{ success: boolean; room: Room }>(
          "/rooms",
          data
        );
        await loadData();
      }

      setShowModal(false);
      setEditingRoom(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not save room.");
    }
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

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight">Rooms</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Manage rooms, prices, availability, and room status.
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
              placeholder="Search room number or type..."
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold">Room {room.roomNumber}</p>
                  <p className="text-xs text-gray-500">
                    {room.roomType.name}
                    {room.floor ? ` · ${room.floor}` : ""}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[room.status]}`}
                >
                  {statusLabels[room.status]}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                <div>
                  <p className="flex items-center gap-1 text-xs text-gray-400">
                    <BedDouble size={14} />
                    Beds
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {room.roomType.beds}
                  </p>
                </div>

                <div>
                  <p className="flex items-center gap-1 text-xs text-gray-400">
                    <Users size={14} />
                    Max Guests
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {room.roomType.maxGuests}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Price per night</p>
                  <p className="mt-1 text-sm font-semibold">
                    {(room.price ?? room.roomType.basePrice).toLocaleString()}{" "}
                    ETB
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
                <button
                  onClick={() => openEditModal(room)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                >
                  <Edit3 size={16} />
                  Edit
                </button>

                <button
                  onClick={() => deleteRoom(room.id)}
                  className="rounded-xl border border-red-100 px-4 text-red-500 transition hover:bg-red-50"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
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