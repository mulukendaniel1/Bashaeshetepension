import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  LogIn,
  LogOut,
  Sun,
  Sunset,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";

type ShiftStatus = "OPEN" | "CLOSED";

type Shift = {
  id: string;
  label: string;
  status: ShiftStatus;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  notes: string | null;
  user: { id: string; fullName: string; role: string };
};

type Period = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

const periodLabels: Record<Period, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const SHIFT_TYPES = ["Morning Shift", "Afternoon Shift"] as const;
type ShiftType = (typeof SHIFT_TYPES)[number];

function toDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Start is included, end is excluded.
function getRange(period: Period, dateStr: string) {
  const base = parseDateInput(dateStr);
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();

  if (period === "DAILY") {
    return { start: new Date(y, m, d), end: new Date(y, m, d + 1) };
  }

  if (period === "WEEKLY") {
    const offset = (base.getDay() + 6) % 7; // Monday is the first day
    return { start: new Date(y, m, d - offset), end: new Date(y, m, d - offset + 7) };
  }

  if (period === "MONTHLY") {
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
  }

  return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
}

function stepDate(period: Period, dateStr: string, direction: 1 | -1) {
  const base = parseDateInput(dateStr);
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();

  if (period === "DAILY") return toDateInput(new Date(y, m, d + direction));
  if (period === "WEEKLY") return toDateInput(new Date(y, m, d + 7 * direction));
  if (period === "MONTHLY") return toDateInput(new Date(y, m + direction, 1));
  return toDateInput(new Date(y + direction, 0, 1));
}

function rangeTitle(period: Period, start: Date, end: Date) {
  if (period === "DAILY") {
    return start.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  if (period === "WEEKLY") {
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
    const from = start.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const to = last.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${from} to ${to}`;
  }

  if (period === "MONTHLY") {
    return start.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }

  return start.getFullYear().toString();
}

export default function Shifts() {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [history, setHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const [period, setPeriod] = useState<Period>("DAILY");
  const [selectedDate, setSelectedDate] = useState(toDateInput(new Date()));
  const [shiftFilter, setShiftFilter] = useState<"All" | ShiftType>("All");

  const isPrivileged = user?.role === "OWNER" || user?.role === "MANAGER";

  const range = useMemo(() => getRange(period, selectedDate), [period, selectedDate]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadHistory();
  }, [period, selectedDate]);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const activeRes = await api.get<{ success: boolean; shift: Shift | null }>(
        "/shifts/active"
      );

      setActiveShift(activeRes.shift);

      if (isPrivileged) {
        const openRes = await api.get<{ success: boolean; shifts: Shift[] }>("/shifts/open");
        setOpenShifts(openRes.shifts);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load shifts.");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);

    try {
      const { start, end } = getRange(period, selectedDate);
      const query = `from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`;

      const res = await api.get<{ success: boolean; shifts: Shift[] }>(`/shifts?${query}`);
      setHistory(res.shifts.filter((shift) => shift.status === "CLOSED"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load shift history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  const visibleHistory = useMemo(() => {
    if (shiftFilter === "All") return history;

    const keyword = shiftFilter.split(" ")[0].toLowerCase();
    return history.filter((shift) => shift.label.toLowerCase().includes(keyword));
  }, [history, shiftFilter]);

  const totals = useMemo(() => {
    return visibleHistory.reduce(
      (sum, shift) => ({
        opening: sum.opening + Number(shift.openingCash),
        closing: sum.closing + Number(shift.closingCash ?? 0),
      }),
      { opening: 0, closing: 0 }
    );
  }, [visibleHistory]);

  const openShift = async (label: string, openingCash: number) => {
    try {
      const res = await api.post<{ success: boolean; shift: Shift }>("/shifts/open", {
        label,
        openingCash,
      });
      setActiveShift(res.shift);
      setShowOpenModal(false);
      loadAll();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not open shift.");
    }
  };

  const closeShift = async (closingCash: number, notes: string) => {
    if (!activeShift) return;

    try {
      await api.post(`/shifts/${activeShift.id}/close`, { closingCash, notes });
      setActiveShift(null);
      setShowCloseModal(false);
      loadAll();
      loadHistory();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not close shift.");
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-center gap-2">
          <Clock3 className="text-[#123c2c]" size={24} />
          <h1 className="text-2xl font-bold tracking-tight dark:text-white">Shifts</h1>
        </div>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Clock in and out, and track shift history.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a231d]">
        {activeShift ? (
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                Shift Open
              </span>

              <p className="mt-3 text-lg font-bold dark:text-white">{activeShift.label}</p>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Opened {formatDateTime(activeShift.openedAt)} · Opening cash{" "}
                {Number(activeShift.openingCash).toLocaleString()} ETB
              </p>
            </div>

            <button
              onClick={() => setShowCloseModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <LogOut size={18} />
              Close Shift
            </button>
          </div>
        ) : (
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 dark:border-white/10 dark:text-gray-400">
                No Active Shift
              </span>

              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Open a shift to start recording payments against it.
              </p>
            </div>

            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <LogIn size={18} />
              Open Shift
            </button>
          </div>
        )}
      </div>

      {isPrivileged && (
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a231d]">
          <div className="mb-5 flex items-center gap-2">
            <Users size={18} className="text-[#123c2c]" />
            <h3 className="font-bold dark:text-white">Currently Working</h3>
          </div>

          {openShifts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No one has an open shift right now.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {openShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="rounded-xl border border-gray-100 p-4 dark:border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#123c2c]/10 text-[#123c2c]">
                      <UserRound size={16} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold dark:text-white">{shift.user.fullName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{shift.label}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    Since {formatDateTime(shift.openedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a231d]">
        <h3 className="font-bold dark:text-white">
          {isPrivileged ? "Shift History" : "My Shift History"}
        </h3>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(periodLabels) as Period[]).map((key) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  period === key
                    ? "border-[#123c2c] bg-[#123c2c] text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                }`}
              >
                {periodLabels[key]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(stepDate(period, selectedDate, -1))}
              className="rounded-xl border border-gray-200 p-2.5 text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(event) => event.target.value && setSelectedDate(event.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#123c2c] dark:border-white/10 dark:bg-white/5 dark:text-white"
            />

            <button
              onClick={() => setSelectedDate(stepDate(period, selectedDate, 1))}
              className="rounded-xl border border-gray-200 p-2.5 text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>

            <button
              onClick={() => setSelectedDate(toDateInput(new Date()))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Today
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold dark:text-white">
            {rangeTitle(period, range.start, range.end)}
          </p>

          <select
            value={shiftFilter}
            onChange={(event) => setShiftFilter(event.target.value as "All" | ShiftType)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#123c2c] dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="All">All shifts</option>
            {SHIFT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <MiniStat label="Closed shifts" value={visibleHistory.length.toString()} />
          <MiniStat label="Opening cash" value={`${totals.opening.toLocaleString()} ETB`} />
          <MiniStat label="Closing cash" value={`${totals.closing.toLocaleString()} ETB`} />
        </div>

        <div className="mt-6">
          {loading || historyLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          ) : visibleHistory.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No closed shifts in this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-190">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/10">
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Shift
                    </th>
                    {isPrivileged && (
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Staff
                      </th>
                    )}
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Opened
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Closed
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Opening Cash
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Closing Cash
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleHistory.map((shift) => (
                    <tr key={shift.id} className="border-b border-gray-100 last:border-0 dark:border-white/5">
                      <td className="px-3 py-4 text-sm font-medium dark:text-white">{shift.label}</td>
                      {isPrivileged && (
                        <td className="px-3 py-4 text-sm dark:text-gray-200">{shift.user.fullName}</td>
                      )}
                      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(shift.openedAt)}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {shift.closedAt ? formatDateTime(shift.closedAt) : "-"}
                      </td>
                      <td className="px-3 py-4 text-sm dark:text-gray-200">
                        {Number(shift.openingCash).toLocaleString()} ETB
                      </td>
                      <td className="px-3 py-4 text-sm dark:text-gray-200">
                        {shift.closingCash !== null
                          ? `${Number(shift.closingCash).toLocaleString()} ETB`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showOpenModal && (
        <OpenShiftModal onClose={() => setShowOpenModal(false)} onSave={openShift} />
      )}

      {showCloseModal && activeShift && (
        <CloseShiftModal
          shift={activeShift}
          onClose={() => setShowCloseModal(false)}
          onSave={closeShift}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4 dark:border-white/10">
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold dark:text-white">{value}</p>
    </div>
  );
}

function OpenShiftModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (label: string, openingCash: number) => void;
}) {
  const [shiftType, setShiftType] = useState<ShiftType>(
    new Date().getHours() < 14 ? "Morning Shift" : "Afternoon Shift"
  );
  const [openingCash, setOpeningCash] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="my-5 w-full max-w-md rounded-3xl bg-white shadow-2xl dark:bg-[#1a231d]"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-white/10">
          <h2 className="text-xl font-bold dark:text-white">Open Shift</h2>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-200"
          >
            <XCircle size={21} />
          </button>
        </div>

        <div className="p-6">
          <label className="mb-2 block text-sm font-medium dark:text-gray-200">Select shift</label>

          <div className="grid grid-cols-2 gap-3">
            {SHIFT_TYPES.map((type) => {
              const Icon = type === "Morning Shift" ? Sun : Sunset;

              return (
                <button
                  key={type}
                  onClick={() => setShiftType(type)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
                    shiftType === type
                      ? "border-[#123c2c] bg-[#123c2c]/5 text-[#123c2c] dark:text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon size={22} />
                  {type}
                </button>
              );
            })}
          </div>

          <label className="mb-2 mt-5 block text-sm font-medium dark:text-gray-200">
            Opening cash (ETB)
          </label>

          <input
            type="number"
            min="0"
            value={openingCash}
            onChange={(event) => setOpeningCash(Number(event.target.value))}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] dark:border-white/10 dark:bg-white/5 dark:text-white"
          />

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
            >
              Cancel
            </button>

            <button
              onClick={() => onSave(shiftType, openingCash)}
              className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Open Shift
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CloseShiftModal({
  shift,
  onClose,
  onSave,
}: {
  shift: Shift;
  onClose: () => void;
  onSave: (closingCash: number, notes: string) => void;
}) {
  const [closingCash, setClosingCash] = useState(Number(shift.openingCash));
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="my-5 w-full max-w-md rounded-3xl bg-white shadow-2xl dark:bg-[#1a231d]"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-white/10">
          <h2 className="text-xl font-bold dark:text-white">Close Shift</h2>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-200"
          >
            <XCircle size={21} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {shift.label} · Opened {formatDateTime(shift.openedAt)}
          </p>

          <label className="mb-2 mt-5 block text-sm font-medium dark:text-gray-200">
            Closing cash (ETB)
          </label>

          <input
            type="number"
            min="0"
            value={closingCash}
            onChange={(event) => setClosingCash(Number(event.target.value))}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] dark:border-white/10 dark:bg-white/5 dark:text-white"
          />

          <label className="mb-2 mt-5 block text-sm font-medium dark:text-gray-200">Notes</label>

          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional handover notes"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
          />

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
            >
              Cancel
            </button>

            <button
              onClick={() => onSave(closingCash, notes)}
              className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Close Shift
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}