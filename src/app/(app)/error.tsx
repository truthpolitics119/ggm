"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="content"><div className="card card-pad"><h1>We couldn’t load this page</h1><div role="alert" className="error-box">{error.message || "An unexpected error occurred."}</div><button className="btn" style={{marginTop:16}} onClick={reset}>Try again</button></div></main>;
}
