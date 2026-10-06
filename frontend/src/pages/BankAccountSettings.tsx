import { motion } from "framer-motion";
import {
  Beaker,
  ChevronLeft,
  Landmark,
  Plus,
  Power,
  Settings as SettingsIcon,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";

type AccountType = "PENSION" | "PERSONAL";

type BankAccount = {
  id: string;
  name: string;
  bankName: string;
  accountNumberMasked: string;
  accountIdentifier: string;
  accountType: AccountType;
  active: boolean;
  smsRules: BankSmsRule[];
};

type BankSmsRule = {
  id: string;
  bankAccountId: string;
  bankName: string;
  smsSender: string;
  enabled: boolean;
  amountPattern: string;
  accountPattern: string | null;
  referencePattern: string | null;
  datePattern: string | null;
  creditKeywords: string;
  debitKeywords: string | null;
  bankAccount?: { id: string; name: string; accountType: AccountType };
};

type ParseResult = {
  transactionType: "CREDIT" | "DEBIT" | "OTP" | "MARKETING" | "UNKNOWN";
  amount: number | null;
  reference: string | null;
  transactionDate: string | null;
  confidence: number;
};

export default function BankAccountSettings() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState<string | null>(null);
  const [showTester, setShowTester] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get<{ success: boolean; accounts: BankAccount[] }>("/bank-accounts");
      setAccounts(res.accounts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load bank accounts.");
    } finally {
      setLoading(false);
    }
  }

  const addAccount = async (data: {
    name: string;
    bankName: string;
    accountNumberMasked: string;
    accountIdentifier: string;
    accountType: AccountType;
  }) => {
    try {
      await api.post("/bank-accounts", data);
      setShowAccountModal(false);
      loadAccounts();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not create bank account.");
    }
  };

  const toggleActive = async (account: BankAccount) => {
    try {
      await api.patch(`/bank-accounts/${account.id}`, { active: !account.active });
      loadAccounts();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not update account.");
    }
  };

  const deleteAccount = async (id: string) => {
    if (!window.confirm("Delete this bank account and its SMS rules?")) return;

    try {
      await api.delete(`/bank-accounts/${id}`);
      loadAccounts();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not delete account.");
    }
  };

  const addRule = async (bankAccountId: string, data: {
    bankName: string;
    smsSender: string;
    amountPattern: string;
    referencePattern: string;
    creditKeywords: string;
    debitKeywords: string;
  }) => {
    try {
      await api.post("/bank-accounts/rules", { bankAccountId, ...data });
      setShowRuleModal(null);
      loadAccounts();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not create SMS rule.");
    }
  };

  const deleteRule = async (id: string) => {
    if (!window.confirm("Delete this SMS rule?")) return;

    try {
      await api.delete(`/bank-accounts/rules/${id}`);
      loadAccounts();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not delete rule.");
    }
  };

  const allRules = accounts.flatMap((a) => a.smsRules.map((r) => ({ ...r, bankAccount: { id: a.id, name: a.name, accountType: a.accountType } })));

  return (
    <div className="space-y-7">
      <Link
        to="/settings"
        className="flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#123c2c] dark:text-gray-400 dark:hover:text-white"
      >
        <ChevronLeft size={18} />
        Back to Settings
      </Link>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight dark:text-white">Bank Accounts &amp; SMS Rules</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure Pension and Personal accounts and how incoming bank SMS is parsed.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowTester(true)}
            disabled={allRules.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
          >
            <Beaker size={18} />
            Test Parser
          </button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAccountModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024]"
          >
            <Plus size={18} />
            Add Account
          </motion.button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm dark:border-white/10 dark:bg-[#1a231d] dark:text-gray-400">
          Loading...
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-white/15 dark:bg-[#1a231d]">
          <Landmark className="mx-auto text-gray-300 dark:text-gray-600" size={42} />
          <h3 className="mt-4 font-semibold dark:text-white">No bank accounts yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add your Pension and Personal accounts to start matching bank SMS.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {accounts.map((account) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a231d]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      account.accountType === "PENSION"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400"
                    }`}
                  >
                    {account.accountType === "PENSION" ? "Pension Account" : "Personal Account"}
                  </span>

                  <p className="mt-3 text-lg font-bold dark:text-white">{account.name}</p>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {account.bankName} · {account.accountNumberMasked}
                  </p>

                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Identifier: {account.accountIdentifier}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(account)}
                    title={account.active ? "Deactivate" : "Activate"}
                    className={`rounded-xl border p-2.5 transition ${
                      account.active
                        ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-400"
                        : "border-gray-200 text-gray-400 hover:bg-gray-50 dark:border-white/10 dark:text-gray-500"
                    }`}
                  >
                    <Power size={15} />
                  </button>

                  <button
                    onClick={() => deleteAccount(account.id)}
                    className="rounded-xl border border-red-100 p-2.5 text-red-500 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-5 border-t border-gray-100 pt-4 dark:border-white/10">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    SMS Rules
                  </p>

                  <button
                    onClick={() => setShowRuleModal(account.id)}
                    className="text-xs font-medium text-[#123c2c] hover:underline dark:text-emerald-400"
                  >
                    + Add Rule
                  </button>
                </div>

                {account.smsRules.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">No rules configured.</p>
                ) : (
                  <div className="space-y-2">
                    {account.smsRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between rounded-xl border border-gray-100 p-3 dark:border-white/10"
                      >
                        <div>
                          <p className="text-sm font-medium dark:text-gray-200">
                            {rule.bankName} · Sender: {rule.smsSender}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                            Credit keywords: {rule.creditKeywords}
                          </p>
                        </div>

                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-500/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showAccountModal && (
        <AccountModal onClose={() => setShowAccountModal(false)} onSave={addAccount} />
      )}

      {showRuleModal && (
        <RuleModal
          bankAccountId={showRuleModal}
          onClose={() => setShowRuleModal(null)}
          onSave={(data) => addRule(showRuleModal, data)}
        />
      )}

      {showTester && (
        <TesterModal rules={allRules} onClose={() => setShowTester(false)} />
      )}
    </div>
  );
}

function AccountModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: {
    name: string;
    bankName: string;
    accountNumberMasked: string;
    accountIdentifier: string;
    accountType: AccountType;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumberMasked, setAccountNumberMasked] = useState("");
  const [accountIdentifier, setAccountIdentifier] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("PENSION");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !bankName || !accountNumberMasked || !accountIdentifier) return;

    setSaving(true);
    try {
      await onSave({ name, bankName, accountNumberMasked, accountIdentifier, accountType });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="my-5 w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-[#1a231d]"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-white/10">
          <h2 className="text-xl font-bold dark:text-white">Add Bank Account</h2>

          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-white/10">
            <XCircle size={21} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium dark:text-gray-200">Account type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="PENSION">Pension</option>
                <option value="PERSONAL">Personal</option>
              </select>
            </div>

            <Field label="Account name" value={name} onChange={setName} placeholder="e.g. Pension Business Account" />
            <Field label="Bank name" value={bankName} onChange={setBankName} placeholder="e.g. Commercial Bank of Ethiopia" />
            <Field label="Masked account number" value={accountNumberMasked} onChange={setAccountNumberMasked} placeholder="XXXXX1234" />
            <div className="sm:col-span-2">
              <Field
                label="Account identifier (what the SMS uses to name this account)"
                value={accountIdentifier}
                onChange={setAccountIdentifier}
                placeholder="XXXXX1234 or a nickname found in the SMS"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Account"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function RuleModal({
  onClose,
  onSave,
}: {
  bankAccountId: string;
  onClose: () => void;
  onSave: (data: {
    bankName: string;
    smsSender: string;
    amountPattern: string;
    referencePattern: string;
    creditKeywords: string;
    debitKeywords: string;
  }) => void;
}) {
  const [bankName, setBankName] = useState("");
  const [smsSender, setSmsSender] = useState("");
  const [amountPattern, setAmountPattern] = useState("ETB\\s*([0-9,]+(?:\\.[0-9]+)?)");
  const [referencePattern, setReferencePattern] = useState("Ref:?\\s*([A-Z0-9]+)");
  const [creditKeywords, setCreditKeywords] = useState("credited");
  const [debitKeywords, setDebitKeywords] = useState("debited");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!bankName || !smsSender || !amountPattern || !creditKeywords) return;

    setSaving(true);
    try {
      await onSave({ bankName, smsSender, amountPattern, referencePattern, creditKeywords, debitKeywords });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="my-5 w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-[#1a231d]"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-white/10">
          <h2 className="text-xl font-bold dark:text-white">Add SMS Rule</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-white/10">
            <XCircle size={21} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Bank name" value={bankName} onChange={setBankName} placeholder="e.g. CBE" />
            <Field label="SMS sender ID" value={smsSender} onChange={setSmsSender} placeholder="e.g. CBE or 127" />

            <div className="sm:col-span-2">
              <Field
                label="Amount pattern (regex, capture group 1 = amount)"
                value={amountPattern}
                onChange={setAmountPattern}
              />
            </div>

            <div className="sm:col-span-2">
              <Field
                label="Reference pattern (regex, capture group 1 = reference)"
                value={referencePattern}
                onChange={setReferencePattern}
              />
            </div>

            <Field label="Credit keywords (comma separated)" value={creditKeywords} onChange={setCreditKeywords} />
            <Field label="Debit keywords (comma separated)" value={debitKeywords} onChange={setDebitKeywords} />
          </div>

          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Use the Test Parser tool after saving to confirm this rule extracts the right amount and reference from a real SMS.
          </p>

          <div className="mt-6 flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Rule"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TesterModal({
  rules,
  onClose,
}: {
  rules: BankSmsRule[];
  onClose: () => void;
}) {
  const [ruleId, setRuleId] = useState(rules[0]?.id || "");
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  const runTest = async () => {
    if (!text || !ruleId) return;

    setTesting(true);
    setError("");
    setResult(null);

    try {
      const res = await api.post<{ success: boolean; result: ParseResult }>("/bank-accounts/rules/test", {
        text,
        ruleId,
      });
      setResult(res.result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not test this SMS.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="my-5 w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-[#1a231d]"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Beaker size={18} className="text-[#123c2c]" />
            <h2 className="text-xl font-bold dark:text-white">Test SMS Parser</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-white/10">
            <XCircle size={21} />
          </button>
        </div>

        <div className="p-6">
          <label className="mb-2 block text-sm font-medium dark:text-gray-200">Rule to test against</label>

          <select
            value={ruleId}
            onChange={(e) => setRuleId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.bankAccount?.name} · {rule.bankName}
              </option>
            ))}
          </select>

          <label className="mb-2 mt-5 block text-sm font-medium dark:text-gray-200">Sample SMS text</label>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Paste a real or sample bank SMS here..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] dark:border-white/10 dark:bg-white/5 dark:text-white"
          />

          {error && (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-4 rounded-2xl bg-[#123c2c] p-5 text-white">
              <p className="text-sm text-white/70">Detected type</p>
              <p className="text-lg font-bold">{result.transactionType}</p>

              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs text-white/60">Amount</p>
                  <p className="mt-1 font-semibold">
                    {result.amount !== null ? `${result.amount.toLocaleString()} ETB` : "Not detected"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/60">Reference</p>
                  <p className="mt-1 font-semibold">{result.reference || "Not detected"}</p>
                </div>

                <div>
                  <p className="text-xs text-white/60">Confidence</p>
                  <p className="mt-1 font-semibold">{result.confidence}%</p>
                </div>

                <div>
                  <p className="text-xs text-white/60">Would queue</p>
                  <p className="mt-1 font-semibold">
                    {result.transactionType === "CREDIT" && result.amount !== null && result.confidence >= 70
                      ? "Yes, automatically"
                      : result.transactionType === "CREDIT"
                      ? "Requires review"
                      : "No"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">
              Close
            </button>
            <button
              onClick={runTest}
              disabled={testing || !text}
              className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {testing ? "Testing..." : "Run Test"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium dark:text-gray-200">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
      />
    </div>
  );
}