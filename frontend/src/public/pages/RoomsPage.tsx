import { BedDouble, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { siteConfig } from "../siteConfig";
import { money, usePageTitle, useRoomTypes, useSiteInfo } from "../data";

export default function RoomsPage() {
  usePageTitle("Rooms | Basha Eshete Pension");

  const info = useSiteInfo();
  const { roomTypes, loading } = useRoomTypes();

  return (
    <>
      <section className="bg-[#123c2c] py-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <h1 className="text-4xl font-bold">Rooms and prices</h1>
          <p className="mt-4 max-w-2xl text-white/80">
            Every room has clean linen, a private bathroom.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        {loading ? (
          <p className="text-center text-gray-500">Loading rooms...</p>
        ) : roomTypes.length === 0 ? (
          <p className="text-center text-gray-500">Rooms will appear here soon.</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {roomTypes.map((type, index) => (
              <div key={type.id} className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                <img
                  src={type.imageUrl || siteConfig.roomImages[index % siteConfig.roomImages.length]}
                  alt={type.name}
                  className="h-56 w-full object-cover"
                />

                <div className="p-6">
                  <h2 className="text-xl font-bold">{type.name}</h2>

                  <div className="mt-3 flex gap-5 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Users size={15} />
                      Up to {type.maxGuests}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BedDouble size={15} />
                      {type.beds} bed{type.beds > 1 ? "s" : ""}
                    </span>
                  </div>

                  {type.description && <p className="mt-3 text-sm text-gray-600">{type.description}</p>}

                  <div className="mt-5 flex items-center justify-between">
                    <p className="font-bold text-[#123c2c]">
                      {money(type.basePrice)} {info.currency}
                      <span className="text-sm font-normal text-gray-500"> / night</span>
                    </p>

                    <Link
                      to={`/book?roomTypeId=${type.id}`}
                      className="rounded-lg bg-[#123c2c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3024]"
                    >
                      Book
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}