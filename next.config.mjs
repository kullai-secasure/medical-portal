/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [
      {
        // Defense in depth for uploaded lab-result files: even if a future
        // change ever let an unexpected content type onto disk, these
        // headers stop the browser from executing it as HTML/SVG or
        // sniffing it into an executable type (VenusHawk finding #7).
        source: "/uploads/:path*",
        headers: [
          { key: "Content-Disposition", value: "attachment" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "sandbox" },
        ],
      },
    ];
  },
};

export default nextConfig;
