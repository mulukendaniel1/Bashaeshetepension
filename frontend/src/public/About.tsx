import { motion } from "framer-motion";
import { ShieldCheck, Heart, Users } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
} as const;

const values = [
  { icon: <Heart size={22} />, title: "Genuine hospitality", desc: "Every guest is treated like family." },
  { icon: <ShieldCheck size={22} />, title: "Safety first", desc: "Staffed gate, secure rooms, round-the-clock care." },
  { icon: <Users size={22} />, title: "Local roots", desc: "Family-run and proud of Arba Minch." },
];

export default function About() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#123c2c] pt-32 pb-20 text-white">
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mx-auto max-w-4xl px-5 text-center"
        >
          <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
            About Us
          </motion.p>
          <motion.h1 variants={fadeUp} className="mt-3 text-4xl font-bold sm:text-5xl">
            Basha Eshete Pension
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-white/85">
            A family-run pension in the heart of Arba Minch, built on comfort,
            trust, and warm welcome.
          </motion.p>
        </motion.div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="grid items-center gap-12 md:grid-cols-2"
        >
          <div>
            <h2 className="text-2xl font-bold">Our story</h2>
            <p className="mt-4 text-gray-600">
              Basha Eshete Pension started as a small family home opened to
              travelers passing through Arba Minch. Over the years, it has
              grown into a trusted place to stay, known for clean rooms,
              honest prices, and a team that treats every guest like a
              neighbor.
            </p>
            <p className="mt-4 text-gray-600">
              Today we continue that same tradition. Whether you're here for
              a night or a month, our goal is simple: make you feel at home.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl bg-slate-200 shadow-sm">
            {/* Upload a photo of the building or staff here */}
            <img
              src="/images/about.jpg"
              alt="Basha Eshete Pension"
              className="h-full w-full object-cover"
            />
          </div>
        </motion.div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold">What we stand for</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid gap-6 sm:grid-cols-3"
          >
            {values.map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                className="rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm transition hover:shadow-lg"
              >
                <div className="mx-auto mb-4 inline-flex rounded-xl bg-[#123c2c]/10 p-3 text-[#123c2c]">
                  {item.icon}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
}