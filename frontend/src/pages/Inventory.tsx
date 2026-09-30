import { motion } from "framer-motion";
import {
  AlertTriangle,
  Boxes,
  Package,
  PackageCheck,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minimumStock: number;
  unit: string;
  supplier: string | null;
  location: string | null;
  updatedAt: string;
};

const categoryOptions = ["Linen", "Toiletries", "Cleaning", "Kitchen", "Furniture"];

const categoryStyles: Record<string, string> = {
  Linen: "bg-blue-50 text-blue-700 border-blue-200",
  Toiletries: "bg-purple-50 text-purple-700 border-purple-200",
  Cleaning: "bg-amber-50 text-amber-700 border-amber-200",
  Kitchen: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Furniture: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get<{ success: boolean; items: InventoryItem[] }>(
        "/inventory"
      );
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load inventory.");
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const query = search.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(query);
      const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  const lowStockItems = items.filter(
    (item) => Number(item.quantity) <= Number(item.minimumStock)
  );
  const totalUnits = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const addItem = async (item: {
    name: string;
    category: string;
    quantity: number;
    minimumStock: number;
    unit: string;
  }) => {
    try {
      const res = await api.post<{ success: boolean; item: InventoryItem }>(
        "/inventory",
        item
      );
      setItems((current) => [...current, res.item]);
      setShowModal(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not save item.");
    }
  };

  const adjustQuantity = async (id: string, delta: number) => {
    setAdjustingId(id);

    try {
      const res = await api.post<{ success: boolean; item: InventoryItem }>(
        `/inventory/${id}/adjust`,
        { delta }
      );
      setItems((current) =>
        current.map((item) => (item.id === id ? res.item : item))
      );
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not adjust quantity.");
    } finally {
      setAdjustingId(null);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Track linen, toiletries, cleaning, and kitchen stock.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024]"
        >
          <Plus size={18} />
          Add Item
        </motion.button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="Total Units" value={totalUnits.toLocaleString()} icon={<Package size={20} />} />
        <SummaryCard title="Item Types" value={items.length.toString()} icon={<PackageCheck size={20} />} />
        <SummaryCard
          title="Low Stock Alerts"
          value={lowStockItems.length.toString()}
          icon={<AlertTriangle size={20} />}
        />
      </div>

      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle size={18} />
            <p className="text-sm font-semibold">
              {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} at or below reorder level
            </p>
          </div>

          <p className="mt-1 text-sm text-amber-700">
            {lowStockItems.map((item) => item.name).join(", ")}
          </p>
        </div>
      )}

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
              placeholder="Search item name..."
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
          Loading inventory...
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Item</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Category</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Quantity</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reorder Level</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Adjust</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((item, index) => {
                    const isLow = Number(item.quantity) <= Number(item.minimumStock);

                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.04 }}
                        className="border-b border-gray-100 last:border-0 transition hover:bg-[#f8faf8]"
                      >
                        <td className="px-5 py-5">
                          <p className="font-semibold">{item.name}</p>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${categoryStyles[item.category] || categoryStyles.Furniture}`}
                          >
                            {item.category}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <p className={`font-semibold ${isLow ? "text-amber-600" : ""}`}>
                            {Number(item.quantity)} {item.unit}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <p className="text-sm text-gray-500">
                            {Number(item.minimumStock)} {item.unit}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => adjustQuantity(item.id, -1)}
                              disabled={adjustingId === item.id}
                              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50"
                            >
                              -
                            </button>

                            <button
                              onClick={() => adjustQuantity(item.id, 1)}
                              disabled={adjustingId === item.id}
                              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:hidden">
            {filteredItems.map((item, index) => {
              const isLow = Number(item.quantity) <= Number(item.minimumStock);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="mt-1 text-sm text-gray-500">{item.category}</p>
                    </div>

                    {isLow && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        Low Stock
                      </span>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <InfoItem label="Quantity" value={`${Number(item.quantity)} ${item.unit}`} />
                    <InfoItem label="Reorder At" value={`${Number(item.minimumStock)} ${item.unit}`} />
                  </div>

                  <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
                    <button
                      onClick={() => adjustQuantity(item.id, -1)}
                      className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium"
                    >
                      Remove one
                    </button>

                    <button
                      onClick={() => adjustQuantity(item.id, 1)}
                      className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium"
                    >
                      Add one
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <Boxes className="mx-auto text-gray-300" size={42} />
              <h3 className="mt-4 font-semibold">No items found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing your search or filter.
              </p>
            </div>
          )}
        </>
      )}

      {showModal && (
        <ItemModal onClose={() => setShowModal(false)} onSave={addItem} />
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

function ItemModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (item: {
    name: string;
    category: string;
    quantity: number;
    minimumStock: number;
    unit: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Linen");
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState("pcs");
  const [minimumStock, setMinimumStock] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || quantity < 0) {
      return;
    }

    setSaving(true);

    try {
      await onSave({ name, category, quantity, minimumStock, unit });
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
            <h2 className="text-xl font-bold">Add Item</h2>
            <p className="mt-1 text-sm text-gray-500">Add a new item to inventory.</p>
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
              <label className="mb-2 block text-sm font-medium">Item name</label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Bath towels"
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
              <label className="mb-2 block text-sm font-medium">Unit</label>

              <input
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="pcs, sets, bottles..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Quantity</label>

              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Reorder level</label>

              <input
                type="number"
                min="0"
                value={minimumStock}
                onChange={(event) => setMinimumStock(Number(event.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
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
              {saving ? "Saving..." : "Save Item"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}