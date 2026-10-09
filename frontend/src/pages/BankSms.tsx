import { motion } from "framer-motion";
import {
  BadgeCheck,
  Clock3,
  Copy,
  MessageSquareText,
  Plus,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";

type TxStatus = "DETECTED" | "UNMATCHED" | "MATCHED" | "REJECTED" | "DUPLICATE" | "REVIEW_REQUIRED";

type BankTransaction = {
  id: string;
  amount: number;
  transactionReference: string | null;
  sender: string;
  smsText: string;
  transactionType: "CREDIT" | "DEBIT" | "OTP" | "MARKETING" | "UNKNOWN";
  receivedAt: string;
  status: TxStatus;
  bankAccount: { id: string; name: string; accountType: "PENSION" | "PERSONAL" } | null;
  match: {
    payment: {
      receiptNumber: string;
      booking: {
        bookingNumber: string;
        guest: { fullName: string };
        room: { roomNumber: string };
      };
    };
  } | null;
};

type UnverifiedPayment = {
  id: string;
  receiptNumber: string;
  amount: number;
  method: string;
  reference: string | null;
  createdAt: string;
  booking: {
    bookingNumber: string;
    guest: { fullName: string };
    room: { roomNumber: string };
  };
};

type Device = {
  id: string;
  label: string;
  status: "ACTIVE" | "REVOKED";
  lastSeenAt: string | null;
  lastSmsAt: string | null;
  createdAt: string;
};

const statusStyles: Record<TxStatus, string> = {
  MATCHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UNMATCHED: "bg-amber-50 text-amber-700 border-amber-200",
  REVIEW_REQUIRED: "bg-purple-50 text-purple-700 border-purple-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  DETECTED: "bg-gray-50 text-gray-700 border-gray-200",
  DUPLICATE: "bg-gray-50 text-gray-700 border-gray-200",
};

const statusLabels: Record<TxStatus, string> = {
  MATCHED: "Verified",
  UNMATCHED: "Waiting for payment",
  REVIEW_REQUIRED: "Needs review",
  REJECTED: "Rejected",
  DETECTED: "Money out",
  DUPLICATE: "Duplicate",
};

const API_BASE: string = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type Tab = "transactions" | "devices" | "setup";

export default function BankSms() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const [tab, setTab] = useState<Tab>("transactions");
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [statusFilter, setStatusFilter] = useState<"All" | TxStatus>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [matchTarget, setMatchTarget] = useState<BankTransaction | null>(null);
  const [newToken, setNewToken] = useState<{ label: string; token: string } | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; transactions: BankTransaction[] }>(
        "/sms-bridge/transactions"
      );
      setTransactions(res.transactions);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load bank SMS.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDevices = useCallback(async () => {
    if (!isOwner) return;

    try {
      const res = await api.get<{ success: boolean; devices: Device[] }>("/sms-bridge/devices");
      setDevices(res.devices);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load devices.");
    }
  }, [isOwner]);

  useEffect(() => {
    loadTransactions();
    loadDevices();

    // New SMS arrive while the page stays open.
    const timer = setInterval(loadTransactions, 30000);
    return () => clearInterval(timer);
  }, [loadTransactions, loadDevices]);

  const counts = useMemo(() => {
    const count = (status: TxStatus) => transactions.filter((tx) => tx.status === status).length;

    return {
      matched: count("MATCHED"),
      unmatched: count("UNMATCHED"),
      review: count("REVIEW_REQUIRED"),
    };
  }, [transactions]);

  const visible = useMemo(
    () =>
      statusFilter === "All"
        ? transactions
        : transactions.filter((tx) => tx.status === statusFilter),
    [transactions, statusFilter]
  );

  const act = async (path: string, failure: string) => {
    try {
      await api.post(path);
      await loadTransactions();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : failure);
    }
  };

  const rematch = async (tx: BankTransaction) => {
    try {
      const res = await api.post<{ success: boolean; matched: boolean }>(
        `/sms-bridge/transactions/${tx.id}/rematch`
      );

      if (!res.matched) {
        alert("No recorded payment fits this SMS yet.");
      }

      await loadTransactions();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not check for a match.");
    }
  };

  const reject = async (tx: BankTransaction) => {
    if (!window.confirm("Reject this SMS? It will not count as a verified payment.")) return;
    await act(`/sms-bridge/transactions/${tx.id}/reject`, "Could not reject this SMS.");
  };

  const unmatch = async (tx: BankTransaction) => {
    if (!window.confirm("Remove the link between this SMS and its payment?")) return;
    await act(`/sms-bridge/transactions/${tx.id}/unmatch`, "Could not remove the match.");
  };

  const addDevice = async (label: string) => {
    try {
      const res = await api.post<{ success: boolean; device: Device; token: string }>(
        "/sms-bridge/devices",
        { label }
      );
      setNewToken({ label: res.device.label, token: res.token });
      await loadDevices();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not add the device.");
    }
  };

  const revokeDevice = async (device: Device) => {
    if (!window.confirm(`Revoke ${device.label}? Its SMS stop reaching the system.`)) return;

    try {
      await api.patch(`/sms-bridge/devices/${device.id}/revoke`);
      await loadDevices();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not revoke the device.");
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-center gap-2">
          <MessageSquareText className="text-[#123c2c]" size={24} />
          <h1 className="text-2xl font-bold tracking-tight">Bank SMS</h1>
        </div>

        <p className="mt-1 text-sm text-gray-500">
          Bank messages from MacroDroid verify bank payments on their own.
        </p>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Verified" value={counts.matched} icon={<BadgeCheck size={20} />} />
        <StatCard label="Waiting for payment" value={counts.unmatched} icon={<Clock3 size={20} />} />
        <StatCard label="Needs review" value={counts.review} icon={<MessageSquareText size={20} />} />
      </div>

      <div className="flex gap-2">
        {(["transactions", "devices", "setup"] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium capitalize transition ${
              tab === key
                ? "border-[#123c2c] bg-[#123c2c] text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {key === "setup" ? "MacroDroid setup" : key}
          </button>
        ))}
      </div>

      {tab === "transactions" && (
        <div className="space-y-4">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "All" | TxStatus)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#123c2c]"
          >
            <option value="All">All messages</option>
            {(Object.keys(statusLabels) as TxStatus[]).map((key) => (
              <option key={key} value={key}>
                {statusLabels[key]}
              </option>
            ))}
          </select>

          {loading ? (
            <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
              Loading...
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 text-center">
              <MessageSquareText className="mx-auto text-gray-300" size={40} />
              <p className="mt-3 text-sm text-gray-500">
                No bank messages yet. Follow the MacroDroid setup tab to connect your phone.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-bold">
                          {tx.transactionType === "DEBIT" ? "-" : "+"}
                          {Number(tx.amount).toLocaleString()} ETB
                        </p>

                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[tx.status]}`}
                        >
                          {statusLabels[tx.status]}
                        </span>

                        {tx.bankAccount && (
                          <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600">
                            {tx.bankAccount.name} ·{" "}
                            {tx.bankAccount.accountType === "PENSION" ? "Pension" : "Personal"}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatDateTime(tx.receivedAt)} · from {tx.sender}
                        {tx.transactionReference ? ` · Ref ${tx.transactionReference}` : ""}
                      </p>

                      <p className="mt-2 line-clamp-2 text-sm text-gray-600">{tx.smsText}</p>

                      {tx.match && (
                        <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                          Verified payment {tx.match.payment.receiptNumber} ·{" "}
                          {tx.match.payment.booking.guest.fullName} · Room{" "}
                          {tx.match.payment.booking.room.roomNumber}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(tx.status === "UNMATCHED" || tx.status === "REVIEW_REQUIRED") && (
                        <>
                          <button
                            onClick={() => setMatchTarget(tx)}
                            className="rounded-xl bg-[#123c2c] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3024]"
                          >
                            Match
                          </button>

                          {tx.status === "UNMATCHED" && (
                            <button
                              onClick={() => rematch(tx)}
                              className="rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium transition hover:bg-gray-50"
                            >
                              Check again
                            </button>
                          )}

                          <button
                            onClick={() => reject(tx)}
                            className="rounded-xl border border-red-100 px-3.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {tx.status === "MATCHED" && isOwner && (
                        <button
                          onClick={() => unmatch(tx)}
                          className="rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium transition hover:bg-gray-50"
                        >
                          Unmatch
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "devices" && (
        <DevicesTab
          isOwner={isOwner}
          devices={devices}
          onAdd={addDevice}
          onRevoke={revokeDevice}
        />
      )}

      {tab === "setup" && <SetupGuide />}

      {matchTarget && (
        <MatchModal
          transaction={matchTarget}
          onClose={() => setMatchTarget(null)}
          onDone={async () => {
            setMatchTarget(null);
            await loadTransactions();
          }}
        />
      )}

      {newToken && <TokenModal data={newToken} onClose={() => setNewToken(null)} />}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-lg"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="rounded-xl bg-[#123c2c]/10 p-2.5 text-[#123c2c]">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </motion.div>
  );
}

function DevicesTab({
  isOwner,
  devices,
  onAdd,
  onRevoke,
}: {
  isOwner: boolean;
  devices: Device[];
  onAdd: (label: string) => Promise<void>;
  onRevoke: (device: Device) => void;
}) {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOwner) {
    return (
      <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Only the owner manages phones that send bank SMS.
      </p>
    );
  }

  const add = async () => {
    if (!label.trim()) return;

    setSaving(true);

    try {
      await onAdd(label.trim());
      setLabel("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:flex-row">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Phone name, for example Reception phone"
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
        />

        <button
          onClick={add}
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0d3024] disabled:opacity-60"
        >
          <Plus size={16} />
          Add phone
        </button>
      </div>

      {devices.length === 0 ? (
        <p className="text-sm text-gray-500">No phone yet. Add one to get its token.</p>
      ) : (
        devices.map((device) => (
          <div
            key={device.id}
            className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#123c2c]/10 text-[#123c2c]">
                <Smartphone size={18} />
              </div>

              <div>
                <p className="font-semibold">
                  {device.label}{" "}
                  <span
                    className={`ml-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                      device.status === "ACTIVE"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {device.status === "ACTIVE" ? "Active" : "Revoked"}
                  </span>
                </p>

                <p className="mt-0.5 text-xs text-gray-500">
                  Last contact {device.lastSeenAt ? formatDateTime(device.lastSeenAt) : "never"} ·
                  last bank SMS {device.lastSmsAt ? formatDateTime(device.lastSmsAt) : "never"}
                </p>
              </div>
            </div>

            {device.status === "ACTIVE" && (
              <button
                onClick={() => onRevoke(device)}
                className="rounded-xl border border-red-100 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Revoke
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function SetupGuide() {
  const url = `${API_BASE}/sms-bridge/ingest`;

  return (
    <div className="space-y-5 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold">Webhook address</p>
        <p className="mt-2 break-all rounded-xl bg-gray-50 px-4 py-3 font-mono text-xs">
          {url}?sender=
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Add the SMS sender magic text after sender=. Use the + button in MacroDroid to
          pick it.
        </p>
      </div>

      <ol className="list-decimal space-y-3 pl-5 text-sm text-gray-700">
        <li>
          In this app, open the Devices tab and add your phone. Copy the token it shows. It
          appears only once.
        </li>
        <li>
          In MacroDroid, create a macro. Pick the trigger SMS Received. Enter your bank sender
          ID, for example CBE or the Telebirr short code. Match the same ID in Settings, Bank
          Accounts, SMS rules.
        </li>
        <li>
          Add the action HTTP Request. Set the method to POST and paste the webhook address
          above.
        </li>
        <li>
          Add the header X-Device-Token with your token. Add the header Content-Type with the
          value text/plain.
        </li>
        <li>
          Set the request body to the SMS message magic text. Pick it from the + list. Plain
          text avoids trouble with quotes and line breaks in bank messages.
        </li>
        <li>
          In your phone settings, turn off battery optimization for MacroDroid so it keeps
          running.
        </li>
        <li>
          Send a test. A bank message appears in the Transactions tab. Staff then record the
          payment with the method Bank Transfer, Telebirr or CBE Birr. The system links the
          two and marks the payment Verified.
        </li>
      </ol>

      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
        One-time passwords and promotions are never stored. The system saves only messages
        from senders you added as a rule.
      </p>
    </div>
  );
}

function MatchModal({
  transaction,
  onClose,
  onDone,
}: {
  transaction: BankTransaction;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [payments, setPayments] = useState<UnverifiedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ success: boolean; payments: UnverifiedPayment[] }>("/sms-bridge/unverified-payments")
      .then((res) => setPayments(res.payments))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const amount = Number(transaction.amount);

    return [...payments].sort(
      (a, b) =>
        Number(Number(b.amount) === amount) - Number(Number(a.amount) === amount)
    );
  }, [payments, transaction.amount]);

  const match = async (paymentId: string) => {
    setBusyId(paymentId);

    try {
      await api.post(`/sms-bridge/transactions/${transaction.id}/match`, { paymentId });
      await onDone();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not match.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <div className="my-5 w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Match to a payment</h2>
            <p className="mt-1 text-sm text-gray-500">
              SMS amount {Number(transaction.amount).toLocaleString()} ETB
              {transaction.transactionReference ? ` · Ref ${transaction.transactionReference}` : ""}
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
            <p className="text-sm text-gray-500">Loading...</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-gray-500">
              No unverified bank payment from the last 14 days.
            </p>
          ) : (
            sorted.map((payment) => {
              const sameAmount = Number(payment.amount) === Number(transaction.amount);

              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3"
                >
                  <div className="text-sm">
                    <p className="font-semibold">
                      {payment.receiptNumber} · {Number(payment.amount).toLocaleString()} ETB
                    </p>
                    <p className="text-xs text-gray-500">
                      {payment.booking.guest.fullName} · Room {payment.booking.room.roomNumber} ·{" "}
                      {formatDateTime(payment.createdAt)}
                      {payment.reference ? ` · Ref ${payment.reference}` : ""}
                    </p>
                  </div>

                  <button
                    onClick={() => match(payment.id)}
                    disabled={!sameAmount || busyId === payment.id}
                    className="rounded-xl bg-[#123c2c] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3024] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sameAmount ? "Match" : "Amount differs"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function TokenModal({
  data,
  onClose,
}: {
  data: { label: string; token: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.token);
      setCopied(true);
    } catch {
      alert("Select the token and copy it by hand.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <div className="my-5 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold">Token for {data.label}</h2>

        <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Copy this token now. You cannot see it again. If you lose it, revoke the phone and
          add a new one.
        </p>

        <p className="mt-4 break-all rounded-xl bg-gray-50 px-4 py-3 font-mono text-xs">
          {data.token}
        </p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={copy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50"
          >
            <Copy size={16} />
            {copied ? "Copied" : "Copy token"}
          </button>

          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:bg-[#0d3024]"
          >
            Done
          </button>
        </div>
      </div>
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