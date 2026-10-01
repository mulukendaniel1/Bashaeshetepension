import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
} as const;

export default function Contact() {
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
            Get in touch
          </motion.p>
          <motion.h1 variants={fadeUp} className="mt-3 text-4xl font-bold sm:text-5xl">
            Contact Us
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-white/85">
            Have a question or want to book a room? Reach out, we usually
            reply within the hour.
          </motion.p>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="grid gap-10 md:grid-cols-2"
        >
          <motion.div variants={fadeUp} className="space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="rounded-xl bg-[#123c2c]/10 p-3 text-[#123c2c]">
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="font-semibold">Address</h3>
                <p className="mt-1 text-sm text-gray-500">Arba Minch, South Ethiopia Regional State, Ethiopia</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="rounded-xl bg-[#123c2c]/10 p-3 text-[#123c2c]">
                <Phone size={20} />
              </div>
              <div>
                <h3 className="font-semibold">Phone</h3>
                <p className="mt-1 text-sm text-gray-500">+251 9XX XXX XXX</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="rounded-xl bg-[#123c2c]/10 p-3 text-[#123c2c]">
                <Mail size={20} />
              </div>
              <div>
                <h3 className="font-semibold">Email</h3>
                <p className="mt-1 text-sm text-gray-500">info@bashaeshetepension.com</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="rounded-xl bg-[#123c2c]/10 p-3 text-[#123c2c]">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-semibold">Reception Hours</h3>
                <p className="mt-1 text-sm text-gray-500">Open 24 hours, every day</p>
              </div>
            </div>
          </motion.div>

          <motion.form variants={fadeUp} className="space-y-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h3 className="font-semibold">Send us a message</h3>

            <input
              placeholder="Your name"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#123c2c] focus:bg-white"
            />
            <input
              placeholder="Phone or email"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#123c2c] focus:bg-white"
            />
            <textarea
              placeholder="Message"
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#123c2c] focus:bg-white"
            />
            <button
              type="button"
              className="w-full rounded-xl bg-[#123c2c] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#0d3024] hover:shadow-lg"
            >
              Send Message
            </button>
          </motion.form>
        </motion.div>
      </section>
    </>
  );
}