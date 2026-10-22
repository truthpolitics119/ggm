"use client";

import Image from "next/image";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ToastMessage } from "@/components/toast-message";

export function LoginForm({ initialError }: { initialError: string }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState("");
  const router = useRouter();
  async function submit(form: FormData) {
    setError(""); setNotice(""); setLoading(true);
    try {
      const email = String(form.get("email") ?? "").trim();
      const password = String(form.get("password") ?? "");
      const { error: authError } = await createClient().auth.signInWithPassword({ email, password });
      if (authError) throw new Error(authError.message);
      router.replace("/dashboard"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Sign in failed."); setLoading(false); }
  }
  async function forgot() {
    const email = (document.querySelector<HTMLInputElement>("#email")?.value ?? "").trim();
    if (!email) { setError("Enter your email address first."); return; }
    setLoading(true); setError(""); setNotice("");
    try {
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/update-password` });
      if (resetError) throw new Error(resetError.message);
      setNotice("If an account exists for this email, a password reset link has been sent.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to send password reset email."); }
    finally { setLoading(false); }
  }
  return <div className="login-page">
    <section className="login-brand"><Image src="/LOGO.png" alt="GGM Digital — Gaming, Gift, Mobile" width={400} height={190} priority/><h1>Grow every retailer relationship.</h1><p>One clear view of your retail network, interactions, and next opportunities.</p></section>
    <section className="login-panel"><form className="login-form" action={submit}>
      <span className="muted small">GGM RETAILER MANAGER</span><h2>Welcome back</h2><p>Sign in to continue to your workspace.</p>
      <ToastMessage message={notice}/>
      {error && <div role="alert" className="error-box">{error}</div>}
      <div className="field"><label htmlFor="email">Email address</label><div className="password-wrap"><Mail size={17} style={{position:"absolute",left:13,top:13,color:"#718197"}}/><input id="email" className="input" name="email" type="email" autoComplete="username" required placeholder="you@company.com" style={{paddingLeft:40}}/></div></div>
      <div className="field"><label htmlFor="password">Password</label><div className="password-wrap"><LockKeyhole size={17} style={{position:"absolute",left:13,top:13,color:"#718197"}}/><input id="password" className="input" name="password" type={show ? "text" : "password"} autoComplete="current-password" required placeholder="Enter your password" style={{paddingLeft:40}}/><button type="button" className="password-toggle" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div>
      <button className="btn" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      <button type="button" className="btn secondary" onClick={forgot} disabled={loading}>Forgot password?</button>
      <span className="muted small" style={{textAlign:"center"}}>Accounts are created by your GGM administrator.</span>
    </form></section>
  </div>;
}
