import AuthForm from "./AuthForm";

export const metadata = {
  title: "Sign in | ETS Reservation System",
};

export default function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">ETS Reservation System</h1>
          <p className="mt-2 text-sm text-gray-500">Sign in or create an account to continue</p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
