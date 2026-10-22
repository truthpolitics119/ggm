"use client";

import dynamic from "next/dynamic";
import { LoaderCircle } from "lucide-react";
import type { Retailer } from "@/lib/types";

const RetailerMap = dynamic(() => import("@/components/retailer-map"), {
  ssr: false,
  loading: () => <div className="empty-state" style={{background:"#080807",height:"100%",color:"#d4af37"}}><LoaderCircle className="animate-spin" style={{margin:"auto"}}/> Loading retailer map…</div>,
});

export function MapView({ retailers }: { retailers: Retailer[] }) {
  return <RetailerMap retailers={retailers}/>;
}
