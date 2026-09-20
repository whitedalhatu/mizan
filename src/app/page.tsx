import { redirect } from "next/navigation";

// The bare domain has no page of its own — send visitors into the app. The app
// layout then bounces them to /login if they're not signed in.
export default function RootPage() {
  redirect("/dashboard");
}
