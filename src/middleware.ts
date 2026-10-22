import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = pathname === "/login" || pathname.startsWith("/auth/") || pathname.startsWith("/_next/");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return isPublic ? NextResponse.next() : NextResponse.redirect(new URL("/login?error=configuration", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !isPublic) return NextResponse.redirect(new URL("/login", request.url));
  if (user && pathname === "/login") return NextResponse.redirect(new URL("/dashboard", request.url));
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", user.id).maybeSingle();
    if (!profile?.is_active && !isPublic) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=account", request.url));
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
