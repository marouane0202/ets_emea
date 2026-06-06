import AuthForm from "./AuthForm";

export const metadata = {
  title: "Auth | Reservation System",
  description: "Login or register new users for the reservation system.",
};

export default function AuthPage() {
  // Keep the login/register form on the first screen because authentication is required for the app.
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/95 shadow-2xl shadow-slate-950/40 backdrop-blur-sm sm:grid sm:grid-cols-[1.1fr_0.9fr]">
          <section className="relative hidden flex-col gap-8 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_35%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)] p-10 text-slate-100 sm:flex">
            <div className="space-y-4">
              <p className="inline-flex rounded-full bg-sky-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
                Reservation system
              </p>
              <h1 className="text-4xl font-semibold sm:text-5xl">Manage your bookings with ease</h1>
              <p className="max-w-xl text-slate-300 leading-7">
                Register or sign in to access session reservations
              </p>
            </div>
            <div className="mt-auto rounded-3xl border border-white/5 bg-white/5 p-6 text-slate-300 shadow-[0_20px_100px_-20px_rgba(15,23,42,0.75)]">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Fast auth flow</p>
              <p className="mt-3 text-base leading-7">
                Use the form to create an account or log in instantly
              </p>
            </div>
          </section>

          <main className="flex flex-1 flex-col gap-6 p-8 sm:p-10">
            <AuthForm />
          </main>
        </div>
      </div>
    </div>
  );
}
