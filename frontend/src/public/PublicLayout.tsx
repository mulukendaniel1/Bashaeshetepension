import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useSiteInfo } from "./data";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/book", label: "Book" },
  { to: "/contact", label: "Contact" },
  { to: "/rooms", label: "Rooms" },
];

const GREEN = "#123c2c";

export default function PublicLayout() {
  const info = useSiteInfo();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isHome = location.pathname === "/";

  // Close the mobile menu on every page change. Jump to a section or to the top.
  useEffect(() => {
    setOpen(false);

    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  const words = (info.businessName || "").split(" ");
  const lastWord = words.length > 1 ? words.pop() : "";
  const firstPart = words.join(" ");

  const linkStyle = (to: string) => ({
    color: location.pathname === to ? GREEN : "#334155",
    fontWeight: location.pathname === to ? 700 : 500,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <div className="fixed inset-x-0 top-4 z-50 px-4">
        <div
          className="mx-auto max-w-6xl rounded-2xl border border-white/60 shadow-lg backdrop-blur-md"
          style={{ backgroundColor: "rgba(255,255,255,0.85)" }}
        >
          <div className="flex h-16 items-center justify-between px-5">
            <Link to="/" className="font-serif text-xl font-bold" style={{ color: "#10241b" }}>
              {firstPart}{" "}
              <span style={{ color: GREEN }}>{lastWord}</span>
            </Link>

            <div className="hidden items-center gap-8 md:flex">
              {links.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-sm transition hover:opacity-70"
                  style={linkStyle(item.to)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="md:hidden">
              <button
                onClick={() => setOpen(!open)}
                aria-label="Toggle menu"
                style={{ color: "#10241b" }}
              >
                {open ? <X size={26} /> : <Menu size={26} />}
              </button>
            </div>
          </div>

          {open && (
            <div className="flex flex-col gap-4 border-t border-black/10 px-5 py-5 md:hidden">
              {links.map((item) => (
                <Link key={item.to} to={item.to} className="text-sm" style={linkStyle(item.to)}>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className={`flex-1 ${isHome ? "" : "pt-24"}`}>
        <Outlet />
      </main>

      <footer className="py-10" style={{ backgroundColor: "#10241b", color: "rgba(255,255,255,0.7)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {info.businessName}
          </p>

          <div className="flex gap-6">
            {links.map((item) => (
              <Link key={item.to} to={item.to} style={{ color: "inherit" }}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}