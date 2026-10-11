import { motion } from "framer-motion";
import { CalendarCheck, Globe, Phone, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";

type RequestStatus = "NEW" | "CONFIRMED" | "DECLINED";

type WebRequest = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  message: string | null;
  status: RequestStatus;
  bookingNumber: string | null;
  createdAt: string;
  roomType: { id: string; name: string; basePrice: number };
};

type FreeRoom = {
  id: string;
  roomNumber: string;
  floor: string | null;
  status: string;
  price: number | null;
};

const statusStyles: Record<RequestStatus, string> = {
  NEW: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DECLINED: "bg-red-50 text-red-700 border-red-200",
};

const statusLabels: Record<RequestStatus, string> = {
  NEW: "New",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
};

export default function BookingRequests() {
  const [requests, setRequests] = useState<WebRequest[]>([]);
  const [filter, setFilter] = useState<"All" | RequestStatus>("NEW");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<WebRequest | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; requests: WebRequest[] }>("/booking-requests");
      setRequests(res.requests);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // New requests arrive while the page stays open.
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const visible = useMemo(
    () => (filter === "All" ? requests : requests.filter((request) => request.status === filter)),
    [requests, filter]
  );

  const newCount = requests.filter((request) => request.status === "NEW").length;

  const decline = async (request: WebRequest) => {
    if (!window.confirm(`Decline the request from ${request.fullName}?`)) return;

    try {
      await api.post(`/booking-requests/${request.id}/decline`);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not decline the request.");
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-center gap-2">
          <Globe className="text-[#123c2c]" size={24} />
          <h1 className="text-2xl font-bold tracking-tight">Web Requests</h1>
        </div>

        <p className="mt-1 text-sm text-gray-500">
          Booking requests from the public website. Call the guest, then confirm with a room.
        </p>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {(["NEW", "CONFIRMED", "DECLINED", "All"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              filter === key
                ? "border-[#123c2c] bg-[#123c2c] text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {key === "All" ? "All" : statusLabels[key]}
            {key === "NEW" && newCount > 0 ? ` (${newCount})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading...
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 text-center">
          <Globe className="mx-auto text-gray-300" size={40} />
          <p className="mt-3 text-sm text-gray-500">No requests here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((request) => {
            const nights = Math.max(
              Math.ceil(
                (new Date(request.checkOutDate).getTime() - new Date(request.checkInDate).getTime()) /
                  86400000
              ),
              1
            );

            return (
              <div key={request.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold">{request.fullName}</p>

                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[request.status]}`}
                      >
                        {statusLabels[request.status]}
                      </span>

                      <span className="text-xs text-gray-400">WR-{request.id.slice(-6).toUpperCase()}</span>
                    </div>

                    <a
                      href={`tel:${request.phone}`}
                      className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#123c2c]"
                    >
                      <Phone size={14} />
                      {request.phone}
                    </a>

                    <p className="mt-2 text-sm text-gray-600">
                      {request.roomType.name} · {formatDate(request.checkInDate)} to{" "}
                      {formatDate(request.checkOutDate)} · {nights} night{nights > 1 ? "s" : ""} ·{" "}
                      {request.numberOfGuests} guest{request.numberOfGuests > 1 ? "s" : ""}
                    </p>

                    {request.message && (
                      <p className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        {request.message}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-gray-400">
                      Sent {formatDateTime(request.createdAt)}
                      {request.bookingNumber ? ` · Booking ${request.bookingNumber}` : ""}
                    </p>
                  </div>

                  {request.status === "NEW" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirming(request)}
                        className="flex items-center gap-1.5 rounded-xl bg-[#123c2c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d3024]"
                      >
                        <CalendarCheck size={15} />
                        Confirm
                      </button>

                      <button
                        onClick={() => decline(request)}
                        className="rounded-xl border border-red-100 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirming && (
        <ConfirmModal
          request={confirming}
          onClose={() => setConfirming(null)}
          onDone={async () => {
            setConfirming(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function ConfirmModal({
  request,
  onClose,
  onDone,
}: {
  request: WebRequest;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [rooms, setRooms] = useState<FreeRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ success: boolean; rooms: FreeRoom[] }>(`/booking-requests/${request.id}/rooms`)
      .then((res) => setRooms(res.rooms))
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, [request.id]);

  const confirm = async (roomId: string) => {
    setBusyId(roomId);

    try {
      const res = await api.post<{ success: boolean; bookingNumber: string }>(
        `/booking-requests/${request.id}/confirm`,
        { roomId }
      );

      alert(
        `Booking ${res.bookingNumber} created. Open Rooms to record the payment and check the guest in.`
      );
      await onDone();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not confirm the request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="my-5 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Choose a room</h2>
            <p className="mt-1 text-sm text-gray-500">
              {request.fullName} · {request.roomType.name} · {formatDate(request.checkInDate)} to{" "}
              {formatDate(request.checkOutDate)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <XCircle size={21} />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {loading ? (
            <p className="text-sm text-gray-500">Loading rooms...</p>
          ) : rooms.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No room of this type is free for those dates. Decline the request or call the guest
              about another room type.
            </p>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-3"
              >
                <div className="text-sm">
                  <p className="font-semibold">Room {room.roomNumber}</p>
                  <p className="text-xs text-gray-500">
                    {room.floor ? `${room.floor} · ` : ""}
                    {room.status.toLowerCase()}
                  </p>
                </div>

                <button
                  onClick={() => confirm(room.id)}
                  disabled={busyId === room.id}
                  className="rounded-xl bg-[#123c2c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3024] disabled:opacity-60"
                >
                  {busyId === room.id ? "Saving..." : "Use this room"}
                </button>
              </div>
            ))
          )}
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

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}