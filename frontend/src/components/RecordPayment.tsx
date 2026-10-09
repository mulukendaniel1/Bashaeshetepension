import { CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError } from "../api";

type PaymentMethod = "CASH" | "TELEBIRR" | "CBE_BIRR" | "BANK_TRANSFER" | "CARD" | "OTHER";

const methodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  TELEBIRR: "Telebirr",
  CBE_BIRR: "CBE Birr",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  OTHER: "Other",
};

type BankAccountOption = {
  id: string;
  name: string;
  bankName: string;
  accountType: "PENSION" | "PERSONAL";
  active: boolean;
};

const BANK_METHODS: PaymentMethod[] = ["BANK_TRANSFER", "TELEBIRR", "CBE_BIRR"];

/**
 * Small form that records a payment against a booking.
 * The amount starts at the full balance. The owner may lower it.
 * The server needs an open shift for the person who records the payment.
 */
export default function RecordPayment({
  bookingId,
  defaultAmount,
  submitLabel,
  onRecorded,
}: {
  bookingId: string;
  defaultAmount: number;
  submitLabel: string;
  onRecorded: () => Promise<void> | void;
}) {
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [accounts, setAccounts] = useState<BankAccountOption[]>([]);
  const [saving, setSaving] = useState(false);

  const needsBank = BANK_METHODS.includes(method);

  // Bank payments are checked against the bank SMS, so staff choose the account.
  useEffect(() => {
    if (!needsBank || accounts.length > 0) return;

    api
      .get<{ success: boolean; accounts: BankAccountOption[] }>("/bank-accounts")
      .then((res) => setAccounts(res.accounts.filter((account) => account.active)))
      .catch(() => setAccounts([]));
  }, [needsBank, accounts.length]);

  const submit = async () => {
    if (!(amount > 0)) {
      alert("Enter an amount above zero.");
      return;
    }

    setSaving(true);

    try {
      await api.post(`/bookings/${bookingId}/payments`, {
        amount,
        method,
        reference: reference.trim() || undefined,
        bankAccountId: needsBank && bankAccountId ? bankAccountId : undefined,
      });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not record payment.");
      setSaving(false);
      return;
    }

    try {
      await onRecorded();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Payment saved, but the next step failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">Amount (ETB)</label>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#123c2c]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">Method</label>
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#123c2c]"
          >
            {(Object.keys(methodLabels) as PaymentMethod[]).map((key) => (
              <option key={key} value={key}>
                {methodLabels[key]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">Reference (optional)</label>
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Receipt or transfer no."
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#123c2c]"
          />
        </div>
      </div>

      {needsBank && (
        <div className="mt-3">
          <label className="mb-1.5 block text-xs font-medium text-gray-500">
            Bank account that received the money
          </label>
          <select
            value={bankAccountId}
            onChange={(event) => setBankAccountId(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#123c2c]"
          >
            <option value="">Not sure</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.accountType === "PENSION" ? "Pension" : "Personal"})
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500">
            The system checks this payment against the bank SMS and marks it Verified.
          </p>
        </div>
      )}

      <button
        onClick={submit}
        disabled={saving}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#123c2c] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CreditCard size={16} />
        {saving ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}