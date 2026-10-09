import { motion } from "framer-motion";
import {
  Banknote,
  CreditCard,
  Landmark,
  Receipt,
  Search,
  Smartphone,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";

type PaymentMethod = "CASH" | "TELEBIRR" | "CBE_BIRR" | "BANK_TRANSFER" | "CARD" | "OTHER";

type Payment = {
  id: string;
  receiptNumber: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  booking: {
    bookingNumber: string;
    guest: { fullName: string };
    room: { roomNumber: string };
  };
  receivedBy: { fullName: string };
  bankTransactionMatch?: { id: string } | null;
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

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get<{ success: boolean; payments: Payment[] }>(
        "/payments"
      );
      setPayments(res.payments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load payments.");
    } finally {
      setLoading(false);
    }
  }

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const query = search.toLowerCase();

      const matchesSearch =
        payment.booking.guest.fullName.toLowerCase().includes(query) ||
        payment.receiptNumber.toLowerCase().includes(query) ||
        payment.booking.bookingNumber.toLowerCase().includes(query);

      const matchesMethod = methodFilter === "All" || payment.method === methodFilter;

      return matchesSearch && matchesMethod;
    });
  }, [payments, search, methodFilter]);

  const totalCollected = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const todaysPayments = payments.filter((payment) => {
    const date = new Date(payment.createdAt);
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }).length;

  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-center gap-2">
          <Wallet className="text-[#123c2c]" size={24} />
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        </div>

        <p className="mt-1 text-sm text-gray-500">
          Track guest payments recorded across all bookings.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Total Collected"
          value={`${totalCollected.toLocaleString()} ETB`}
          icon={<Wallet size={20} />}
        />

        <SummaryCard
          title="Total Payments"
          value={payments.length.toString()}
          icon={<Receipt size={20} />}
        />

        <SummaryCard
          title="Today's Payments"
          value={todaysPayments.toString()}
          icon={<Banknote size={20} />}
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
              placeholder="Search guest, receipt, or booking reference..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#123c2c] focus:bg-white focus:ring-4 focus:ring-[#123c2c]/5"
            />
          </div>

          <select
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
          >
            <option>All</option>
            {(Object.keys(methodLabels) as PaymentMethod[]).map((key) => (
              <option key={key} value={key}>
                {methodLabels[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading payments...
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-225">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Payment
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Guest
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Booking
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Method
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPayments.map((payment, index) => (
                    <motion.tr
                      key={payment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.04 }}
                      className="border-b border-gray-100 last:border-0 transition hover:bg-[#f8faf8]"
                    >
                      <td className="px-5 py-5">
                        <p className="font-semibold">{payment.receiptNumber}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(payment.createdAt)}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#123c2c]/10 text-[#123c2c]">
                            <UserRound size={17} />
                          </div>
                          <p className="font-medium">{payment.booking.guest.fullName}</p>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm font-medium">{payment.booking.bookingNumber}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Room {payment.booking.room.roomNumber}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <span className="flex items-center gap-2 text-sm">
                          {methodIcons[payment.method]}
                          {methodLabels[payment.method]}
                        </span>

                        {payment.bankTransactionMatch && (
                          <span className="mt-1.5 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Verified by SMS
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-semibold">
                          {Number(payment.amount).toLocaleString()} ETB
                        </p>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:hidden">
            {filteredPayments.map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{payment.receiptNumber}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {payment.booking.guest.fullName}
                    </p>
                  </div>

                  <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium">
                    {methodLabels[payment.method]}
                    {payment.bankTransactionMatch ? " · Verified" : ""}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <InfoItem label="Booking" value={payment.booking.bookingNumber} />
                  <InfoItem label="Room" value={payment.booking.room.roomNumber} />
                  <InfoItem
                    label="Amount"
                    value={`${Number(payment.amount).toLocaleString()} ETB`}
                  />
                  <InfoItem label="Date" value={formatDate(payment.createdAt)} />
                </div>
              </motion.div>
            ))}
          </div>

          {filteredPayments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <Wallet className="mx-auto text-gray-300" size={42} />
              <h3 className="mt-4 font-semibold">No payments found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Payments recorded during check-out will appear here.
              </p>
            </div>
          )}
        </>
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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}