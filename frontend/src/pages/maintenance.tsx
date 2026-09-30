import { motion } from "framer-motion";
import {
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  Clock3,
  Plus,
  Search,
  Wrench,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";

type RequestStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type RequestPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type MaintenanceRequest = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: RequestStatus;
  cost: number;
  createdAt: string;
  completedAt: string | null;
  room: { id: string; roomNumber: string; roomType: { name: string } };
  assignedTo: { id: string; fullName: string } | null;
};

type Room = { id: string; roomNumber: string; roomType: { name: string } };
type StaffMember = { id: string; fullName: string; status: "ACTIVE" | "INACTIVE" };

const statusLabels: Record<RequestStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusStyles: Record<RequestStatus, string> = {
  OPEN: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-gray-50 text-gray-700 border-gray-200",
};

const priorityStyles: Record<string, string> = {
  LOW: "bg-gray-50 text-gray-700 border-gray-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
  HIGH: "bg-amber-50 text-amber-700 border-amber-200",
  URGENT: "bg-red-50 text-red-700 border-red-200",
};

export default function Maintenance() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [requestsRes, roomsRes, staffRes] = await Promise.all([
        api.get<{ success: boolean; requests: MaintenanceRequest[] }>("/maintenance"),
        api.get<{ success: boolean; rooms: Room[] }>("/rooms"),
        api.get<{ success: boolean; staff: StaffMember[] }>("/staff"),
      ]);

      setRequests(requestsRes.requests);
      setRooms(roomsRes.rooms);
      setStaff(staffRes.staff.filter((member) => member.status === "ACTIVE"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load maintenance.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const query = search.toLowerCase();

      const matchesSearch =
        request.title.toLowerCase().includes(query) ||
        request.room.roomNumber.toLowerCase().includes(query) ||
        (request.assignedTo?.fullName || "").toLowerCase().includes(query);

      const matchesStatus = statusFilter === "All" || request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const openCount = requests.filter((request) => request.status === "OPEN").length;
  const inProgressCount = requests.filter((request) => request.status === "IN_PROGRESS").length;
  const totalCost = requests
    .filter((request) => request.status === "COMPLETED")
    .reduce((sum, request) => sum + request.cost, 0);

  const updateStatus = async (id: string, status: RequestStatus, cost?: number) => {
    setProcessingId(id);

    try {
      const res = await api.patch<{ success: boolean; request: MaintenanceRequest }>(
        `/maintenance/${id}/status`,
        { status, cost }
      );
      setRequests((current) => current.map((item) => (item.id === id ? res.request : item)));
      setCompletingId(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not update request.");
    } finally {
      setProcessingId(null);
    }
  };

  const addRequest = async (request: {
    roomId: string;
    title: string;
    description?: string;
    priority: RequestPriority;
    assignedToId?: string;
  }) => {
    try {
      const res = await api.post<{ success: boolean; request: MaintenanceRequest }>(
        "/maintenance",
        request
      );
      setRequests((current) => [res.request, ...current]);
      setShowModal(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not create request.");
    }
  };

  const completingRequest = requests.find((request) => request.id === completingId) || null;

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Track repair requests and keep rooms out of service until fixed.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024]"
        >
          <Plus size={18} />
          New Request
        </motion.button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="Open" value={openCount.toString()} icon={<AlertTriangle size={20} />} />
        <SummaryCard title="In Progress" value={inProgressCount.toString()} icon={<Clock3 size={20} />} />
        <SummaryCard
          title="Repair Costs"
          value={`${totalCost.toLocaleString()} ETB`}
          icon={<CheckCircle2 size={20} />}
        />
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, room, or assignee..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#123c2c] focus:bg-white focus:ring-4 focus:ring-[#123c2c]/5"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
          >
            <option value="All">All</option>
            {(Object.keys(statusLabels) as RequestStatus[]).map((key) => (
              <option key={key} value={key}>
                {statusLabels[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading requests...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Wrench className="mx-auto text-gray-300" size={42} />
          <h3 className="mt-4 font-semibold">No requests found</h3>
          <p className="mt-1 text-sm text-gray-500">Try changing your search or filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRequests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{request.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <BedDouble size={13} />
                    Room {request.room.roomNumber} · {request.room.roomType.name}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${priorityStyles[request.priority] || priorityStyles.MEDIUM}`}
                >
                  {request.priority}
                </span>
              </div>

              <div className="mt-4">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[request.status]}`}
                >
                  {statusLabels[request.status]}
                </span>
              </div>

              {request.description && (
                <p className="mt-3 text-xs text-gray-500">{request.description}</p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                <div>
                  <p className="text-xs text-gray-400">Assigned to</p>
                  <p className="mt-1 text-sm font-medium">
                    {request.assignedTo?.fullName || "Unassigned"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Cost</p>
                  <p className="mt-1 text-sm font-medium">
                    {request.cost.toLocaleString()} ETB
                  </p>
                </div>
              </div>

              {(request.status === "OPEN" || request.status === "IN_PROGRESS") && (
                <div className="mt-5 flex gap-2">
                  {request.status === "OPEN" ? (
                    <button
                      onClick={() => updateStatus(request.id, "IN_PROGRESS")}
                      disabled={processingId === request.id}
                      className="flex-1 rounded-xl bg-[#123c2c] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
                    >
                      Start Work
                    </button>
                  ) : (
                    <button
                      onClick={() => setCompletingId(request.id)}
                      className="flex-1 rounded-xl bg-[#123c2c] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      Mark Completed
                    </button>
                  )}

                  <button
                    onClick={() => updateStatus(request.id, "CANCELLED")}
                    disabled={processingId === request.id}
                    className="rounded-xl border border-red-100 px-4 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {showModal && (
        <RequestModal
          rooms={rooms}
          staff={staff}
          onClose={() => setShowModal(false)}
          onSave={addRequest}
        />
      )}

      {completingRequest && (
        <CompleteModal
          request={completingRequest}
          processing={processingId === completingRequest.id}
          onClose={() => setCompletingId(null)}
          onConfirm={(cost) => updateStatus(completingRequest.id, "COMPLETED", cost)}
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

function RequestModal({
  rooms,
  staff,
  onClose,
  onSave,
}: {
  rooms: Room[];
  staff: StaffMember[];
  onClose: () => void;
  onSave: (request: {
    roomId: string;
    title: string;
    description?: string;
    priority: RequestPriority;
    assignedToId?: string;
  }) => void;
}) {
  const [roomId, setRoomId] = useState(rooms[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("MEDIUM");
  const [assignedToId, setAssignedToId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!roomId || !title) {
      return;
    }

    setSaving(true);

    try {
      await onSave({
        roomId,
        title,
        description: description || undefined,
        priority,
        assignedToId: assignedToId || undefined,
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
        className="my-5 w-full max-w-lg rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-xl font-bold">New Request</h2>
            <p className="mt-1 text-sm text-gray-500">
              The room is marked as Maintenance until the request is completed.
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
          {rooms.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Add at least one room before creating a request.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Title</label>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Leaking bathroom pipe"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Room</label>

                <select
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.roomNumber} · {room.roomType.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Priority</label>

                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as RequestPriority)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Assign to</label>

                <select
                  value={assignedToId}
                  onChange={(event) => setAssignedToId(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
                >
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Description</label>

                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional details"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
                />
              </div>
            </div>
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
              disabled={saving || rooms.length === 0}
              className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Request"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CompleteModal({
  request,
  processing,
  onClose,
  onConfirm,
}: {
  request: MaintenanceRequest;
  processing: boolean;
  onClose: () => void;
  onConfirm: (cost: number) => void;
}) {
  const [cost, setCost] = useState(request.cost || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="my-5 w-full max-w-md rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-xl font-bold">Complete Request</h2>
            <p className="mt-1 text-sm text-gray-500">
              {request.title} · Room {request.room.roomNumber}
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
          <label className="mb-2 block text-sm font-medium">Final repair cost (ETB)</label>

          <input
            type="number"
            min="0"
            value={cost}
            onChange={(event) => setCost(Number(event.target.value))}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
          />

          <p className="mt-3 text-sm text-gray-500">
            The room returns to Available once this request is completed.
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={() => onConfirm(cost)}
              disabled={processing}
              className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? "Saving..." : "Mark Completed"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}