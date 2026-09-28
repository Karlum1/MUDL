import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scan&Wash",
    short_name: "Scan&Wash",
    description: "สแกน QR ที่เครื่อง ตั้งเวลา และรับแจ้งเตือนผ้าเสร็จ",
    start_url: "/",
    display: "standalone",
    background_color: "#07111c",
    theme_color: "#07111c",
    lang: "th",
    icons: [
      { src: "/icon.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "1024x1024", type: "image/png" },
    ],
  };
}
