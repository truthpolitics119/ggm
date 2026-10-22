import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginForm initialError={error === "account" ? "Your account is inactive. Contact an administrator." : error === "configuration" ? "The app is not connected to Supabase yet." : ""}/>;
}
