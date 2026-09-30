import { motion } from "framer-motion";
import {
  Banknote,
  Receipt,
  Search,
  ShoppingCart,
  TrendingDown,
  Trash2,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";

type ExpenseMethod = "CASH" | "TELEBIRR" | "CBE_BIRR" | "BANK_TRANSFER" | "CARD" | "OTHER";

type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  method: ExpenseMethod;
  notes: string | null;
  createdAt: string;
  recordedBy: { fullName: string };
};

const categoryOptions = ["Utilities", "Maintenance", "Supplies", "Staff", "Other"];

const categoryIcons: Record<string, React.ReactNode> = {
  Utilities: <Zap size={16} />,
  Maintenance: <Wrench size={16} />,
  Supplies: <ShoppingCart size={16} />,
  Staff: <Banknote size={16} />,
  Other: <Receipt size={16} />,
};

const categoryStyles: Record<string, string> = {
  Utilities: "bg-blue-50 text-blue-700 border-blue-200",
  Maintenance: "bg-amber-50 text-amber-700 border-amber-200",
  Supplies: "bg-purple-50 text-purple-700 border-purple-200",
  Staff: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Other: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get<{ success: boolean; expenses: Expense[] }>(
        "/expenses"
      );
      setExpenses(res.expenses);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load expenses.");
    } finally {
      setLoading(false);
    }
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const query = search.toLowerCase();

      const matchesSearch =
        (expense.description || "").toLowerCase().includes(query) ||
        expense.category.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "All" || expense.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [expenses, search, categoryFilter]);

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const thisMonthExpenses = expenses
    .filter((expense) => {
      const date = new Date(expense.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {};

    expenses.forEach((expense) => {
      totals[expense.category] = (totals[expense.category] || 0) + Number(expense.amount || 0);
    });

    const entries = Object.entries(totals);
    if (entries.length === 0) return "None";

    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [expenses]);

  const addExpense = async (expense: {
    amount: number;
    category: string;
    description: string;
    method: ExpenseMethod;
    notes: string;
  }) => {
    try {
      const res = await api.post<{ success: boolean; expense: Expense }>(
        "/expenses",
        expense
      );
      setExpenses((current) => [res.expense, ...current]);
      setShowModal(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not save expense.");
    }
  };

  const deleteExpense = async (id: string) => {
    const confirmed = window.confirm("Delete this expense?");
    if (!confirmed) return;

    try {
      await api.delete(`/expenses/${id}`);
      setExpenses((current) => current.filter((expense) => expense.id !== id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not delete expense.");
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <TrendingDown className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Track operating costs, repairs, and supplies.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024]"
        >
          <Plus size={18} />
          Add Expense
        </motion.button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Total Expenses"
          value={`${totalExpenses.toLocaleString()} ETB`}
          icon={<Receipt size={20} />}
        />

        <SummaryCard
          title="This Month"
          value={`${thisMonthExpenses.toLocaleString()} ETB`}
          icon={<Banknote size={20} />}
        />

        <SummaryCard title="Top Category" value={topCategory} icon={<TrendingDown size={20} />} />
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
              placeholder="Search description or category..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#123c2c] focus:bg-white focus:ring-4 focus:ring-[#123c2c]/5"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
          >
            <option>All</option>
            {categoryOptions.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading expenses...
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Expense
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Category
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Recorded By
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Date
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Amount
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExpenses.map((expense, index) => (
                    <motion.tr
                      key={expense.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.04 }}
                      className="border-b border-gray-100 last:border-0 transition hover:bg-[#f8faf8]"
                    >
                      <td className="px-5 py-5">
                        <p className="font-semibold">{expense.description || expense.category}</p>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${categoryStyles[expense.category] || categoryStyles.Other}`}
                        >
                          {categoryIcons[expense.category] || categoryIcons.Other}
                          {expense.category}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm">{expense.recordedBy.fullName}</p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm text-gray-500">{formatDate(expense.createdAt)}</p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-semibold">
                          {Number(expense.amount).toLocaleString()} ETB
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex justify-end">
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="rounded-xl border border-red-100 p-2.5 text-red-500 transition hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:hidden">
            {filteredExpenses.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{expense.description || expense.category}</p>
                    <p className="mt-1 text-sm text-gray-500">{expense.recordedBy.fullName}</p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${categoryStyles[expense.category] || categoryStyles.Other}`}
                  >
                    {categoryIcons[expense.category] || categoryIcons.Other}
                    {expense.category}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <InfoItem label="Date" value={formatDate(expense.createdAt)} />
                  <InfoItem label="Amount" value={`${Number(expense.amount).toLocaleString()} ETB`} />
                </div>

                <button
                  onClick={() => deleteExpense(expense.id)}
                  className="mt-4 w-full rounded-xl border border-red-100 py-2.5 text-sm font-medium text-red-500"
                >
                  Delete
                </button>
              </motion.div>
            ))}
          </div>

          {filteredExpenses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <Receipt className="mx-auto text-gray-300" size={42} />
              <h3 className="mt-4 font-semibold">No expenses found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing your search or filter.
              </p>
            </div>
          )}
        </>
      )}

      {showModal && (
        <ExpenseModal onClose={() => setShowModal(false)} onSave={addExpense} />
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

function ExpenseModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (expense: {
    amount: number;
    category: string;
    description: string;
    method: ExpenseMethod;
    notes: string;
  }) => void;
}) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Utilities");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<ExpenseMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!description || amount <= 0) {
      return;
    }

    setSaving(true);

    try {
      await onSave({ description, category, amount, method, notes });
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
            <h2 className="text-xl font-bold">Add Expense</h2>
            <p className="mt-1 text-sm text-gray-500">Record a new operating cost.</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <XCircle size={21} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">Description</label>

              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="e.g. Electricity bill"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Category</label>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
              >
                {categoryOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Amount (ETB)</label>

              <input
                type="number"
                min="0"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">Payment method</label>

              <select
                value={method}
                onChange={(event) => setMethod(event.target.value as ExpenseMethod)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
              >
                <option value="CASH">Cash</option>
                <option value="TELEBIRR">Telebirr</option>
                <option value="CBE_BIRR">CBE Birr</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
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

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-[#123c2c] py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Expense"}
            </button>
          </div>
        </div>
      </motion.div>
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