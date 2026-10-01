import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Users } from "lucide-react";

// TODO: put the pension's real WhatsApp number here (international format, digits only)
const WHATSAPP_NUMBER = "2519XXXXXXXX";

const rooms = [
  { name: "Standard Room", price: 800, img: "/images/room%201.jpg" },
  { name: "Deluxe Room", price: 1200, img: "/images/room%202.jpg" },
  { name: "Family Suite", price: 1800, img: "/images/room%203.jpg" },
];

// yyyy-mm-dd in the visitor's local time
const toInputDate = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
};

const fieldClass =
  "w-full rounded-xl border border-[#e8dcc6] bg-white/70 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#123c2c] focus:ring-2 focus:ring-[#123c2c]/20";

export default function Reserve() {
  const [params] = useSearchParams();
  const requested = params.get("room");
  const initialRoom = rooms.some((r) => r.name === requested)
    ? (requested as string)
    : rooms[0].name;

  const today = toInputDate(new Date());

  const [form, setForm] = useState({
    room: initialRoom,
    name: "",
    phone: "",
    email: "",
    checkIn: "",
    checkOut: "",
    guests: "1",
    notes: "",
  });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const room = rooms.find((r) => r.name === form.room) ?? rooms[0];

  const nights =
    form.checkIn && form.checkOut
      ? Math.round(
          (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) /
            86400000
        )
      : 0;
  const total = nights > 0 ? nights * room.price : 0;

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError("");

    if (nights <= 0) {
      setError("Check-out must be after check-in.");
      return;
    }

    const message = [
      "Hello, I would like to reserve a room at Basha Eshete Pension.",
      "",
      `Room: ${room.name}`,
      `Check-in: ${form.checkIn}`,
      `Check-out: ${form.checkOut} (${nights} night${nights > 1 ? "s" : ""})`,
      `Guests: ${form.guests}`,
      `Estimated total: ${total.toLocaleString()} ETB`,
      "",
      `Name: ${form.name}`,
      `Phone: ${form.phone}`,
      form.email ? `Email: ${form.email}` : "",
      form.notes ? `Notes: ${form.notes}` : "",
    ]
      .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
      .join("\n");

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className="mx-auto flex min-h-[80vh] max-w-xl items-center px-5 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-2xl border border-[#e8dcc6] bg-[#fffaf0] p-8 text-center shadow-sm"
        >
          <CheckCircle2 className="mx-auto text-[#123c2c]" size={48} />
          <h1 className="mt-4 text-2xl font-bold">Request sent</h1>
          <p className="mt-2 text-sm text-stone-500">
            Thank you, {form.name}. Your reservation request for the{" "}
            {room.name} has been opened in WhatsApp. Send the message and we
            will confirm your booking shortly.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/"
              className="rounded-xl bg-[#123c2c] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0d3024]"
            >
              Back to home
            </Link>
            <button
              onClick={() => setSubmitted(false)}
              className="rounded-xl border border-[#e8dcc6] px-6 py-3 text-sm font-semibold transition hover:bg-[#f3ebdc]"
            >
              Edit request
            </button>
          </div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <h1 className="text-3xl font-bold sm:text-4xl">Reserve a Room</h1>
        <p className="mt-3 text-stone-500">
          Choose your dates and we will confirm your stay.
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-5 rounded-2xl border border-[#e8dcc6] bg-[#fffaf0] p-6 shadow-sm sm:p-8"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium">Room</label>
            <select
              value={form.room}
              onChange={(e) => update("room", e.target.value)}
              className={fieldClass}
            >
              {rooms.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name} — {r.price.toLocaleString()} ETB / night
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Check-in</label>
              <input
                type="date"
                required
                min={today}
                value={form.checkIn}
                onChange={(e) => update("checkIn", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Check-out</label>
              <input
                type="date"
                required
                min={form.checkIn || today}
                value={form.checkOut}
                onChange={(e) => update("checkOut", e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Full name</label>
              <input
                type="text"
                required
                placeholder="Your name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Phone</label>
              <input
                type="tel"
                required
                placeholder="+251 9XX XXX XXX"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Email <span className="text-stone-400">(optional)</span>
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Guests</label>
              <select
                value={form.guests}
                onChange={(e) => update("guests", e.target.value)}
                className={fieldClass}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} guest{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Notes <span className="text-stone-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Arrival time, special requests…"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className={fieldClass}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-[#123c2c] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#0d3024] hover:shadow-lg"
          >
            Send reservation request
          </button>
        </motion.form>

        {/* Summary */}
        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="h-fit overflow-hidden rounded-2xl border border-[#e8dcc6] bg-[#fffaf0] shadow-sm lg:sticky lg:top-28"
        >
          <img
            src={room.img}
            alt={room.name}
            className="h-52 w-full object-cover"
          />
          <div className="space-y-4 p-6">
            <div>
              <h2 className="text-lg font-semibold">{room.name}</h2>
              <p className="text-sm text-stone-500">
                {room.price.toLocaleString()} ETB / night
              </p>
            </div>

            <div className="space-y-2 text-sm text-stone-600">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-[#123c2c]" />
                {nights > 0
                  ? `${nights} night${nights > 1 ? "s" : ""}`
                  : "Select your dates"}
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#123c2c]" />
                {form.guests} guest{Number(form.guests) > 1 ? "s" : ""}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#e8dcc6] pt-4">
              <span className="text-sm text-stone-500">Estimated total</span>
              <span className="text-xl font-bold text-[#123c2c]">
                {total > 0 ? `${total.toLocaleString()} ETB` : "—"}
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Final price is confirmed by the pension when your request is
              approved.
            </p>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}