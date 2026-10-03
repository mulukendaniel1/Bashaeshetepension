import { motion } from "framer-motion";
import { useState } from "react";
import {
  BedDouble,
  Wifi,
  UtensilsCrossed,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Menu,
  X,
  Star,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
} as const;

const amenities = [
  { icon: <Wifi size={22} />, title: "Free Wi-Fi", desc: "Fast, reliable internet in every room." },
  { icon: <UtensilsCrossed size={22} />, title: "Home-style meals", desc: "Breakfast and dinner on request." },
  { icon: <ShieldCheck size={22} />, title: "24/7 security", desc: "Staffed gate and on-site caretaker." },
  { icon: <BedDouble size={22} />, title: "Clean, quiet rooms", desc: "Daily housekeeping included." },
];

const rooms = [
  { name: "Standard Room", price: "800 ETB / night", img: "/images/room-standard.jpg" },
  { name: "Deluxe Room", price: "1,200 ETB / night", img: "/images/room-deluxe.jpg" },
  { name: "Family Suite", price: "1,800 ETB / night", img: "/images/room-suite.jpg" },
];

export default function PublicSite() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="fixed top-0 z-50 w-full border-b border-black/5 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="#top" className="text-lg font-bold">
            Basha Eshete <span className="text-[#123c2c]">Pension</span>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a href="#rooms" className="transition hover:text-[#123c2c]">Rooms</a>
            <a href="#amenities" className="transition hover:text-[#123c2c]">Amenities</a>
            <a href="#contact" className="transition hover:text-[#123c2c]">Contact</a>
            <a
              href="/internal"
              className="rounded-lg bg-[#123c2c] px-4 py-2 text-white transition hover:bg-[#0d3024]"
            >
              Staff Login
            </a>
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
            className="flex flex-col gap-4 border-t border-black/5 bg-white px-5 py-4 text-sm font-medium md:hidden"
          >
            <a href="#rooms" onClick={() => setMenuOpen(false)}>Rooms</a>
            <a href="#amenities" onClick={() => setMenuOpen(false)}>Amenities</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
            <a href="/internal" className="font-semibold text-[#123c2c]">Staff Login</a>
          </motion.div>
        )}
      </header>

      {/* Hero */}
      <section id="top" className="relative flex min-h-[90vh] items-center overflow-hidden pt-20">
        <div className="absolute inset-0 -z-10">
          <img
            src="/images/hero.jpg"
            alt="Basha Eshete Pension"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/10" />
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mx-auto max-w-6xl px-5 text-white"
        >
          <motion.p variants={fadeUp} className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-300">
            Welcome to
          </motion.p>

          <motion.h1 variants={fadeUp} className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            Basha Eshete Pension
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-5 max-w-xl text-lg text-white/85">
            A quiet, comfortable stay with clean rooms, warm hospitality, and
            everything you need close by.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
            <a
              href="#contact"
              className="rounded-xl bg-[#123c2c] px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-[#0d3024] hover:shadow-xl"
            >
              Book a Room
            </a>
            <a
              href="#rooms"
              className="rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              View Rooms
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Amenities */}
      <section id="amenities" className="mx-auto max-w-6xl px-5 py-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="mb-14 text-center"
        >
          <h2 className="text-3xl font-bold">Why stay with us</h2>
          <p className="mt-3 text-gray-500">Everything you need for a comfortable stay.</p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {amenities.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-xl bg-[#123c2c]/10 p-3 text-[#123c2c]">
                {item.icon}
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Rooms */}
      <section id="rooms" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold">Our rooms</h2>
            <p className="mt-3 text-gray-500">Pick the room that fits your stay.</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="grid gap-8 md:grid-cols-3"
          >
            {rooms.map((room) => (
              <motion.div
                key={room.name}
                variants={fadeUp}
                whileHover={{ y: -8 }}
                className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-2xl"
              >
                <div className="h-56 overflow-hidden">
                  <img
                    src={room.img}
                    alt={room.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{room.name}</h3>
                    <span className="flex items-center gap-1 text-xs text-amber-500">
                      <Star size={14} fill="currentColor" /> 4.8
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{room.price}</p>
                  <a
                    href="#contact"
                    className="mt-4 inline-block text-sm font-semibold text-[#123c2c] transition group-hover:underline"
                  >
                    Enquire →
                  </a>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-6xl px-5 py-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="grid gap-10 rounded-3xl bg-[#123c2c] p-10 text-white md:grid-cols-2 md:p-16"
        >
          <motion.div variants={fadeUp}>
            <h2 className="text-3xl font-bold">Get in touch</h2>
            <p className="mt-3 text-white/80">
              Reach out to book a room or ask any question. We usually reply
              within the hour.
            </p>

            <div className="mt-8 space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <MapPin size={18} /> Arba Minch, Ethiopia
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} /> +251 9XX XXX XXX
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} /> info@bashaeshetepension.com
              </div>
            </div>
          </motion.div>

          <motion.form variants={fadeUp} className="space-y-4">
            <input
              placeholder="Your name"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60 outline-none transition focus:border-white focus:bg-white/20"
            />
            <input
              placeholder="Phone or email"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60 outline-none transition focus:border-white focus:bg-white/20"
            />
            <textarea
              placeholder="Message"
              rows={4}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60 outline-none transition focus:border-white focus:bg-white/20"
            />
            <button
              type="button"
              className="w-full rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#123c2c] transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Send Message
            </button>
          </motion.form>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Basha Eshete Pension. All rights reserved.
      </footer>
    </div>
  );
}