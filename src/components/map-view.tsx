"use client";

import dynamic from "next/dynamic";
import { LoaderCircle } from "lucide-react";
import type { Retailer } from "@/lib/types";

const RetailerMap = dynamic(() => import("@/components/retailer-map"), {
  ssr: false,
  loading: () => <div className="empty-state map-loading"><LoaderCircle className="animate-spin"/> Loading retailer map…</div>,
});

export function MapView({ retailers }: { retailers: Retailer[] }) {
  return <RetailerMap retailers={retailers}/>;
}
