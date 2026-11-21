"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-display mb-4">Something went wrong</h1>
      <p className="text-muted-foreground mb-6">An unexpected error occurred</p>
      <button onClick={() => reset()} className="btn-gold">
        Try again
      </button>
    </div>
  );
}
