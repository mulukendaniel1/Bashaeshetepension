import { motion } from "framer-motion";
import {
  BadgeCheck,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";

type Role = "OWNER" | "MANAGER" | "RECEPTIONIST" | "ACCOUNTANT" | "STAFF";
type Department = "FRONT_DESK" | "HOUSEKEEPING" | "KITCHEN" | "MAINTENANCE" | "MANAGEMENT";
type Status = "ACTIVE" | "INACTIVE";

type StaffMember = {
  id: string;
  fullName: string;
  username: string;
  role: Role;
  department: Department | null;
  status: Status;
  phone: string | null;
  email: string | null;
  startDate: string | null;
};

const roleLabels: Record<Role, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  RECEPTIONIST: "Receptionist",
  ACCOUNTANT: "Accountant",
  STAFF: "Staff",
};

const departmentLabels: Record<Department, string> = {
  FRONT_DESK: "Front Desk",
  HOUSEKEEPING: "Housekeeping",
  KITCHEN: "Kitchen",
  MAINTENANCE: "Maintenance",
  MANAGEMENT: "Management",
};

const departmentStyles: Record<Department, string> = {
  FRONT_DESK: "bg-blue-50 text-blue-700 border-blue-200",
  HOUSEKEEPING: "bg-purple-50 text-purple-700 border-purple-200",
  KITCHEN: "bg-amber-50 text-amber-700 border-amber-200",
  MAINTENANCE: "bg-gray-50 text-gray-700 border-gray-200",
  MANAGEMENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const statusStyles: Record<Status, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-red-50 text-red-700 border-red-200",
};

export default function Staff() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get<{ success: boolean; staff: StaffMember[] }>("/staff");
      setStaff(res.staff);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load staff.");
    } finally {
      setLoading(false);
    }
  }

  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      const query = search.toLowerCase();

      const matchesSearch =
        member.fullName.toLowerCase().includes(query) ||
        member.username.toLowerCase().includes(query) ||
        (member.phone || "").includes(query);

      const matchesDepartment =
        departmentFilter === "All" || member.department === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [staff, search, departmentFilter]);

  const activeCount = staff.filter((member) => member.status === "ACTIVE").length;
  const inactiveCount = staff.filter((member) => member.status === "INACTIVE").length;

  // Only the owner sees Delete. It never shows on an owner row or on your own row.
  const canDelete = (member: StaffMember) =>
    user?.role === "OWNER" && member.role !== "OWNER" && member.id !== user?.id;

  const addStaff = async (member: {
    fullName: string;
    username: string;
    password: string;
    role: Role;
    department?: Department;
    phone?: string;
    email?: string;
  }) => {
    try {
      const res = await api.post<{ success: boolean; member: StaffMember }>(
        "/staff",
        member
      );
      setStaff((current) => [...current, res.member]);
      setShowModal(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not save staff member.");
    }
  };

  const toggleStatus = async (member: StaffMember) => {
    const nextStatus: Status = member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      const res = await api.patch<{ success: boolean; member: StaffMember }>(
        `/staff/${member.id}`,
        { status: nextStatus }
      );
      setStaff((current) =>
        current.map((item) => (item.id === member.id ? res.member : item))
      );
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not update status.");
    }
  };

  const deleteMember = async (member: StaffMember) => {
    const confirmed = window.confirm(
      `Delete ${member.fullName} (@${member.username})? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/staff/${member.id}`);
      setStaff((current) => current.filter((item) => item.id !== member.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not delete staff member.");
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Users className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Manage employees, roles, and login accounts.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024]"
        >
          <Plus size={18} />
          Add Staff
        </motion.button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="Total Staff" value={staff.length.toString()} icon={<Users size={20} />} />
        <SummaryCard title="Active" value={activeCount.toString()} icon={<BadgeCheck size={20} />} />
        <SummaryCard title="Inactive" value={inactiveCount.toString()} icon={<Phone size={20} />} />
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, username, or phone..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#123c2c] focus:bg-white focus:ring-4 focus:ring-[#123c2c]/5"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
          >
            <option value="All">All</option>
            {(Object.keys(departmentLabels) as Department[]).map((key) => (
              <option key={key} value={key}>
                {departmentLabels[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading staff...
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-237.5">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Employee</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Contact</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Department</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Joined</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStaff.map((member, index) => (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.04 }}
                      className="border-b border-gray-100 last:border-0 transition hover:bg-[#f8faf8]"
                    >
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#123c2c]/10 text-[#123c2c]">
                            <UserRound size={17} />
                          </div>

                          <div>
                            <p className="font-medium">{member.fullName}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {roleLabels[member.role]} · @{member.username}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm">{member.phone || "-"}</p>
                        <p className="mt-1 text-xs text-gray-500">{member.email || "-"}</p>
                      </td>

                      <td className="px-5 py-5">
                        {member.department ? (
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${departmentStyles[member.department]}`}
                          >
                            {departmentLabels[member.department]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm text-gray-500">
                          {member.startDate ? formatDate(member.startDate) : "-"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`rounded-full border px-2.5 py-1.5 text-xs font-medium ${statusStyles[member.status]}`}
                        >
                          {member.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toggleStatus(member)}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                          >
                            {member.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </button>

                          {canDelete(member) && (
                            <button
                              onClick={() => deleteMember(member)}
                              className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:hidden">
            {filteredStaff.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{member.fullName}</p>
                    <p className="mt-1 text-sm text-gray-500">{roleLabels[member.role]}</p>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[member.status]}`}
                  >
                    {member.status === "ACTIVE" ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <InfoItem icon={<Phone size={14} />} label="Phone" value={member.phone || "-"} />
                  <InfoItem icon={<Mail size={14} />} label="Email" value={member.email || "-"} />
                  <InfoItem
                    label="Department"
                    value={member.department ? departmentLabels[member.department] : "None"}
                  />
                  <InfoItem
                    label="Joined"
                    value={member.startDate ? formatDate(member.startDate) : "-"}
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => toggleStatus(member)}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium"
                  >
                    {member.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </button>

                  {canDelete(member) && (
                    <button
                      onClick={() => deleteMember(member)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {filteredStaff.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <Users className="mx-auto text-gray-300" size={42} />
              <h3 className="mt-4 font-semibold">No staff found</h3>
              <p className="mt-1 text-sm text-gray-500">Try changing your search or filter.</p>
            </div>
          )}
        </>
      )}

      {showModal && <StaffModal onClose={() => setShowModal(false)} onSave={addStaff} />}
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

function InfoItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-gray-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function StaffModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (member: {
    fullName: string;
    username: string;
    password: string;
    role: Role;
    department?: Department;
    phone?: string;
    email?: string;
  }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STAFF");
  const [department, setDepartment] = useState<Department | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName || !username || password.length < 8) {
      alert("Full name, username, and a password of at least 8 characters are required.");
      return;
    }

    setSaving(true);

    try {
      await onSave({
        fullName,
        username,
        password,
        role,
        department: department || undefined,
        phone: phone || undefined,
        email: email || undefined,
      });
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
            <h2 className="text-xl font-bold">Add Staff</h2>
            <p className="mt-1 text-sm text-gray-500">Create an employee and their login account.</p>
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
            <InputField label="Full name" placeholder="Full name" value={fullName} onChange={setFullName} />
            <InputField label="Username" placeholder="Login username" value={username} onChange={setUsername} />

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">Password</label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Role</label>

              <select
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
              >
                {(Object.keys(roleLabels) as Role[]).map((key) => (
                  <option key={key} value={key}>
                    {roleLabels[key]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Department</label>

              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value as Department | "")}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
              >
                <option value="">None</option>
                {(Object.keys(departmentLabels) as Department[]).map((key) => (
                  <option key={key} value={key}>
                    {departmentLabels[key]}
                  </option>
                ))}
              </select>
            </div>

            <InputField label="Phone number" placeholder="09XXXXXXXX" value={phone} onChange={setPhone} />
            <InputField label="Email" placeholder="staff@email.com" value={email} onChange={setEmail} />
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
              {saving ? "Saving..." : "Save Staff"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c] focus:bg-white"
      />
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