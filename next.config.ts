import type { NextConfig } from "next";
import os from "os";

// Automatically get all local IP addresses of this laptop
const localIps = Object.values(os.networkInterfaces())
  .flat()
  .filter((iface) => iface && iface.family === "IPv4" && !iface.internal)
  .map((iface) => iface!.address);

const nextConfig: NextConfig = {
  // Allow phone/other devices on the local network to connect in dev mode
  allowedDevOrigins: [
    "192.168.29.41",
    "strategic-omissions-slots-textbook.trycloudflare.com",
    "10.20.85.139",
    "172.20.10.2",
    ...localIps,
  ],
};

export default nextConfig;

export default nextConfig;
