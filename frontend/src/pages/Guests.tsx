import { motion } from "framer-motion";
import {
  BadgeCheck,
  Calendar,
  ChevronLeft,
  CreditCard,
  Globe2,
  History,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  User,
  UserRound,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";

type StayStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

type StayRecord = {
  reference: string;
  room: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  status: StayStatus;
};

type Guest = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  gender: string | null;
  nationality: string | null;
  idType: string | null;
  idNumber: string | null;
  address: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  notes: string | null;
  totalVisits: number;
  totalSpending: number;
  currentBooking: string | null;
  history: StayRecord[];
};

const stayStatusStyles: Record<StayStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  CHECKED_IN: "bg-blue-50 text-blue-700 border-blue-200",
  CHECKED_OUT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  NO_SHOW: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function Guests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("All");
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadGuests();
  }, []);

  async function loadGuests() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get<{ success: boolean; guests: Guest[] }>(
        "/guests"
      );
      setGuests(res.guests);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load guests.");
    } finally {
      setLoading(false);
    }
  }

  const nationalities = useMemo(() => {
    const unique = new Set(
      guests.map((guest) => guest.nationality).filter(Boolean) as string[]
    );
    return ["All", ...Array.from(unique)];
  }, [guests]);

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const query = search.toLowerCase();

      const matchesSearch =
        guest.fullName.toLowerCase().includes(query) ||
        guest.phone.includes(query) ||
        (guest.email || "").toLowerCase().includes(query) ||
        (guest.idNumber || "").toLowerCase().includes(query);

      const matchesNationality =
        nationalityFilter === "All" || guest.nationality === nationalityFilter;

      return matchesSearch && matchesNationality;
    });
  }, [guests, search, nationalityFilter]);

  const selectedGuest =
    guests.find((guest) => guest.id === selectedGuestId) || null;

  const totalGuestSpending = guests.reduce(
    (sum, guest) => sum + guest.totalSpending,
    0
  );

  const activeGuests = guests.filter((guest) => guest.currentBooking).length;

  const addGuest = async (guest: {
    fullName: string;
    phone: string;
    email?: string;
    gender?: string;
    nationality?: string;
    idNumber?: string;
    address?: string;
    emergencyName?: string;
    emergencyPhone?: string;
  }) => {
    try {
      const res = await api.post<{ success: boolean; guest: Guest }>(
        "/guests",
        guest
      );
      setGuests((current) => [res.guest, ...current]);
      setShowModal(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not save guest.");
    }
  };

  if (selectedGuest) {
    return (
      <GuestDetail
        guest={selectedGuest}
        onBack={() => setSelectedGuestId(null)}
      />
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Users className="text-[#123c2c]" size={24} />
            <h1 className="text-2xl font-bold tracking-tight">Guests</h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Guest profiles, contact details, and stay history.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#123c2c] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#123c2c]/15 transition hover:bg-[#0d3024]"
        >
          <Plus size={18} />
          New Guest
        </motion.button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Guests"
          value={guests.length.toString()}
          icon={<Users size={20} />}
        />

        <SummaryCard
          title="Currently Staying"
          value={activeGuests.toString()}
          icon={<BadgeCheck size={20} />}
        />

        <SummaryCard
          title="Total Spending"
          value={`${totalGuestSpending.toLocaleString()} ETB`}
          icon={<Wallet size={20} />}
        />

        <SummaryCard
          title="Nationalities"
          value={(nationalities.length - 1).toString()}
          icon={<Globe2 size={20} />}
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
              placeholder="Search name, phone, email, or ID number..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#123c2c] focus:bg-white focus:ring-4 focus:ring-[#123c2c]/5"
            />
          </div>

          <select
            value={nationalityFilter}
            onChange={(event) => setNationalityFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
          >
            {nationalities.map((nationality) => (
              <option key={nationality}>{nationality}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading guests...
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Guest
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Contact
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Nationality
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Visits
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Total Spending
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Current Booking
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredGuests.map((guest, index) => (
                    <motion.tr
                      key={guest.id}
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
                            <p className="font-medium">{guest.fullName}</p>

                            <p className="mt-1 text-xs text-gray-500">
                              {guest.idNumber || "No ID on file"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm font-medium">{guest.phone}</p>

                        <p className="mt-1 text-xs text-gray-500">
                          {guest.email || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm">{guest.nationality || "-"}</p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm font-medium">
                          {guest.totalVisits}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-semibold">
                          {guest.totalSpending.toLocaleString()} ETB
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        {guest.currentBooking ? (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700">
                            {guest.currentBooking}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No active stay
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex justify-end">
                          <button
                            onClick={() => setSelectedGuestId(guest.id)}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-[#123c2c] hover:bg-[#123c2c] hover:text-white"
                          >
                            View Profile
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
            {filteredGuests.map((guest, index) => (
              <motion.div
                key={guest.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedGuestId(guest.id)}
                className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{guest.fullName}</p>
                    <p className="mt-1 text-sm text-gray-500">{guest.phone}</p>
                  </div>

                  {guest.currentBooking ? (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      Staying
                    </span>
                  ) : (
                    <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500">
                      No stay
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <InfoItem label="Nationality" value={guest.nationality || "-"} />
                  <InfoItem label="Visits" value={guest.totalVisits.toString()} />
                  <InfoItem
                    label="Spending"
                    value={`${guest.totalSpending.toLocaleString()} ETB`}
                  />
                  <InfoItem label="ID Number" value={guest.idNumber || "-"} />
                </div>
              </motion.div>
            ))}
          </div>

          {filteredGuests.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <Users className="mx-auto text-gray-300" size={42} />
              <h3 className="mt-4 font-semibold">No guests found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing your search or filter.
              </p>
            </div>
          )}
        </>
      )}

      {showModal && (
        <GuestModal
          onClose={() => setShowModal(false)}
          onSave={addGuest}
        />
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

        <div className="rounded-xl bg-[#123c2c]/10 p-2.5 text-[#123c2c]">
          {icon}
        </div>
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

function GuestDetail({
  guest,
  onBack,
}: {
  guest: Guest;
  onBack: () => void;
}) {
  return (
    <div className="space-y-7">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#123c2c]"
      >
        <ChevronLeft size={18} />
        Back to Guests
      </button>

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#123c2c]/10 text-[#123c2c]">
              <UserRound size={28} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {guest.fullName}
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {guest.gender || "-"} · {guest.nationality || "-"}
              </p>
            </div>
          </div>

          {guest.currentBooking ? (
            <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
              Currently staying · {guest.currentBooking}
            </span>
          ) : (
            <span className="w-fit rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-500">
              No active stay
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Total Visits"
          value={guest.totalVisits.toString()}
          icon={<History size={20} />}
        />

        <SummaryCard
          title="Total Spending"
          value={`${guest.totalSpending.toLocaleString()} ETB`}
          icon={<Wallet size={20} />}
        />

        <SummaryCard
          title="Current Booking"
          value={guest.currentBooking ? "Active" : "None"}
          icon={<Calendar size={20} />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="mb-5 font-bold">Contact Details</h3>

          <div className="space-y-4">
            <DetailRow icon={<Phone size={16} />} label="Phone" value={guest.phone} />
            <DetailRow icon={<Mail size={16} />} label="Email" value={guest.email || "-"} />
            <DetailRow icon={<MapPin size={16} />} label="Address" value={guest.address || "-"} />
            <DetailRow icon={<Globe2 size={16} />} label="Nationality" value={guest.nationality || "-"} />
            <DetailRow icon={<User size={16} />} label="Gender" value={guest.gender || "-"} />
            <DetailRow icon={<CreditCard size={16} />} label="ID / Passport" value={guest.idNumber || "-"} />
          </div>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="mb-5 font-bold">Emergency Contact</h3>

          <div className="space-y-4">
            <DetailRow
              icon={<ShieldAlert size={16} />}
              label="Name"
              value={guest.emergencyName || "-"}
            />

            <DetailRow
              icon={<Phone size={16} />}
              label="Phone"
              value={guest.emergencyPhone || "-"}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm xl:col-span-1">
          <h3 className="mb-5 font-bold">Summary</h3>

          <div className="space-y-4">
            <DetailRow
              icon={<History size={16} />}
              label="Total Visits"
              value={guest.totalVisits.toString()}
            />

            <DetailRow
              icon={<Wallet size={16} />}
              label="Total Spending"
              value={`${guest.totalSpending.toLocaleString()} ETB`}
            />

            <DetailRow
              icon={<Calendar size={16} />}
              label="Current Booking"
              value={guest.currentBooking || "None"}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h3 className="mb-5 font-bold">Guest History</h3>

        {guest.history.length === 0 ? (
          <p className="text-sm text-gray-500">
            This guest has no recorded stays yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Booking
                  </th>

                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Room
                  </th>

                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Stay
                  </th>

                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Amount
                  </th>

                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {guest.history.map((stay) => (
                  <tr
                    key={stay.reference}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-3 py-4 text-sm font-medium">
                      {stay.reference}
                    </td>

                    <td className="px-3 py-4 text-sm">
                      Room {stay.room} · {stay.roomType}
                    </td>

                    <td className="px-3 py-4 text-sm text-gray-500">
                      {formatDate(stay.checkIn)} to {formatDate(stay.checkOut)}
                    </td>

                    <td className="px-3 py-4 text-sm font-semibold">
                      {stay.amount.toLocaleString()} ETB
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${stayStatusStyles[stay.status]}`}
                      >
                        {stay.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-400">{icon}</div>

      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function GuestModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (guest: {
    fullName: string;
    phone: string;
    email?: string;
    gender?: string;
    nationality?: string;
    idNumber?: string;
    address?: string;
    emergencyName?: string;
    emergencyPhone?: string;
  }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("Male");
  const [nationality, setNationality] = useState("Ethiopian");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName || !phone) {
      return;
    }

    setSaving(true);

    try {
      await onSave({
        fullName,
        phone,
        email: email || undefined,
        gender: gender || undefined,
        nationality: nationality || undefined,
        idNumber: idNumber || undefined,
        address: address || undefined,
        emergencyName: emergencyName || undefined,
        emergencyPhone: emergencyPhone || undefined,
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
        className="my-5 w-full max-w-2xl rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-xl font-bold">New Guest</h2>

            <p className="mt-1 text-sm text-gray-500">
              Add a new guest profile.
            </p>
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
            <InputField
              label="Full name"
              placeholder="Full name"
              value={fullName}
              onChange={setFullName}
            />

            <InputField
              label="Phone number"
              placeholder="09XXXXXXXX"
              value={phone}
              onChange={setPhone}
            />

            <InputField
              label="Email"
              placeholder="guest@email.com"
              value={email}
              onChange={setEmail}
            />

            <div>
              <label className="mb-2 block text-sm font-medium">
                Gender
              </label>

              <select
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#123c2c]"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <InputField
              label="Nationality"
              placeholder="Nationality"
              value={nationality}
              onChange={setNationality}
            />

            <InputField
              label="ID or passport number"
              placeholder="ID-0000000"
              value={idNumber}
              onChange={setIdNumber}
            />

            <div className="sm:col-span-2">
              <InputField
                label="Address"
                placeholder="Address"
                value={address}
                onChange={setAddress}
              />
            </div>

            <InputField
              label="Emergency contact name"
              placeholder="Full name"
              value={emergencyName}
              onChange={setEmergencyName}
            />

            <InputField
              label="Emergency contact phone"
              placeholder="09XXXXXXXX"
              value={emergencyPhone}
              onChange={setEmergencyPhone}
            />
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
              {saving ? "Saving..." : "Save Guest"}
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