import { Outlet, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Menu,
  X,
  MessageCircle,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#faf5ec] text-stone-900">
      {/* Nav */}
      <header className="fixed top-0 z-50 w-full border-b border-black/5 bg-[#faf5ec]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="text-lg font-bold">
            Basha Eshete <span className="text-[#123c2c]">Pension</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link to="/" className="transition hover:text-[#123c2c]">Home</Link>
            <Link to="/about" className="transition hover:text-[#123c2c]">About</Link>
            <Link to="/contact" className="transition hover:text-[#123c2c]">Contact Us</Link>
          </nav>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col gap-4 border-t border-black/5 bg-[#faf5ec] px-5 py-4 text-sm font-medium md:hidden"
          >
            <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/about" onClick={() => setMenuOpen(false)}>About</Link>
            <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact Us</Link>
          </motion.div>
        )}
      </header>

      {/* Page content */}
      <Outlet />

      {/* Footer */}
      <footer className="border-t border-[#e8dcc6] bg-[#f3ebdc] py-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold">
              Basha Eshete <span className="text-[#123c2c]">Pension</span>
            </h3>
            <p className="mt-3 max-w-xs text-sm text-stone-500">
              A quiet, comfortable stay with clean rooms and warm hospitality.
            </p>

            <div className="mt-5 flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#fffaf0] p-2.5 text-stone-500 shadow-sm transition hover:-translate-y-0.5 hover:text-[#123c2c] hover:shadow-md"
                aria-label="Facebook"
              >
                <FaFacebook size={18} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#fffaf0] p-2.5 text-stone-500 shadow-sm transition hover:-translate-y-0.5 hover:text-[#123c2c] hover:shadow-md"
                aria-label="Instagram"
              >
                <FaInstagram size={18} />
              </a>
              <a
                href="https://wa.me/2519XXXXXXXX"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#fffaf0] p-2.5 text-stone-500 shadow-sm transition hover:-translate-y-0.5 hover:text-[#123c2c] hover:shadow-md"
                aria-label="WhatsApp"
              >
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Quick Links
            </h4>
            <div className="mt-4 flex flex-col gap-2 text-sm text-stone-600">
              <Link to="/" className="transition hover:text-[#123c2c]">Home</Link>
              <Link to="/about" className="transition hover:text-[#123c2c]">About</Link>
              <Link to="/contact" className="transition hover:text-[#123c2c]">Contact Us</Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Contact
            </h4>
            <div className="mt-4 space-y-3 text-sm text-stone-600">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-[#123c2c]" /> Arba Minch, Ethiopia
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-[#123c2c]" /> +251 9XX XXX XXX
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-[#123c2c]" /> info@bashaeshetepension.com
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-6xl border-t border-black/5 px-5 pt-6 text-center text-xs text-stone-400">
          © {new Date().getFullYear()} Basha Eshete Pension. All rights reserved.
        </div>
      </footer>
    </div>
  );
}