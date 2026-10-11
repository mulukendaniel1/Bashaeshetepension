import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { resolveSite, usePageTitle, useSiteInfo } from "../data";

export default function ContactPage() {
  usePageTitle("Contact | Basha Eshete Pension");

  const info = useSiteInfo();
  const site = resolveSite(info);

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    info.address || site.mapQuery
  )}`;

  const cards = [
    {
      icon: <Phone size={22} />,
      title: "Phone",
      text: info.phone || "Call the front desk",
      href: info.phone ? `tel:${info.phone}` : undefined,
    },
    {
      icon: <MapPin size={22} />,
      title: "Address",
      text: info.address || "Ask us for directions",
      href: mapUrl,
    },
    {
      icon: <Clock size={22} />,
      title: "Hours",
      text: `${site.hours}. Check-in ${info.checkInTime}, check-out ${info.checkOutTime}.`,
      href: undefined,
    },
    ...(site.email
      ? [{ icon: <Mail size={22} />, title: "Email", text: site.email, href: `mailto:${site.email}` }]
      : []),
  ];

  return (
    <>
      <section className="bg-[#123c2c] py-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <h1 className="text-4xl font-bold">Contact us</h1>
          <p className="mt-4 max-w-2xl text-white/80">
            Call us or visit the front desk. We reply to every booking request.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          {cards.map((card) => {
            const body = (
              <>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123c2c]/10 text-[#123c2c]">
                  {card.icon}
                </div>
                <h2 className="mt-4 font-semibold">{card.title}</h2>
                <p className="mt-1.5 text-sm text-gray-600">{card.text}</p>
              </>
            );

            return card.href ? (
              <a
                key={card.title}
                href={card.href}
                target={card.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                {body}
              </a>
            ) : (
              <div key={card.title} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
                {body}
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl bg-[#f6f8f6] p-8 text-center">
          <h2 className="text-2xl font-bold">Want to reserve a room?</h2>
          <p className="mt-2 text-gray-500">Send a request online. We confirm by phone.</p>

          <Link
            to="/book"
            className="mt-5 inline-block rounded-xl bg-[#123c2c] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0d3024]"
          >
            Book a Room
          </Link>
        </div>
      </section>
    </>
  );
}