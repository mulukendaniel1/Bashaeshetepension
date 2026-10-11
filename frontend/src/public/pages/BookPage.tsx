import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../../api";
import { money, toDateInput, usePageTitle, useSiteInfo } from "../data";

type AvailableType = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  maxGuests: number;
  beds: number;
  available: number;
};

export default function BookPage() {
  usePageTitle("Book a room | Basha Eshete Pension");

  const info = useSiteInfo();
  const [params] = useSearchParams();

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const [checkIn, setCheckIn] = useState(params.get("checkIn") || toDateInput(today));
  const [checkOut, setCheckOut] = useState(params.get("checkOut") || toDateInput(tomorrow));
  const [guests, setGuests] = useState(Number(params.get("guests")) || 1);
  const [roomTypeId, setRoomTypeId] = useState(params.get("roomTypeId") || "");

  const [types, setTypes] = useState<AvailableType[]>([]);
  const [nights, setNights] = useState(1);
  const [checking, setChecking] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, stays empty

  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [reference, setReference] = useState("");

  // Look up free rooms whenever the dates or the guest count change.
  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setTypes([]);
      setAvailabilityError(checkIn && checkOut ? "Check-out must be after check-in." : "");
      return;
    }

    let cancelled = false;
    setChecking(true);
    setAvailabilityError("");

    api
      .get<{ success: boolean; nights: number; roomTypes: AvailableType[] }>(
        `/public/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
      )
      .then((res) => {
        if (cancelled) return;
        setTypes(res.roomTypes);
        setNights(res.nights);
      })
      .catch((err) => {
        if (cancelled) return;
        setTypes([]);
        setAvailabilityError(err instanceof ApiError ? err.message : "Could not check rooms.");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [checkIn, checkOut, guests]);

  const selected = types.find((type) => type.id === roomTypeId);

  const submit = async () => {
    setFormError("");

    if (!selected || selected.available < 1) {
      setFormError("Choose a room that is available.");
      return;
    }

    if (fullName.trim().length < 2) {
      setFormError("Enter your full name.");
      return;
    }

    if (phone.trim().length < 7) {
      setFormError("Enter a phone number we can call.");
      return;
    }

    setSending(true);

    try {
      const res = await api.post<{ success: boolean; reference: string }>(
        "/public/booking-requests",
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          roomTypeId: selected.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          numberOfGuests: guests,
          message: message.trim() || undefined,
          website,
        }
      );

      setReference(res.reference);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not send your request. Please call us.");
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#123c2c]";

  if (reference) {
    return (
      <section className="mx-auto max-w-xl px-5 py-24 text-center">
        <CheckCircle2 className="mx-auto text-[#123c2c]" size={56} />
        <h1 className="mt-5 text-3xl font-bold">Request received</h1>
        <p className="mt-3 text-gray-600">
          Thank you, {fullName.trim()}. We call you on {phone.trim()} to confirm your room. You pay
          at the pension.
        </p>

        <p className="mt-6 inline-block rounded-xl bg-[#f6f8f6] px-5 py-3 text-sm">
          Your reference: <span className="font-bold">{reference}</span>
        </p>

        <div className="mt-8">
          <Link to="/" className="font-semibold text-[#123c2c]">
            Back to home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-[#123c2c] py-16 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <h1 className="text-4xl font-bold">Book a room</h1>
          <p className="mt-3 max-w-2xl text-white/80">
            Send your request. We confirm by phone. You pay at the pension.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div>
            <h2 className="text-xl font-bold">1. Choose your dates</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Check-in</label>
                <input type="date" min={toDateInput(today)} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Check-out</label>
                <input type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Guests</label>
                <input type="number" min="1" max="10" value={guests} onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))} className={inputClass} />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold">2. Choose your room</h2>

            {availabilityError && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{availabilityError}</p>
            )}

            {checking ? (
              <p className="mt-4 text-sm text-gray-500">Checking rooms...</p>
            ) : (
              <div className="mt-4 space-y-3">
                {!availabilityError && types.length === 0 && (
                  <p className="text-sm text-gray-500">No room fits this number of guests.</p>
                )}

                {types.map((type) => {
                  const soldOut = type.available < 1;

                  return (
                    <button
                      key={type.id}
                      disabled={soldOut}
                      onClick={() => setRoomTypeId(type.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition ${
                        roomTypeId === type.id
                          ? "border-[#123c2c] bg-[#123c2c]/5"
                          : "border-gray-200 hover:border-[#123c2c]/40"
                      } ${soldOut ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <div>
                        <p className="font-bold">{type.name}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Up to {type.maxGuests} guests · {type.beds} bed{type.beds > 1 ? "s" : ""}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {soldOut
                            ? "Not available for these dates"
                            : type.available <= 2
                              ? `Only ${type.available} left`
                              : "Available"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-[#123c2c]">
                          {money(type.basePrice)} {info.currency}
                        </p>
                        <p className="text-xs text-gray-500">per night</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold">3. Your details</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Full name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Phone number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XXXXXXXX" className={inputClass} />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Email (optional)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Note (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Arrival time, special needs, meals..."
                  className={inputClass}
                />
              </div>

              {/* Hidden from people. Bots fill it. */}
              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-black/5 bg-[#f6f8f6] p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Your stay</h2>

          <div className="mt-4 space-y-2 text-sm">
            <p className="flex justify-between">
              <span className="text-gray-500">Check-in</span>
              <span className="font-medium">{checkIn}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">Check-out</span>
              <span className="font-medium">{checkOut}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">Guests</span>
              <span className="font-medium">{guests}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">Room</span>
              <span className="font-medium">{selected ? selected.name : "Not chosen"}</span>
            </p>
          </div>

          {selected && (
            <div className="mt-5 border-t border-black/10 pt-4">
              <p className="text-xs text-gray-500">
                {nights} night{nights > 1 ? "s" : ""} x {money(selected.basePrice)} {info.currency}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#123c2c]">
                {money(nights * selected.basePrice)} {info.currency}
              </p>
              <p className="mt-1 text-xs text-gray-500">Estimate. You pay at the pension.</p>
            </div>
          )}

          {formError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</p>}

          <button
            onClick={submit}
            disabled={sending}
            className="mt-5 w-full rounded-xl bg-[#123c2c] py-3.5 text-sm font-semibold text-white transition hover:bg-[#0d3024] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send booking request"}
          </button>

          <p className="mt-3 text-center text-xs text-gray-500">
            No payment online. We call to confirm.
          </p>
        </aside>
      </section>
    </>
  );
}