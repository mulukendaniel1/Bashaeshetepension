import { useEffect, useState } from "react";
import { api, assetUrl } from "../api";
import { siteConfig } from "./siteConfig";

export type SiteInfo = {
  businessName: string;
  phone: string;
  address: string;
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  // Website content from the admin Website page. Empty means "use the built-in text".
  siteTagline: string;
  siteEmail: string;
  siteHours: string;
  siteMapQuery: string;
  siteHeroImage: string;
  siteAboutImage: string;
  siteAboutText: string;
};

export type PublicRoomType = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  maxGuests: number;
  beds: number;
  imageUrl: string | null;
  roomCount: number;
};

const defaultInfo: SiteInfo = {
  businessName: "Basha Eshete Pension",
  phone: "",
  address: "",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  currency: "ETB",
  siteTagline: "",
  siteEmail: "",
  siteHours: "",
  siteMapQuery: "",
  siteHeroImage: "",
  siteAboutImage: "",
  siteAboutText: "",
};

// Text and photos for the public pages. The admin value wins. The built-in value is the fallback.
export function resolveSite(info: SiteInfo) {
  return {
    tagline: info.siteTagline || siteConfig.tagline,
    email: info.siteEmail || siteConfig.email,
    hours: info.siteHours || siteConfig.hours,
    mapQuery: info.siteMapQuery || siteConfig.mapQuery,
    heroImage: assetUrl(info.siteHeroImage) || siteConfig.heroImage,
    aboutImage: assetUrl(info.siteAboutImage) || siteConfig.roomImages[0],
    aboutText: info.siteAboutText || "",
  };
}

export function useSiteInfo() {
  const [info, setInfo] = useState<SiteInfo>(defaultInfo);

  useEffect(() => {
    api
      .get<{ success: boolean; info: SiteInfo }>("/public/info")
      .then((res) => setInfo({ ...defaultInfo, ...res.info }))
      .catch(() => setInfo(defaultInfo));
  }, []);

  return info;
}

export function useRoomTypes() {
  const [roomTypes, setRoomTypes] = useState<PublicRoomType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ success: boolean; roomTypes: PublicRoomType[] }>("/public/room-types")
      .then((res) => setRoomTypes(res.roomTypes))
      .catch(() => setRoomTypes([]))
      .finally(() => setLoading(false));
  }, []);

  return { roomTypes, loading };
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

export function money(value: number | string) {
  return Number(value).toLocaleString();
}

export function toDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}