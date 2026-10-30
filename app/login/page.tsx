import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="min-h-screen bg-char flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-sand p-6 shadow-xl">
        <div className="font-serif text-2xl tracking-[0.2em] text-center">FLAIR</div>
        <h1 className="text-center text-muted mb-6">Cast Calendar</h1>
        <LoginForm error={error} />
        <p className="mt-5 text-sm text-center">New Flair performer? <a href="/join" className="underline font-medium">Sign up here</a></p>
        <p className="mt-4 text-xs text-muted text-center">You'll stay logged in on this device, so you only need to do this once. Using Cast Calendar from your home screen? Type the 6-digit code rather than tapping the link.</p>
      </div>
    </main>
  );
}
