import { motion } from "framer-motion";
import {
  BedDouble,
  CalendarCheck,
  CircleDollarSign,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

type DashboardSummary = {
  rooms: number;
  occupiedRooms: number;
  guests: number;
  activeBookings: number;
  totalRevenue: number;
};

type Room = {
  id: string;
  roomNumber: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING" | "MAINTENANCE";
  price: number | null;
  roomType: { name: string };
};

const statusStyles: Record<Room["status"], string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OCCUPIED: "bg-blue-50 text-blue-700 border-blue-200",
  CLEANING: "bg-amber-50 text-amber-700 border-amber-200",
  RESERVED: "bg-purple-50 text-purple-700 border-purple-200",
  MAINTENANCE: "bg-gray-50 text-gray-700 border-gray-200",
};

const statusLabels: Record<Room["status"], string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  RESERVED: "Reserved",
  MAINTENANCE: "Maintenance",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [summaryRes, roomsRes] = await Promise.all([
          api.get<{ success: boolean; summary: DashboardSummary }>(
            "/dashboard/summary"
          ),
          api.get<{ success: boolean; rooms: Room[] }>("/rooms"),
        ]);

        if (!cancelled) {
          setSummary(summaryRes.summary);
          setRooms(roomsRes.rooms.slice(0, 6));
        }
      } catch (err) {
        if (!cancelled) {
          setError("Could not load dashboard data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const occupancyRate = summary && summary.rooms > 0
    ? Math.round((summary.occupiedRooms / summary.rooms) * 100)
    : 0;

  const stats = summary
    ? [
        {
          title: "Total Rooms",
          value: summary.rooms.toString(),
          detail: `${summary.occupiedRooms} occupied`,
          icon: BedDouble,
        },
        {
          title: "Occupied Rooms",
          value: summary.occupiedRooms.toString(),
          detail: `${occupancyRate}% occupancy`,
          icon: Users,
        },
        {
          title: "Total Revenue",
          value: `${summary.totalRevenue.toLocaleString()} ETB`,
          detail: "All-time collected",
          icon: CircleDollarSign,
        },
        {
          title: "Active Bookings",
          value: summary.activeBookings.toString(),
          detail: `${summary.guests} total guests`,
          icon: CalendarCheck,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Good morning, {user?.fullName?.split(" ")[0] || "Admin"}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Here is what is happening at your pension today.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading dashboard...
        </div>
      ) : (
        <>
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;

              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ y: -5 }}
                  className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-shadow hover:shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.title}</p>

                      <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                    </div>

                    <div className="rounded-xl bg-[#123c2c]/10 p-3 text-[#123c2c] transition duration-300 group-hover:scale-110 group-hover:bg-[#123c2c] group-hover:text-white">
                      <Icon size={21} />
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-gray-500">{stat.detail}</p>
                </motion.div>
              );
            })}
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-bold">Room Status</h3>

                <p className="mt-1 text-sm text-gray-500">
                  Current room availability
                </p>
              </div>

              <a
                href="/rooms"
                className="rounded-xl bg-[#123c2c] px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                View All
              </a>
            </div>

            {rooms.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No rooms added yet.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room, index) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    className="group rounded-2xl border border-gray-100 p-4 transition hover:border-[#123c2c]/20 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold">
                          Room {room.roomNumber}
                        </p>

                        <p className="text-xs text-gray-500">
                          {room.roomType.name}
                        </p>
                      </div>

                      <BedDouble
                        size={22}
                        className="text-gray-300 transition group-hover:scale-110 group-hover:text-[#123c2c]"
                      />
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {room.price ? `${room.price.toLocaleString()} ETB` : "-"}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[room.status]}`}
                      >
                        {statusLabels[room.status]}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}