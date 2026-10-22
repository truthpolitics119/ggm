"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleX, X } from "lucide-react";

export function ToastMessage({ message, kind = "success" }: { message: string; kind?: "success" | "error" }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);
  if (!message || !visible) return null;
  const Icon = kind === "success" ? CircleCheck : CircleX;
  return <div className={`toast toast-${kind}`} role={kind === "error" ? "alert" : "status"}><Icon size={18}/><span>{message}</span><button type="button" aria-label="Dismiss notification" onClick={() => setVisible(false)}><X size={16}/></button></div>;
}
