"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, ChevronLeft, ChevronRight, LayoutDashboard, LogOut, Map, MapPinned, Settings, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Retailer map", icon: Map },
  { href: "/retailers", label: "Retailers", icon: MapPinned },
];

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const initials = profile.full_name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  async function signOut() {
    setBusy(true);
    const { error } = await createClient().auth.signOut();
    if (error) { setBusy(false); window.alert(error.message); return; }
    router.replace("/login"); router.refresh();
  }
  const nav = (mobile = false) => (
    <>
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return <Link key={href} href={href} className={`${mobile ? "mobile-link" : "nav-link"}${active ? " active" : ""}`} aria-label={label}>
          <Icon size={18} strokeWidth={1.8}/><span>{label}</span>
        </Link>;
      })}
      {profile.role === "admin" && <>
        {!mobile && <div className="nav-section">Administration</div>}
        <Link href="/admin/users" className={`${mobile ? "mobile-link" : "nav-link"}${pathname.startsWith("/admin/users") ? " active" : ""}`} aria-label="Users"><Users size={18}/><span>Users</span></Link>
        <Link href="/admin/import" className={`${mobile ? "mobile-link" : "nav-link"}${pathname.startsWith("/admin/import") ? " active" : ""}`} aria-label="Import"><Activity size={18}/><span>CSV import</span></Link>
      </>}
    </>
  );
  return <div className="app-shell">
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <Link href="/dashboard" className="brand"><Image src="/LOGO.png" alt="GGM Digital — Gaming, Gift, Mobile" width={220} height={105} priority/></Link>
      <div className="nav-section">Workspace</div>{nav()}
      <button className="collapse-btn" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <ChevronRight size={17}/> : <><ChevronLeft size={17}/> Collapse sidebar</>}
      </button>
    </aside>
    <div className={`main-area${collapsed ? " expanded" : ""}`}>
      <header className="topbar">
        <span className="topbar-title"><Settings size={15} style={{verticalAlign:"-3px",marginRight:7}}/>Retail operations</span>
        <div className="user-chip"><div className="avatar">{initials}</div><div className="hide-mobile"><strong>{profile.full_name}</strong><div className="muted small">{profile.role}</div></div>
          <button className="icon-btn" aria-label="Sign out" disabled={busy} onClick={signOut}><LogOut size={17}/></button></div>
      </header>
      <main className="content">{children}</main>
    </div>
    <nav className="mobile-nav" aria-label="Primary navigation">{nav(true)}</nav>
  </div>;
}
