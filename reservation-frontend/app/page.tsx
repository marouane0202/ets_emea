import { redirect } from "next/navigation";

export default function Home() {
  // The app's real entry point is the auth flow, so direct root visits are sent there immediately.
  redirect("/auth");
}
