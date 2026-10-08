import { motion } from "framer-motion";
import {
  Banknote,
  Calculator,
  CreditCard,
  FileBarChart,
  Landmark,
  Printer,
  Receipt,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";
import ThermalPrint, { ThermalRow } from "../components/ThermalPrint";

type PaymentMethod = "CASH" | "TELEBIRR" | "CBE_BIRR" | "BANK_TRANSFER" | "CARD" | "OTHER";

type ShiftSummary = {
  id: string;
  label: string;
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

export default function ZReport() {
  const { user } = useAuth();
  const [myShifts, setMyShifts] = useState<ShiftSummary[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isPrivileged = user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "ACCOUNTANT";

  useEffect(() => {
    loadShifts();
  }, []);

  useEffect(() => {
    if (selectedShiftId) {
      loadReport(selectedShiftId);
    }
  }, [selectedShiftId]);

  async function loadShifts() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get<{ success: boolean; shifts: ShiftSummary[] }>("/shifts?mine=true");
      setMyShifts(res.shifts);

      if (res.shifts.length > 0) {
        setSelectedShiftId(res.shifts[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load shifts.");
      setLoading(false);
    }
  }

  async function loadReport(shiftId: string) {
    setLoading(true);
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

  const bankAccountEntries = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.totalsByBankAccount);
  }, [report]);

  const handlePrint = () => {
    window.print();
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
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
          >
            <Printer size={18} />
            Print
          </button>
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
                {shift.label} · {formatDateTime(shift.openedAt)} · {shift.status === "OPEN" ? "Open" : "Closed"}
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
              title="Total Collected"
              value={`${report.totalCollected.toLocaleString()} ETB`}
              icon={<Wallet size={20} />}
            />

            <SummaryCard
              title="Payments"
              value={report.totalPaymentCount.toString()}
              icon={<Receipt size={20} />}
            />

            <SummaryCard
              title="Opening Cash"
              value={`${report.cashReconciliation.openingCash.toLocaleString()} ETB`}
              icon={<Calculator size={20} />}
            />

            <SummaryCard
              title="Expected Closing Cash"
              value={`${report.cashReconciliation.expectedClosingCash.toLocaleString()} ETB`}
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
            <h3 className="mb-5 font-bold dark:text-white">Cash Reconciliation</h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ReconciliationItem
                label="Opening Cash"
                value={`${report.cashReconciliation.openingCash.toLocaleString()} ETB`}
              />
              <ReconciliationItem
                label="Cash Collected"
                value={`${report.cashReconciliation.cashCollected.toLocaleString()} ETB`}
              />
              <ReconciliationItem
                label="Expected Closing"
                value={`${report.cashReconciliation.expectedClosingCash.toLocaleString()} ETB`}
              />

              {report.cashReconciliation.actualClosingCash !== null ? (
                <ReconciliationItem
                  label="Variance"
                  value={`${report.cashReconciliation.variance! >= 0 ? "+" : ""}${report.cashReconciliation.variance!.toLocaleString()} ETB`}
                  warn={report.cashReconciliation.variance !== 0}
                />
              ) : (
                <ReconciliationItem label="Variance" value="Shift still open" />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a231d]">
            <h3 className="mb-5 font-bold dark:text-white">Payments This Shift</h3>

            {report.payments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No payments recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
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
                    </tr>
                  </thead>

                  <tbody>
                    {report.payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-100 last:border-0 dark:border-white/5">
                        <td className="px-3 py-4 text-sm font-medium dark:text-white">{payment.receiptNumber}</td>
                        <td className="px-3 py-4 text-sm dark:text-gray-200">
                          {payment.booking.guest.fullName} · Room {payment.booking.room.roomNumber}
                        </td>
                        <td className="px-3 py-4 text-sm dark:text-gray-200">{methodLabels[payment.method]}</td>
                        <td className="px-3 py-4 text-sm font-semibold dark:text-white">
                          {payment.amount.toLocaleString()} ETB
                        </td>
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
        <ThermalPrint>
          <img
            src="/logo.png"
            alt=""
            className="tp-logo"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <p className="tp-center tp-title">Basha Eshete Pension</p>
          <p className="tp-center tp-bold">Z REPORT</p>

          <div className="tp-line" />

          <ThermalRow label="Shift" value={report.shift.label} />
          <ThermalRow label="Cashier" value={report.shift.user.fullName} />
          <ThermalRow label="Opened" value={formatDateTime(report.shift.openedAt)} />
          <ThermalRow
            label="Closed"
            value={report.shift.closedAt ? formatDateTime(report.shift.closedAt) : "Still open"}
          />

          <div className="tp-line" />

          <ThermalRow label="Total Collected" value={`${report.totalCollected.toLocaleString()} ETB`} bold />
          <ThermalRow label="Payments" value={report.totalPaymentCount.toString()} />

          <div className="tp-line" />
          <p className="tp-heading">By Method</p>
          {methodEntries.length === 0 && <p>No payments.</p>}
          {methodEntries.map(([method, amount]) => (
            <ThermalRow key={method} label={methodLabels[method]} value={`${amount.toLocaleString()} ETB`} />
          ))}

          {bankAccountEntries.length > 0 && (
            <>
              <div className="tp-line" />
              <p className="tp-heading">Bank Accounts</p>
              {bankAccountEntries.map(([account, amount]) => (
                <ThermalRow key={account} label={account} value={`${amount.toLocaleString()} ETB`} />
              ))}
            </>
          )}

          <div className="tp-line" />
          <p className="tp-heading">Cash</p>
          <ThermalRow label="Opening" value={`${report.cashReconciliation.openingCash.toLocaleString()} ETB`} />
          <ThermalRow label="Collected" value={`${report.cashReconciliation.cashCollected.toLocaleString()} ETB`} />
          <ThermalRow
            label="Expected Close"
            value={`${report.cashReconciliation.expectedClosingCash.toLocaleString()} ETB`}
          />
          {report.cashReconciliation.actualClosingCash !== null ? (
            <>
              <ThermalRow
                label="Actual Close"
                value={`${report.cashReconciliation.actualClosingCash.toLocaleString()} ETB`}
              />
              <ThermalRow
                label="Variance"
                value={`${report.cashReconciliation.variance! >= 0 ? "+" : ""}${report.cashReconciliation.variance!.toLocaleString()} ETB`}
                bold
              />
            </>
          ) : (
            <ThermalRow label="Variance" value="Shift open" />
          )}

          <div className="tp-line" />
          <p className="tp-heading">Payments</p>
          {report.payments.length === 0 && <p>No payments.</p>}
          {report.payments.map((payment) => (
            <div key={payment.id} className="tp-item">
              <ThermalRow label={payment.receiptNumber} value={payment.amount.toLocaleString()} />
              <p className="tp-sub">
                {payment.booking.guest.fullName} - Room {payment.booking.room.roomNumber} - {methodLabels[payment.method]}
              </p>
            </div>
          ))}

          <div className="tp-line" />
          <p className="tp-center tp-small">Printed: {new Date().toLocaleString("en-GB")}</p>
        </ThermalPrint>
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