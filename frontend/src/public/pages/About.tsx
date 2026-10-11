import { HeartHandshake, Home, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { siteConfig } from "../siteConfig";
import { usePageTitle, useSiteInfo } from "../data";

const values = [
  { icon: <HeartHandshake size={22} />, title: "Warm hospitality", text: "Every guest is welcome like family." },
  { icon: <Home size={22} />, title: "A home away from home", text: "Quiet rooms, clean linen, and honest prices." },
  { icon: <MapPin size={22} />, title: "Easy to reach", text: "Close to the places guests come to see." },
];

export default function About() {
  usePageTitle("About | Basha Eshete Pension");

  const info = useSiteInfo();

  return (
    <>
      <section className="bg-[#123c2c] py-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <h1 className="text-4xl font-bold">About us</h1>
          <p className="mt-4 max-w-2xl text-white/80">
            {info.businessName} offers simple, comfortable rooms and friendly service.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-2">
        <img
          src={siteConfig.roomImages[0]}
          alt={info.businessName}
          className="h-80 w-full rounded-2xl object-cover shadow-lg"
        />

        <div>
          <h2 className="text-3xl font-bold">Our story</h2>
          <p className="mt-4 text-gray-600">
            We opened {info.businessName} to give travellers, families, and business guests a calm
            place to rest. Our team keeps the rooms clean, the staff helpful, and the prices fair.
          </p>
          <p className="mt-4 text-gray-600">
            Whether you stay one night or several weeks, we treat your stay as our own work. Ask
            the front desk for meals, local advice, or help with transport.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-[#f6f8f6] p-4">
              <p className="text-gray-500">Check-in</p>
              <p className="mt-1 font-semibold">{info.checkInTime}</p>
            </div>

            <div className="rounded-xl bg-[#f6f8f6] p-4">
              <p className="text-gray-500">Check-out</p>
              <p className="mt-1 font-semibold">{info.checkOutTime}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8f6] py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 md:grid-cols-3">
          {values.map((item) => (
            <div key={item.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123c2c]/10 text-[#123c2c]">
                {item.icon}
              </div>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm text-gray-500">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="text-3xl font-bold">Come and stay with us</h2>

        <Link
          to="/book"
          className="mt-6 inline-block rounded-xl bg-[#123c2c] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0d3024]"
        >
          Book a Room
        </Link>
      </section>
    </>
  );
}