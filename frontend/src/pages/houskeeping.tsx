import { motion } from "framer-motion";
import {
  BedDouble,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";

type TaskType = "CLEANING" | "TURNOVER" | "DEEP_CLEAN" | "INSPECTION";
type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
type Priority = "NORMAL" | "URGENT";

type Task = {
  id: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  notes: string | null;
  room: { id: string; roomNumber: string; roomType: { name: string } };
  assignedTo: { id: string; fullName: string } | null;
};

type Room = { id: string; roomNumber: string; roomType: { name: string } };
type StaffMember = { id: string; fullName: string; status: "ACTIVE" | "INACTIVE" };

const typeLabels: Record<TaskType, string> = {
  CLEANING: "Cleaning",
  TURNOVER: "Turnover",
  DEEP_CLEAN: "Deep Clean",
  INSPECTION: "Inspection",
};

const statusLabels: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const statusStyles: Record<TaskStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const typeStyles: Record<TaskType, string> = {
  CLEANING: "bg-gray-50 text-gray-700 border-gray-200",
  TURNOVER: "bg-purple-50 text-purple-700 border-purple-200",
  DEEP_CLEAN: "bg-blue-50 text-blue-700 border-blue-200",
  INSPECTION: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function Housekeeping() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [tasksRes, roomsRes, staffRes] = await Promise.all([
        api.get<{ success: boolean; tasks: Task[] }>("/housekeeping"),
        api.get<{ success: boolean; rooms: Room[] }>("/rooms"),
        api.get<{ success: boolean; staff: StaffMember[] }>("/staff"),
      ]);

      setTasks(tasksRes.tasks);
      setRooms(roomsRes.rooms);
      setStaff(staffRes.staff.filter((member) => member.status === "ACTIVE"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load housekeeping.");
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const query = search.toLowerCase();

      const matchesSearch =
        task.room.roomNumber.toLowerCase().includes(query) ||
        (task.assignedTo?.fullName || "").toLowerCase().includes(query);

      const matchesStatus = statusFilter === "All" || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  const pendingCount = tasks.filter((task) => task.status === "PENDING").length;
  const inProgressCount = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const completedCount = tasks.filter((task) => task.status === "COMPLETED").length;

  const advanceStatus = async (task: Task) => {
    const next: TaskStatus = task.status === "PENDING" ? "IN_PROGRESS" : "COMPLETED";

    setProcessingId(task.id);

    try {
      const res = await api.patch<{ success: boolean; task: Task }>(
        `/housekeeping/${task.id}/status`,
        { status: next }
      );
      setTasks((current) => current.map((item) => (item.id === task.id ? res.task : item)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not update task.");
    } finally {
      setProcessingId(null);
    }
  };

  const addTask = async (task: {
    roomId: string;
    type: TaskType;
    priority: Priority;
    assignedToId?: string;
    notes?: string;
  }) => {
    try {
      const res = await api.post<{ success: boolean; task: Task }>("/housekeeping", task);
      setTasks((current) => [res.task, ...current]);
      setShowModal(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not create task.");
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight">Housekeeping</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Assign and track cleaning tasks across rooms.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024]"
        >
          <ClipboardList size={18} />
          New Task
        </motion.button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="Pending" value={pendingCount.toString()} icon={<Clock3 size={20} />} />
        <SummaryCard title="In Progress" value={inProgressCount.toString()} icon={<Sparkles size={20} />} />
        <SummaryCard title="Completed" value={completedCount.toString()} icon={<CheckCircle2 size={20} />} />
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search room or staff name..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#123c2c] focus:bg-white focus:ring-4 focus:ring-[#123c2c]/5"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
          >
            <option value="All">All</option>
            {(Object.keys(statusLabels) as TaskStatus[]).map((key) => (
              <option key={key} value={key}>
                {statusLabels[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Sparkles className="mx-auto text-gray-300" size={42} />
          <h3 className="mt-4 font-semibold">No tasks found</h3>
          <p className="mt-1 text-sm text-gray-500">Try changing your search or filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#123c2c]/10 text-[#123c2c]">
                    <BedDouble size={18} />
                  </div>

                  <div>
                    <p className="font-semibold">Room {task.room.roomNumber}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {task.assignedTo?.fullName || "Unassigned"}
                    </p>
                  </div>
                </div>

                {task.priority === "URGENT" && (
                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                    Urgent
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${typeStyles[task.type]}`}>
                  {typeLabels[task.type]}
                </span>

                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[task.status]}`}>
                  {statusLabels[task.status]}
                </span>
              </div>

              {task.notes && <p className="mt-3 text-xs text-gray-500">{task.notes}</p>}

              {task.status !== "COMPLETED" && (
                <button
                  onClick={() => advanceStatus(task)}
                  disabled={processingId === task.id}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#123c2c] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {task.status === "PENDING" ? "Start Task" : "Mark Completed"}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {showModal && (
        <TaskModal
          rooms={rooms}
          staff={staff}
          onClose={() => setShowModal(false)}
          onSave={addTask}
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

function TaskModal({
  rooms,
  staff,
  onClose,
  onSave,
}: {
  rooms: Room[];
  staff: StaffMember[];
  onClose: () => void;
  onSave: (task: {
    roomId: string;
    type: TaskType;
    priority: Priority;
    assignedToId?: string;
    notes?: string;
  }) => void;
}) {
  const [roomId, setRoomId] = useState(rooms[0]?.id || "");
  const [type, setType] = useState<TaskType>("CLEANING");
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!roomId) {
      return;
    }

    setSaving(true);

    try {
      await onSave({
        roomId,
        type,
        priority,
        assignedToId: assignedToId || undefined,
        notes: notes || undefined,
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
            <h2 className="text-xl font-bold">New Task</h2>
            <p className="mt-1 text-sm text-gray-500">Assign a housekeeping task.</p>
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
              Add at least one room before creating a task.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
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
                <label className="mb-2 block text-sm font-medium">Task type</label>

                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as TaskType)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
                >
                  {(Object.keys(typeLabels) as TaskType[]).map((key) => (
                    <option key={key} value={key}>
                      {typeLabels[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
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

              <div>
                <label className="mb-2 block text-sm font-medium">Priority</label>

                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Priority)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Notes</label>

                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
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
              {saving ? "Creating..." : "Create Task"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}