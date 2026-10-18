import { motion } from "framer-motion";
import {
  Banknote,
  CalendarPlus,
  Calculator,
  CreditCard,
  FileBarChart,
  Landmark,
  LogIn,
  LogOut,
  Pencil,
  Printer,
  Receipt,
  Smartphone,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";
import PrintSheet from "../components/PrintSheet";
import ChangeGuestModal from "../components/ChangeGuestModal";
import ExtendModal from "../components/ExtendModal";
import RecordPayment from "../components/RecordPayment";
import { cancelReservation } from "../lib/bookingactions";

type PaymentMethod = "CASH" | "TELEBIRR" | "CBE_BIRR" | "BANK_TRANSFER" | "CARD" | "OTHER";

type ShiftSummary = {
  id: string;
  label: string;
  workerName?: string | null;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  user: { id: string; fullName: string };
};

type PaymentRow = {
  id: string;
  receiptNumber: string;
  amount: number;
  method: PaymentMethod;
  createdAt: string;
  bankAccount: { id: string; name: string; accountType: "PENSION" | "PERSONAL" } | null;
  booking: { guest: { fullName: string }; room: { roomNumber: string } };
};

type ShiftReport = {
  shift: ShiftSummary;
  payments: PaymentRow[];
  totalsByMethod: Record<string, number>;
  totalsByBankAccount: Record<string, number>;
  totalCollected: number;
  totalPaymentCount: number;
  cashReconciliation: {
    openingCash: number;
    cashCollected: number;
    expectedClosingCash: number;
    actualClosingCash: number | null;
    variance: number | null;
  };
};

// A reserved or booked room shown in the Z Report page. These are not printed.
type ShiftBooking = {
  id: string;
  bookingNumber: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  pricePerNight: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: string;
  guest: { id: string; fullName: string; phone: string };
  room: { id: string; roomNumber: string; roomType: { name: string } };
};

const methodIcons: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote size={16} />,
  TELEBIRR: <Smartphone size={16} />,
  CBE_BIRR: <Smartphone size={16} />,
  BANK_TRANSFER: <Landmark size={16} />,
  CARD: <CreditCard size={16} />,
  OTHER: <Receipt size={16} />,
};

const methodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  TELEBIRR: "Telebirr",
  CBE_BIRR: "CBE Birr",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  OTHER: "Other",
};

// Who received the money, as shown on the printed Z Report.
// Cash shows as "Cash". A payment to a bank or wallet account shows the capital
// first letter of that account's name, for example Y for Yared Ababu.
function receivedVia(payment: PaymentRow): string {
  if (payment.method === "CASH") return "Cash";

  const name = payment.bankAccount?.name?.trim();
  if (name) return name.charAt(0).toUpperCase();

  // The cashier did not pick an account. Show the method so the line is not blank.
  return methodLabels[payment.method];
}

export default function ZReport() {
  const { user } = useAuth();
  const [myShifts, setMyShifts] = useState<ShiftSummary[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reserved, setReserved] = useState<ShiftBooking[]>([]);
  const [booked, setBooked] = useState<ShiftBooking[]>([]);
  const [payFor, setPayFor] = useState<{ booking: ShiftBooking; mode: "checkin" | "checkout" } | null>(null);
  const [renameFor, setRenameFor] = useState<ShiftBooking | null>(null);
  const [extendFor, setExtendFor] = useState<ShiftBooking | null>(null);

  const isPrivileged = user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "ACCOUNTANT";

  // Only the owner and the manager remove payments or shifts.
  const canEdit = user?.role === "OWNER" || user?.role === "MANAGER";

  useEffect(() => {
    loadShifts();
  }, [canEdit]);

  useEffect(() => {
    if (selectedShiftId) {
      loadReport(selectedShiftId);
      loadShiftRooms(selectedShiftId);
    }
  }, [selectedShiftId]);

  async function loadShifts() {
    setLoading(true);
    setError("");

    try {
      // The owner and the manager pick any shift. Others see their own shifts.
      const res = await api.get<{ success: boolean; shifts: ShiftSummary[] }>(
        canEdit ? "/shifts" : "/shifts?mine=true"
      );
      setMyShifts(res.shifts);

      if (res.shifts.length > 0) {
        setSelectedShiftId(res.shifts[0].id);
      } else {
        setSelectedShiftId("");
        setReport(null);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load shifts.");
      setLoading(false);
    }
  }

  // The reserved and the booked rooms of the shift. They are not printed.
  async function loadShiftRooms(shiftId: string) {
    try {
      const res = await api.get<{ success: boolean; reserved: ShiftBooking[]; booked: ShiftBooking[] }>(
        `/zreport/shift/${shiftId}/rooms`
      );
      setReserved(res.reserved);
      setBooked(res.booked);
    } catch {
      setReserved([]);
      setBooked([]);
    }
  }

  // Refresh the totals and the room lists without the loading screen.
  async function refreshAll() {
    if (!selectedShiftId) return;
    await Promise.all([loadReport(selectedShiftId, true), loadShiftRooms(selectedShiftId)]);
  }

  async function loadReport(shiftId: string, silent = false) {
    if (!silent) setLoading(true);
    setError("");

    try {
      const res = await api.get<{ success: boolean; report: ShiftReport }>(`/zreport/shift/${shiftId}`);
      setReport(res.report);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load report.");
    } finally {
      setLoading(false);
    }
  }

  const methodEntries = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.totalsByMethod) as [PaymentMethod, number][];
  }, [report]);

  const receivedByEntries = useMemo(() => {
    if (!report) return [];

    const totals = new Map<string, { amount: number; count: number }>();

    for (const payment of report.payments) {
      const key = receivedVia(payment);
      const current = totals.get(key) || { amount: 0, count: 0 };

      totals.set(key, { amount: current.amount + Number(payment.amount), count: current.count + 1 });
    }

    return Array.from(totals.entries());
  }, [report]);

  // Collected by account: every payment that is not cash (CBE Birr, Telebirr, bank, card).
  const collectedByAccount = report ? report.totalCollected - report.cashReconciliation.cashCollected : 0;

  // Collected by account + cash collected = total money.
  const grandTotal = report ? report.totalCollected : 0;

  // The same money, split by the account that received it.
  const accountEntries = useMemo(() => {
    if (!report) return [];

    const totals = new Map<string, number>();

    for (const payment of report.payments) {
      if (payment.method === "CASH") continue;

      const key = payment.bankAccount?.name || methodLabels[payment.method];
      totals.set(key, (totals.get(key) || 0) + Number(payment.amount));
    }

    return Array.from(totals.entries());
  }, [report]);

  const transferReceivedEntries = receivedByEntries.filter(([label]) => label !== "Cash");

  const bankAccountEntries = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.totalsByBankAccount);
  }, [report]);

  const handlePrint = () => {
    window.print();
  };

  const changeStatus = async (booking: ShiftBooking, status: "CHECKED_IN" | "CHECKED_OUT") => {
    try {
      await api.patch(`/bookings/${booking.id}/status`, { status });
      await refreshAll();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not update the booking.");
    }
  };

  // Check-in needs a payment on record. Without one, the cashier picks the method first.
  const checkInRoom = async (booking: ShiftBooking) => {
    if (Number(booking.amountPaid) <= 0) {
      setPayFor({ booking, mode: "checkin" });
      return;
    }

    if (window.confirm(`Check in ${booking.guest.fullName} to Room ${booking.room.roomNumber}?`)) {
      await changeStatus(booking, "CHECKED_IN");
    }
  };

  // Check-out needs a zero balance. Otherwise the cashier takes the balance first.
  const checkOutRoom = async (booking: ShiftBooking) => {
    if (Number(booking.balance) > 0) {
      setPayFor({ booking, mode: "checkout" });
      return;
    }

    if (
      window.confirm(
        `Check out ${booking.guest.fullName} from Room ${booking.room.roomNumber}? The room goes to Cleaning.`
      )
    ) {
      await changeStatus(booking, "CHECKED_OUT");
    }
  };

  const cancelRoom = async (booking: ShiftBooking) => {
    if (await cancelReservation(booking, canEdit)) {
      await refreshAll();
    }
  };

  // Cancel a payment recorded by mistake, for example a wrong check-in amount.
  const cancelPayment = async (payment: PaymentRow) => {
    const reason = window.prompt(
      `Cancel payment ${payment.receiptNumber} of ${payment.amount.toLocaleString()} ETB?\nWrite a short reason:`
    );

    if (reason === null) return;

    if (reason.trim().length < 3) {
      alert("Write a short reason to cancel a payment.");
      return;
    }

    try {
      await api.post(`/payments/${payment.id}/cancel`, { reason: reason.trim() });
      await refreshAll();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not cancel the payment.");
    }
  };

  // Delete the whole shift. The server refuses while the shift still has payments.
  const deleteShift = async () => {
    if (!report) return;

    const confirmed = window.confirm(
      `Delete the ${report.shift.label}? This cannot be undone. A shift with payments cannot be deleted.`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/shifts/${report.shift.id}`);
      setReport(null);
      await loadShifts();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not delete the shift.");
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight dark:text-white">Z Report</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Shift-level revenue summary and cash reconciliation.
          </p>
        </div>

        {report && (
          <div className="flex gap-3">
            {canEdit && (
              <button
                onClick={deleteShift}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:bg-white/5"
              >
                <Trash2 size={18} />
                Delete shift
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
            >
              <Printer size={18} />
              Print
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      {isPrivileged && (
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
          This view shows one shift at a time. A combined report across every staff member's shifts for a date range
          is available via the API at /api/zreport/range but has no dedicated page yet.
        </p>
      )}

      {myShifts.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-white/15 dark:bg-[#1a231d]">
          <FileBarChart className="mx-auto text-gray-300 dark:text-gray-600" size={42} />
          <h3 className="mt-4 font-semibold dark:text-white">No shifts yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Open a shift from the Shifts page to start generating reports.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a231d]">
          <label className="mb-2 block text-sm font-medium dark:text-gray-200">Select shift</label>

          <select
            value={selectedShiftId}
            onChange={(event) => setSelectedShiftId(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] dark:border-white/10 dark:bg-white/5 dark:text-white sm:w-96"
          >
            {myShifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.label}
                {shift.workerName ? ` · ${shift.workerName}` : ""} · {formatDateTime(shift.openedAt)} ·{" "}
                {shift.status === "OPEN" ? "Open" : "Closed"}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm dark:border-white/10 dark:bg-[#1a231d] dark:text-gray-400">
          Loading report...
        </div>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Collected by Account"
              value={`${collectedByAccount.toLocaleString()} ETB`}
              icon={<Wallet size={20} />}
            />

            <SummaryCard
              title="Payments"
              value={report.totalPaymentCount.toString()}
              icon={<Receipt size={20} />}
            />

            <SummaryCard
              title="Cash Collected"
              value={`${report.cashReconciliation.cashCollected.toLocaleString()} ETB`}
              icon={<Banknote size={20} />}
            />

            <SummaryCard
              title="Total Money"
              value={`${grandTotal.toLocaleString()} ETB`}
              icon={<Calculator size={20} />}
            />
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a231d]">
            <h3 className="mb-5 font-bold dark:text-white">Revenue by Method</h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {methodEntries.map(([method, amount]) => (
                <div
                  key={method}
                  className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-white/10"
                >
                  <span className="flex items-center gap-2 text-sm dark:text-gray-200">
                    {methodIcons[method]}
                    {methodLabels[method]}
                  </span>

                  <span className="font-semibold dark:text-white">{amount.toLocaleString()} ETB</span>
                </div>
              ))}

              {methodEntries.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No payments recorded this shift.</p>
              )}
            </div>
          </div>

          {bankAccountEntries.length > 0 && (
            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a231d]">
              <h3 className="mb-5 font-bold dark:text-white">Bank Transfers by Account</h3>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bankAccountEntries.map(([account, amount]) => (
                  <div
                    key={account}
                    className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-white/10"
                  >
                    <span className="text-sm dark:text-gray-200">{account}</span>
                    <span className="font-semibold dark:text-white">{amount.toLocaleString()} ETB</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a231d]">
            <h3 className="mb-5 font-bold dark:text-white">Total Money</h3>

            <p className="-mt-3 mb-5 text-sm text-gray-500 dark:text-gray-400">
              Collected by account + cash collected = total money.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <ReconciliationItem
                label="Collected by Account"
                value={`${collectedByAccount.toLocaleString()} ETB`}
              />
              <ReconciliationItem
                label="+ Cash Collected"
                value={`${report.cashReconciliation.cashCollected.toLocaleString()} ETB`}
              />
              <ReconciliationItem label="= Total Money" value={`${grandTotal.toLocaleString()} ETB`} />
            </div>

            {accountEntries.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-gray-100 pt-4 text-sm dark:border-white/10">
                {accountEntries.map(([name, amount]) => (
                  <span key={name} className="text-gray-600 dark:text-gray-300">
                    {name}:{" "}
                    <span className="font-semibold dark:text-white">{amount.toLocaleString()} ETB</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a231d]">
            <h3 className="mb-5 font-bold dark:text-white">Cash Drawer Check</h3>

            <p className="-mt-3 mb-5 text-sm text-gray-500 dark:text-gray-400">
              Only cash enters the drawer. The drawer should hold opening cash + cash collected.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <ReconciliationItem
                label="Opening Cash"
                value={`${report.cashReconciliation.openingCash.toLocaleString()} ETB`}
              />
              <ReconciliationItem
                label="+ Cash Collected"
                value={`${report.cashReconciliation.cashCollected.toLocaleString()} ETB`}
              />
              <ReconciliationItem
                label="= Cash in drawer should be"
                value={`${report.cashReconciliation.expectedClosingCash.toLocaleString()} ETB`}
              />

              {report.cashReconciliation.actualClosingCash !== null ? (
                <>
                  <ReconciliationItem
                    label="Counted Closing Cash"
                    value={`${report.cashReconciliation.actualClosingCash.toLocaleString()} ETB`}
                  />
                  <ReconciliationItem
                    label="Variance"
                    value={`${report.cashReconciliation.variance! >= 0 ? "+" : ""}${report.cashReconciliation.variance!.toLocaleString()} ETB`}
                    warn={report.cashReconciliation.variance !== 0}
                  />
                </>
              ) : (
                <ReconciliationItem label="Variance" value="Shift still open" />
              )}
            </div>
          </div>

          <RoomsTable
            title="Reserved in this shift"
            hint="Not printed. Check in a guest after the payment, rename the guest, or cancel the reservation."
            empty="No reserved rooms for this shift."
            bookings={reserved}
            renderActions={(booking) => (
              <>
                <button
                  onClick={() => checkInRoom(booking)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#123c2c] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0d3024]"
                >
                  <LogIn size={13} />
                  Check-in
                </button>

                <button
                  onClick={() => setRenameFor(booking)}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50 dark:border-white/10"
                >
                  <Pencil size={13} />
                  Rename
                </button>

                <button
                  onClick={() => cancelRoom(booking)}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
                >
                  <XCircle size={13} />
                  Cancel
                </button>
              </>
            )}
          />

          <RoomsTable
            title="Booked in this shift"
            hint="Not printed. Guests in their rooms. Check them out, extend the stay, or rename the guest."
            empty="No booked rooms for this shift."
            bookings={booked}
            renderActions={(booking) => (
              <>
                <button
                  onClick={() => checkOutRoom(booking)}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                >
                  <LogOut size={13} />
                  Check-out
                </button>

                <button
                  onClick={() => setExtendFor(booking)}
                  className="flex items-center gap-1.5 rounded-xl border border-[#123c2c]/30 px-3 py-1.5 text-xs font-medium text-[#123c2c] transition hover:bg-[#123c2c]/5 dark:text-white"
                >
                  <CalendarPlus size={13} />
                  Extend
                </button>

                <button
                  onClick={() => setRenameFor(booking)}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50 dark:border-white/10"
                >
                  <Pencil size={13} />
                  Rename
                </button>
              </>
            )}
          />

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a231d]">
            <h3 className="mb-5 font-bold dark:text-white">Payments This Shift</h3>

            {report.payments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No payments recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-175">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/10">
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Receipt
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Guest
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Method
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Amount
                      </th>
                      {canEdit && (
                        <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Action
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {report.payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-100 last:border-0 dark:border-white/5">
                        <td className="px-3 py-4 text-sm font-medium dark:text-white">{payment.receiptNumber}</td>
                        <td className="px-3 py-4 text-sm dark:text-gray-200">
                          {payment.booking.guest.fullName} · Room {payment.booking.room.roomNumber}
                        </td>
                        <td className="px-3 py-4 text-sm dark:text-gray-200">
                          {methodLabels[payment.method]}
                          {payment.bankAccount && (
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                              {payment.bankAccount.name}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold dark:text-white">
                          {payment.amount.toLocaleString()} ETB
                        </td>
                        {canEdit && (
                          <td className="px-3 py-4 text-right">
                            <button
                              onClick={() => cancelPayment(payment)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-500/20"
                            >
                              <Trash2 size={13} />
                              Cancel
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      {report && (
        <PrintSheet>
          <div className="a4-header">
            <img
              src="/logo.png"
              alt=""
              className="a4-logo"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <p className="a4-title">Basha Eshete Pension</p>
            <p className="a4-doc">Z Report</p>
            <p className="a4-meta">
              {report.shift.label} · {report.shift.workerName || report.shift.user.fullName}
            </p>
          </div>

          <table className="a4-table">
            <tbody>
              <tr>
                <th>Shift</th>
                <td>{report.shift.label}</td>
                <th>Worker</th>
                <td>{report.shift.workerName || report.shift.user.fullName}</td>
              </tr>
              <tr>
                <th>Opened</th>
                <td>{formatDateTime(report.shift.openedAt)}</td>
                <th>Closed</th>
                <td>{report.shift.closedAt ? formatDateTime(report.shift.closedAt) : "Still open"}</td>
              </tr>
            </tbody>
          </table>

          <div className="a4-cards">
            <div className="a4-card">
              <span>Collected by Account</span>
              <strong>{collectedByAccount.toLocaleString()} ETB</strong>
            </div>
            <div className="a4-card">
              <span>Payments</span>
              <strong>{report.totalPaymentCount}</strong>
            </div>
            <div className="a4-card">
              <span>Cash Collected</span>
              <strong>{report.cashReconciliation.cashCollected.toLocaleString()} ETB</strong>
            </div>
            <div className="a4-card">
              <span>Total Money</span>
              <strong>{grandTotal.toLocaleString()} ETB</strong>
            </div>
          </div>

          <p className="a4-section">Received by</p>

          <table className="a4-table">
            <thead>
              <tr>
                <th>Received by</th>
                <th className="num">Payments</th>
                <th className="num">Amount (ETB)</th>
              </tr>
            </thead>

            <tbody>
              {receivedByEntries.length === 0 && (
                <tr>
                  <td colSpan={3}>No payments.</td>
                </tr>
              )}

              {receivedByEntries.map(([label, total]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td className="num">{total.count}</td>
                  <td className="num">{total.amount.toLocaleString()}</td>
                </tr>
              ))}

              {receivedByEntries.length > 0 && (
                <tr className="total">
                  <td>Total collected</td>
                  <td className="num">{report.totalPaymentCount}</td>
                  <td className="num">{report.totalCollected.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>

          <p className="a4-section">Total money</p>

          <table className="a4-table">
            <tbody>
              {transferReceivedEntries.length === 0 && (
                <tr>
                  <td>Collected by account</td>
                  <td className="num">0 ETB</td>
                </tr>
              )}

              {transferReceivedEntries.map(([label, total]) => (
                <tr key={label}>
                  <td>Collected by account {label}</td>
                  <td className="num">{total.amount.toLocaleString()} ETB</td>
                </tr>
              ))}

              <tr>
                <td>+ Cash collected</td>
                <td className="num">{report.cashReconciliation.cashCollected.toLocaleString()} ETB</td>
              </tr>

              <tr className="total">
                <td>= Total money (collected by account + cash collected)</td>
                <td className="num">{grandTotal.toLocaleString()} ETB</td>
              </tr>
            </tbody>
          </table>

          <p className="a4-section">Cash drawer check</p>

          <table className="a4-table">
            <tbody>
              <tr>
                <td>Opening cash</td>
                <td className="num">{report.cashReconciliation.openingCash.toLocaleString()} ETB</td>
              </tr>
              <tr>
                <td>+ Cash collected</td>
                <td className="num">{report.cashReconciliation.cashCollected.toLocaleString()} ETB</td>
              </tr>
              <tr className="total">
                <td>= Cash in drawer should be</td>
                <td className="num">
                  {report.cashReconciliation.expectedClosingCash.toLocaleString()} ETB
                </td>
              </tr>

              {report.cashReconciliation.actualClosingCash !== null ? (
                <>
                  <tr>
                    <td>Counted closing cash</td>
                    <td className="num">
                      {report.cashReconciliation.actualClosingCash.toLocaleString()} ETB
                    </td>
                  </tr>
                  <tr className="total">
                    <td>Variance</td>
                    <td className="num">
                      {report.cashReconciliation.variance! >= 0 ? "+" : ""}
                      {report.cashReconciliation.variance!.toLocaleString()} ETB
                    </td>
                  </tr>
                </>
              ) : (
                <tr className="total">
                  <td>Variance</td>
                  <td className="num">Shift still open</td>
                </tr>
              )}
            </tbody>
          </table>

          <p className="a4-section">Payments</p>

          <table className="a4-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Received by</th>
                <th>Guest</th>
                <th>Room</th>
                <th className="num">Amount (ETB)</th>
              </tr>
            </thead>

            <tbody>
              {report.payments.length === 0 && (
                <tr>
                  <td colSpan={5}>No payments.</td>
                </tr>
              )}

              {report.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.receiptNumber}</td>
                  <td>{receivedVia(payment)}</td>
                  <td>{payment.booking.guest.fullName}</td>
                  <td>{payment.booking.room.roomNumber}</td>
                  <td className="num">{payment.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="a4-signatures">
            <div className="a4-sign">Cashier signature</div>
            <div className="a4-sign">Manager signature</div>
          </div>

          <div className="a4-footer">
            <span>Printed: {new Date().toLocaleString("en-GB")}</span>
            <span>Basha Eshete Pension</span>
          </div>
        </PrintSheet>
      )}

      {payFor && (
        <PayModal
          booking={payFor.booking}
          mode={payFor.mode}
          onClose={() => setPayFor(null)}
          onDone={async () => {
            setPayFor(null);
            await refreshAll();
          }}
        />
      )}

      {renameFor && (
        <ChangeGuestModal
          booking={renameFor}
          onClose={() => setRenameFor(null)}
          onDone={async () => {
            setRenameFor(null);
            await refreshAll();
          }}
        />
      )}

      {extendFor && (
        <ExtendModal
          booking={extendFor}
          onClose={() => setExtendFor(null)}
          onDone={async () => {
            setExtendFor(null);
            await refreshAll();
          }}
        />
      )}
    </div>
  );
}

// A list of rooms for quick work. It shows on the screen only and never prints.
function RoomsTable({
  title,
  hint,
  empty,
  bookings,
  renderActions,
}: {
  title: string;
  hint: string;
  empty: string;
  bookings: ShiftBooking[];
  renderActions: (booking: ShiftBooking) => React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a231d]">
      <h3 className="font-bold dark:text-white">
        {title} <span className="text-sm font-normal text-gray-400">({bookings.length})</span>
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{hint}</p>

      {bookings.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{empty}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-175">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/10">
                {["Guest", "Room", "Stay", "Balance", "Action"].map((heading) => (
                  <th
                    key={heading}
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-gray-100 last:border-0 dark:border-white/5">
                  <td className="px-3 py-4 text-sm dark:text-gray-200">
                    <p className="font-medium dark:text-white">{booking.guest.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{booking.bookingNumber}</p>
                  </td>
                  <td className="px-3 py-4 text-sm dark:text-gray-200">
                    Room {booking.room.roomNumber}
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {booking.room.roomType.name}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {formatDay(booking.checkInDate)} to {formatDay(booking.checkOutDate)}
                  </td>
                  <td className="px-3 py-4 text-sm dark:text-gray-200">
                    <span className="font-semibold">{Number(booking.balance).toLocaleString()} ETB</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      paid {Number(booking.amountPaid).toLocaleString()} of{" "}
                      {Number(booking.totalAmount).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">{renderActions(booking)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// The cashier chooses the payment method here. The room then moves on.
function PayModal({
  booking,
  mode,
  onClose,
  onDone,
}: {
  booking: ShiftBooking;
  mode: "checkin" | "checkout";
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const status = mode === "checkin" ? "CHECKED_IN" : "CHECKED_OUT";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <div className="my-5 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {mode === "checkin" ? "Payment before check-in" : "Pay the balance before check-out"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {booking.guest.fullName} · Room {booking.room.roomNumber} · {booking.bookingNumber}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Balance {Number(booking.balance).toLocaleString()} ETB of{" "}
              {Number(booking.totalAmount).toLocaleString()} ETB
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <XCircle size={21} />
          </button>
        </div>

        <div className="mt-5">
          <RecordPayment
            bookingId={booking.id}
            defaultAmount={Number(booking.balance)}
            submitLabel={mode === "checkin" ? "Record payment and check in" : "Record payment and check out"}
            onRecorded={async () => {
              try {
                await api.patch(`/bookings/${booking.id}/status`, { status });
              } finally {
                await onDone();
              }
            }}
          />
        </div>

        <p className="mt-3 text-xs text-gray-500">
          The payment joins the open shift of the person who records it. It shows under Payments This
          Shift.
        </p>
      </div>
    </div>
  );
}

function formatDay(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
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
      className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-lg dark:border-white/10 dark:bg-[#1a231d]"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <div className="rounded-xl bg-[#123c2c]/10 p-2.5 text-[#123c2c]">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold dark:text-white">{value}</p>
    </motion.div>
  );
}

function ReconciliationItem({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${warn ? "text-amber-600 dark:text-amber-400" : "dark:text-white"}`}>
        {value}
      </p>
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