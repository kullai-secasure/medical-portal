import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const roleAccessMap: Record<string, string[]> = {
  PATIENT: ["/dashboard", "/profile", "/appointments", "/records", "/prescriptions", "/messages"],
  DOCTOR: [
    "/doctor-dashboard",
    "/doctor-patients",
    "/doctor-referrals",
    "/doctor-prescriptions",
    "/doctor-lab-review",
    "/doctor-schedule",
    "/messages",
  ],
  NURSE: ["/nurse-dashboard", "/nurse-vitals", "/nurse-appointments", "/messages"],
  LAB_TECHNICIAN: ["/lab-dashboard", "/lab-orders", "/messages"],
  ADMIN: [
    "/admin-dashboard",
    "/admin-users",
    "/admin-analytics",
    "/admin-departments",
    "/admin-audit-log",
    "/admin-bulk-import",
    "/admin-search",
  ],
};

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  const pathname = req.nextUrl.pathname;
  const userRole = token.role as string;
  const allowedRoutes = roleAccessMap[userRole] || [];
  const isAllowed = allowedRoutes.some((route) => pathname.startsWith(route));

  if (!isAllowed) {
    const firstAllowedRoute = allowedRoutes[0] || "/";
    return NextResponse.redirect(new URL(firstAllowedRoute, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/appointments/:path*",
    "/records/:path*",
    "/prescriptions/:path*",
    "/doctor-dashboard/:path*",
    "/doctor-patients/:path*",
    "/doctor-referrals/:path*",
    "/doctor-prescriptions/:path*",
    "/doctor-lab-review/:path*",
    "/doctor-schedule/:path*",
    "/nurse-dashboard/:path*",
    "/nurse-vitals/:path*",
    "/nurse-appointments/:path*",
    "/lab-dashboard/:path*",
    "/lab-orders/:path*",
    "/admin-dashboard/:path*",
    "/admin-users/:path*",
    "/admin-analytics/:path*",
    "/admin-departments/:path*",
    "/admin-audit-log/:path*",
    "/admin-bulk-import/:path*",
    "/admin-search/:path*",
    "/messages/:path*",
  ],
};
