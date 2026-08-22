import { auth } from "@/auth";
import { Landing } from "./Landing";

export const metadata = {
  title: "AutoBD — Buy a car, without the guesswork",
  description:
    "New, used, Japanese reconditioned or modified — one platform, transparent landed cost, all the way to your driveway.",
};

export default async function WelcomePage() {
  const session = await auth();
  const loggedIn = Boolean(session?.user);
  // Logged-in visitors jump straight into the app; everyone else goes to login.
  const primaryHref = loggedIn ? "/" : "/login";
  const primaryLabel = loggedIn ? "Enter AutoBD" : "Get started";

  return <Landing loggedIn={loggedIn} primaryHref={primaryHref} primaryLabel={primaryLabel} />;
}
