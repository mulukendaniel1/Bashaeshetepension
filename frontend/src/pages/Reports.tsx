import { motion } from "framer-motion";
import {
  BarChart3,
  Banknote,
  FileSpreadsheet,
  FileText,
  PiggyBank,
  Printer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Requires these packages:
 *   npm install jspdf jspdf-autotable xlsx
 */

// Paste your logo as a base64 data URI here to include it in the PDF export.
// Example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
const LOGO_BASE64 = "";

// Replace with your registered TIN number.
const TIN_NUMBER = "0012345678";

type ReportRow = {
  id: string;
  category: string;
  type: "Revenue" | "Expense";
  amount: number;
  date: string; // YYYY-MM-DD
};

const typeStyles: Record<ReportRow["type"], string> = {
  Revenue: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Expense: "bg-red-50 text-red-700 border-red-200",
};

type Period = "daily" | "weekly" | "monthly" | "yearly";

function getWeekRange(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function Reports() {
  const todayISO = toISODate(new Date());

  const [period, setPeriod] = useState<Period>("monthly");
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [selectedWeek, setSelectedWeek] = useState(todayISO);
  const [selectedMonth, setSelectedMonth] = useState(todayISO.slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(todayISO.slice(0, 4));

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadLedger() {
      try {
        const res = await api.get<{ success: boolean; rows: ReportRow[] }>(
          "/reports/ledger"
        );

        if (!cancelled) {
          setRows(res.rows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load report data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLedger();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    if (period === "daily") {
      return rows.filter((row) => row.date === selectedDate);
    }

    if (period === "weekly") {
      const { start, end } = getWeekRange(selectedWeek);
      return rows.filter((row) => {
        const rowDate = new Date(`${row.date}T00:00:00`);
        return rowDate >= start && rowDate <= end;
      });
    }

    if (period === "monthly") {
      return rows.filter((row) => row.date.startsWith(selectedMonth));
    }

    return rows.filter((row) => row.date.startsWith(selectedYear));
  }, [rows, period, selectedDate, selectedWeek, selectedMonth, selectedYear]);

  const totalRevenue = filteredRows
    .filter((row) => row.type === "Revenue")
    .reduce((sum, row) => sum + row.amount, 0);

  const totalExpenses = filteredRows
    .filter((row) => row.type === "Expense")
    .reduce((sum, row) => sum + row.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  const profitMargin =
    totalRevenue === 0 ? 0 : Math.round((netProfit / totalRevenue) * 100);

  const periodLabel = useMemo(() => {
    if (period === "daily") {
      return new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }

    if (period === "weekly") {
      const { start, end } = getWeekRange(selectedWeek);
      return `${start.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
    }

    if (period === "monthly") {
      return new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString(
        "en-GB",
        { month: "long", year: "numeric" },
      );
    }

    return selectedYear;
  }, [period, selectedDate, selectedWeek, selectedMonth, selectedYear]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    let titleX = 14;

    if (LOGO_BASE64) {
      doc.addImage(LOGO_BASE64, "PNG", 14, 8, 16, 16);
      titleX = 34;
    }

    doc.setFontSize(16);
    doc.text("Basha Eshete Pension - Financial Report", titleX, 18);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${periodLabel}`, 14, 30);
    doc.text(`TIN: ${TIN_NUMBER}`, 14, 36);

    doc.setFontSize(10);
    doc.text(`Total Revenue: ${totalRevenue.toLocaleString()} ETB`, 14, 46);
    doc.text(`Total Expenses: ${totalExpenses.toLocaleString()} ETB`, 14, 52);
    doc.text(`Net Profit: ${netProfit.toLocaleString()} ETB`, 14, 58);
    doc.text(`Profit Margin: ${profitMargin}%`, 14, 64);

    autoTable(doc, {
      startY: 72,
      head: [["Category", "Type", "Date", "Amount (ETB)"]],
      body: filteredRows.map((row) => [
        row.category,
        row.type,
        formatDate(row.date),
        row.amount.toLocaleString(),
      ]),
      headStyles: { fillColor: [18, 60, 44] },
    });

    doc.save(`report-${period}-${selectedYear}.pdf`);
  };

  const handleExportExcel = () => {
    const summarySheet = XLSX.utils.json_to_sheet([
      { Metric: "Period", Value: periodLabel },
      { Metric: "Total Revenue (ETB)", Value: totalRevenue },
      { Metric: "Total Expenses (ETB)", Value: totalExpenses },
      { Metric: "Net Profit (ETB)", Value: netProfit },
      { Metric: "Profit Margin (%)", Value: profitMargin },
    ]);

    const detailSheet = XLSX.utils.json_to_sheet(
      filteredRows.map((row) => ({
        Category: row.category,
        Type: row.type,
        Date: formatDate(row.date),
        "Amount (ETB)": row.amount,
      })),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Details");

    XLSX.writeFile(workbook, `report-${period}-${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 print:hidden md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Review revenue, expenses, and profit by period.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <Printer size={18} />
            Print
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExportPDF}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <FileText size={18} />
            PDF
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024]"
          >
            <FileSpreadsheet size={18} />
            Excel
          </motion.button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 print:hidden">
          {error}
        </p>
      )}

      {loading && (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm print:hidden">
          Loading report data...
        </div>
      )}

      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            {(["daily", "weekly", "monthly", "yearly"] as Period[]).map(
              (key) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium capitalize transition ${
                    period === key
                      ? "bg-[#123c2c] text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {key}
                </button>
              ),
            )}
          </div>

          <div className="lg:ml-auto">
            {period === "daily" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#123c2c]"
              />
            )}

            {period === "weekly" && (
              <input
                type="date"
                value={selectedWeek}
                onChange={(event) => setSelectedWeek(event.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#123c2c]"
              />
            )}

            {period === "monthly" && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#123c2c]"
              />
            )}

            {period === "yearly" && (
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#123c2c]"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="hidden text-center print:block">
        <img
          src="/logo.png"
          alt="Basha Eshete Pension logo"
          className="mx-auto mb-3 h-16 w-16 object-contain"
        />

        <h2 className="text-xl font-bold">
          Basha Eshete Pension - Financial Report
        </h2>
        <p className="mt-1 text-sm text-gray-500">{periodLabel}</p>
        <p className="mt-1 text-xs text-gray-400">TIN: {TIN_NUMBER}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Revenue"
          value={`${totalRevenue.toLocaleString()} ETB`}
          icon={<TrendingUp size={20} />}
        />

        <SummaryCard
          title="Total Expenses"
          value={`${totalExpenses.toLocaleString()} ETB`}
          icon={<TrendingDown size={20} />}
        />

        <SummaryCard
          title="Net Profit"
          value={`${netProfit.toLocaleString()} ETB`}
          icon={<PiggyBank size={20} />}
        />

        <SummaryCard
          title="Profit Margin"
          value={`${profitMargin}%`}
          icon={<Banknote size={20} />}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Category
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Type
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Date
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-gray-100 last:border-0 transition hover:bg-[#f8faf8]"
                >
                  <td className="px-5 py-5">
                    <p className="font-semibold">{row.category}</p>
                  </td>

                  <td className="px-5 py-5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${typeStyles[row.type]}`}
                    >
                      {row.type}
                    </span>
                  </td>

                  <td className="px-5 py-5">
                    <p className="text-sm text-gray-500">
                      {formatDate(row.date)}
                    </p>
                  </td>

                  <td className="px-5 py-5">
                    <p className="font-semibold">
                      {row.amount.toLocaleString()} ETB
                    </p>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && filteredRows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center print:hidden">
          <BarChart3 className="mx-auto text-gray-300" size={42} />

          <h3 className="mt-4 font-semibold">No data for this period</h3>

          <p className="mt-1 text-sm text-gray-500">
            Try a different date, week, month, or year.
          </p>
        </div>
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
      className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-lg print:break-inside-avoid print:shadow-none"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>

        <div className="rounded-xl bg-[#123c2c]/10 p-2.5 text-[#123c2c] print:hidden">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold">{value}</p>
    </motion.div>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}