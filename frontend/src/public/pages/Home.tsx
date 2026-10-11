import { motion } from "framer-motion";
import { BedDouble, ShieldCheck, UtensilsCrossed, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import { assetUrl } from "../../api";
import { siteConfig } from "../siteConfig";
import { money, resolveSite, usePageTitle, useRoomTypes, useSiteInfo } from "../data";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const amenities = [
  { icon: <Wifi size={22} />, title: "Free Wi-Fi", text: "Fast, reliable internet ." },
  { icon: <UtensilsCrossed size={22} />, title: "Home-style meals", text: "Breakfast and dinner on request." },
  { icon: <ShieldCheck size={22} />, title: "24/7 security", text: "A staffed gate and an on-site caretaker." },
  { icon: <BedDouble size={22} />, title: "Clean, quiet rooms", text: "Daily housekeeping included." },
];

export default function Home() {
  usePageTitle("Basha Eshete Pension | Comfortable rooms and warm hospitality");

  const info = useSiteInfo();
  const site = resolveSite(info);
  const { roomTypes } = useRoomTypes();

  const nameWords = (info.businessName || "").split(" ");
  const nameLast = nameWords.length > 1 ? nameWords.pop() : "";
  const nameFirst = nameWords.join(" ");

  return (
    <>
      <section className="relative flex min-h-[90vh] items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={site.heroImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/5" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-32">
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.12 }}
            className="max-w-xl text-white"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-emerald-300 drop-shadow-md">
              Welcome to
            </motion.p>

            <motion.h1 variants={fadeUp} className="mt-3 inline-block rounded-2xl border border-white/25 bg-white/10 px-6 py-4 font-serif text-3xl font-bold leading-tight shadow-2xl backdrop-blur-md sm:px-8 sm:py-5 sm:text-4xl">
              {nameFirst}
              <span className="block text-emerald-300">{nameLast}</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-5 max-w-md text-base text-white drop-shadow-md">
              {site.tagline} Clean rooms, friendly service, and everything you need close by.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-6">
              <Link
                to="/book"
                className="inline-block rounded-xl bg-[#d8a84e] px-6 py-3 text-sm font-semibold text-[#10241b] transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Book a Room
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="amenities" className="mx-auto max-w-6xl scroll-mt-28 px-5 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold">Why stay with us</h2>
          <p className="mt-3 text-gray-500">Everything you need for a comfortable stay.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {amenities.map((item) => (
            <div key={item.title} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123c2c]/10 text-[#123c2c]">
                {item.icon}
              </div>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm text-gray-500">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {roomTypes.length > 0 && (
        <section className="bg-[#f6f8f6] py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold">Our rooms</h2>
                <p className="mt-3 text-gray-500">Pick the room that fits your stay.</p>
              </div>

              <Link to="/rooms" className="text-sm font-semibold text-[#123c2c]">
                See all rooms
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {roomTypes.slice(0, 3).map((type, index) => (
                <Link
                  key={type.id}
                  to={`/book?roomTypeId=${type.id}`}
                  className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <img
                    src={assetUrl(type.imageUrl) || siteConfig.roomImages[index % siteConfig.roomImages.length]}
                    alt={type.name}
                    className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <div className="p-5">
                    <h3 className="font-bold">{type.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Up to {type.maxGuests} guests · {type.beds} bed{type.beds > 1 ? "s" : ""}
                    </p>
                    <p className="mt-3 font-semibold text-[#123c2c]">
                      {money(type.basePrice)} {info.currency} / night
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="text-3xl font-bold">Ready to book your stay?</h2>
        <p className="mx-auto mt-3 max-w-xl text-gray-500">
          Send your request in a minute. We call you to confirm. You pay at the pension.
        </p>

        <Link
          to="/book"
          className="mt-8 inline-block rounded-xl bg-[#123c2c] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0d3024]"
        >
          Book a Room
        </Link>
      </section>
    </>
  );
}