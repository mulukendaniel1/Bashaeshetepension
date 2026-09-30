import { motion } from "framer-motion";
import {
BedDouble,
Bell,
CalendarCheck,
ClipboardList,
CreditCard,
FileBarChart,
Home,
LogIn,
LogOut,
Menu,
Settings,
ShoppingCart,
UserRound,
Users,
WalletCards,
Wrench,
X,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";

const navigation = [
{ name: "Dashboard", path: "/", icon: Home },
{ name: "Rooms", path: "/rooms", icon: BedDouble },
{ name: "Bookings", path: "/bookings", icon: CalendarCheck },
{ name: "Guests", path: "/guests", icon: Users },
{ name: "Check-in", path: "/check-in", icon: LogIn },
{ name: "Check-out", path: "/check-out", icon: LogOut },
{ name: "Payments", path: "/payments", icon: CreditCard },
{ name: "Expenses", path: "/expenses", icon: WalletCards },
{ name: "Inventory", path: "/inventory", icon: ShoppingCart },
{ name: "Housekeeping", path: "/housekeeping", icon: ClipboardList },
{ name: "Maintenance", path: "/maintenance", icon: Wrench },
{ name: "Staff", path: "/staff", icon: UserRound },
{ name: "Reports", path: "/reports", icon: FileBarChart },
];

export default function MainLayout() {
const [mobileOpen, setMobileOpen] = useState(false);

return (
<div className="min-h-screen bg-[#f6f8f6] text-[#17211b]">
<aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-black/5 bg-white lg:block">
<Sidebar />
</aside>

  {mobileOpen && (
    <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
      onClick={() => setMobileOpen(false)}
    />
  )}

  <motion.aside
    initial={{ x: -280 }}
    animate={{ x: mobileOpen ? 0 : -280 }}
    className="fixed left-0 top-0 z-50 h-screen w-72 bg-white shadow-2xl lg:hidden"
  >
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-black/5 px-5 py-5">
        <Brand />

        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-[#123c2c]"
        >
          <X size={20} />
        </button>
      </div>

      <Navigation closeMobile={() => setMobileOpen(false)} />
    </div>
  </motion.aside>

  <main className="lg:ml-64">
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-black/5 bg-white/90 px-5 backdrop-blur-xl lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-xl border border-black/5 bg-white p-2.5 text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:text-[#123c2c] lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div>
          <p className="text-xs text-gray-500">
            Basha Eshete Pension
          </p>

          <h2 className="text-lg font-bold sm:text-xl">
            Management System
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-xl border border-black/5 bg-white p-2.5 text-gray-500 shadow-sm transition hover:-translate-y-0.5 hover:text-[#123c2c]">
          <Bell size={19} />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-[#d8a84e] font-bold text-white shadow-sm sm:flex">
          BE
        </div>
      </div>
    </header>

    <div className="p-5 lg:p-8">
      <Outlet />
    </div>
  </main>
</div>

);
}

function Sidebar() {
return (
<div className="flex h-full flex-col">
<div className="border-b border-black/5 px-5 py-5">
<Brand />
</div>

  <Navigation />
</div>

);
}

function Brand() {
return (
<div className="flex items-center gap-3">
<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123c2c] text-white shadow-lg shadow-[#123c2c]/20">
<BedDouble size={23} />
</div>

  <div>
    <h1 className="font-bold tracking-tight">Basha Eshete</h1>
    <p className="text-xs text-gray-500">Pension Management</p>
  </div>
</div>

);
}

function Navigation({
closeMobile,
}: {
closeMobile?: () => void;
}) {
return (
<nav className="flex-1 space-y-1 overflow-y-auto p-4">
{navigation.map((item) => {
const Icon = item.icon;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === "/"}
        onClick={closeMobile}
        className={({ isActive }) =>
          `group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
            isActive
              ? "bg-[#123c2c] text-white shadow-lg shadow-[#123c2c]/15"
              : "text-gray-600 hover:bg-[#f1f5f2] hover:text-[#123c2c]"
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.div
                layoutId="active-navigation"
                className="absolute left-0 h-7 w-1 rounded-r-full bg-[#d8a84e]"
              />
            )}

            <Icon
              size={18}
              className="transition-transform duration-200 group-hover:scale-110"
            />

            <span>{item.name}</span>
          </>
        )}
      </NavLink>
    );
  })}

  <div className="my-4 border-t border-black/5" />

  <NavLink
    to="/settings"
    onClick={closeMobile}
    className={({ isActive }) =>
      `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
        isActive
          ? "bg-[#123c2c] text-white shadow-lg"
          : "text-gray-600 hover:bg-[#f1f5f2] hover:text-[#123c2c]"
      }`
    }
  >
    <Settings
      size={18}
      className="transition-transform duration-200 group-hover:rotate-45"
    />

    Settings
  </NavLink>
</nav>

);
}