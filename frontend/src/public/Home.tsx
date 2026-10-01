import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BedDouble, Wifi, UtensilsCrossed, ShieldCheck, Star } from "lucide-react";

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
  { name: "Standard Room", price: "800 ETB / night", img: "/images/room%201.jpg" },
  { name: "Deluxe Room", price: "1,200 ETB / night", img: "/images/room%202.jpg" },
  { name: "Family Suite", price: "1,800 ETB / night", img: "/images/room%203.jpg" },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[90vh] items-center overflow-hidden pt-20">
        {/* Background image (bottom layer) */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/background.jpg"
            alt="Basha Eshete Pension building"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Text (top layer) */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="relative z-10 mx-auto w-full max-w-6xl px-10 text-white"
        >
          <motion.p
            variants={fadeUp}
            className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-300"
          >
            Welcome to
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="max-w-2xl text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl"
          >
            Basha Eshete Pension
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-5 max-w-xl text-lg text-white/90">
            A quiet, comfortable stay with clean rooms, warm hospitality, and
            everything you need close by.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/reserve"
              className="rounded-xl border border-emerald-300/40 bg-emerald-900/40 px-6 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-emerald-800/60 hover:shadow-xl"
            >
              Book a Room
            </Link>
            <Link
              to="/about"
              className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-xl"
            >
              Learn More
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Amenities */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="mb-14 text-center"
        >
          <h2 className="text-3xl font-bold">Why stay with us</h2>
          <p className="mt-3 text-stone-500">Everything you need for a comfortable stay.</p>
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
              className="rounded-2xl border border-[#e8dcc6] bg-[#fffaf0] p-6 shadow-sm transition hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-xl bg-[#123c2c]/10 p-3 text-[#123c2c]">
                {item.icon}
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-stone-500">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Rooms */}
      <section className="bg-[#f3ebdc] py-24">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold">Our Rooms</h2>
            <p className="mt-3 text-stone-500">Pick the room that fits your stay.</p>
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
                className="group overflow-hidden rounded-2xl bg-[#fffaf0] shadow-sm transition hover:shadow-2xl"
              >
                <div className="h-56 overflow-hidden bg-[#e8dcc6]">
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
                  <p className="mt-1 text-sm text-stone-500">{room.price}</p>
                  <Link
                    to={`/reserve?room=${encodeURIComponent(room.name)}`}
                    className="mt-4 inline-block text-sm font-semibold text-[#123c2c] transition group-hover:underline"
                  >
                    Enquire →
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
}