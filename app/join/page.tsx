import { JoinForm } from "./JoinForm";

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-char flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-sand p-6 shadow-xl">
        <div className="font-serif text-2xl tracking-[0.2em] text-center">FLAIR</div>
        <h1 className="text-center text-muted mb-1">Join Cast Calendar</h1>
        <p className="text-center text-xs text-muted mb-5">Only the Flair team can see your details and availability. Other performers can't.</p>
        <JoinForm />
      </div>
    </main>
  );
}
