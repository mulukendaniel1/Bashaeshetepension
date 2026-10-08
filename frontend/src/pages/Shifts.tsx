import { motion } from "framer-motion";
import {
  Clock3,
  LogIn,
  LogOut,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
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

export default function Shifts() {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [history, setHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const isPrivileged = user?.role === "OWNER" || user?.role === "MANAGER";

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [activeRes, historyRes] = await Promise.all([
        api.get<{ success: boolean; shift: Shift | null }>("/shifts/active"),
        api.get<{ success: boolean; shifts: Shift[] }>("/shifts?mine=true"),
      ]);

      setActiveShift(activeRes.shift);
      setHistory(historyRes.shifts.filter((s) => s.status === "CLOSED"));

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
                Opened {formatDateTime(activeShift.openedAt)} · Opening cash {activeShift.openingCash.toLocaleString()} ETB
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
            <p className="text-sm text-gray-500 dark:text-gray-400">No one has an open shift right now.</p>
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
        <h3 className="mb-5 font-bold dark:text-white">My Shift History</h3>

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No closed shifts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-175">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/10">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Shift
                  </th>
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
                {history.map((shift) => (
                  <tr key={shift.id} className="border-b border-gray-100 last:border-0 dark:border-white/5">
                    <td className="px-3 py-4 text-sm font-medium dark:text-white">{shift.label}</td>
                    <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(shift.openedAt)}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {shift.closedAt ? formatDateTime(shift.closedAt) : "-"}
                    </td>
                    <td className="px-3 py-4 text-sm dark:text-gray-200">
                      {shift.openingCash.toLocaleString()} ETB
                    </td>
                    <td className="px-3 py-4 text-sm dark:text-gray-200">
                      {shift.closingCash !== null ? `${shift.closingCash.toLocaleString()} ETB` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

function OpenShiftModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (label: string, openingCash: number) => void;
}) {
  const [label, setLabel] = useState("Morning Shift");
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
          <label className="mb-2 block text-sm font-medium dark:text-gray-200">Shift label</label>

          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
          />

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
              onClick={() => onSave(label, openingCash)}
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
  const [closingCash, setClosingCash] = useState(shift.openingCash);
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