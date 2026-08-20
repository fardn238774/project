import Link from "next/link";
import { requireBuyer } from "@/lib/session";
import { ListingForm } from "./ListingForm";

export const metadata = { title: "List your car — AutoBD" };

export default async function NewListingPage() {
  // Any signed-in buyer can list a car; org/admin accounts are sent home.
  await requireBuyer();

  return (
    <main className="mx-auto w-full max-w-[760px] px-10 pb-24 pt-6">
      <Link
        href="/used-cars/seller"
        className="mb-4.5 block text-[13px] text-muted hover:text-text"
      >
        &larr; Back to seller dashboard
      </Link>

      <h1 className="mb-1.5 text-[26px] font-extrabold text-text">List your car</h1>
      <p className="mb-6 max-w-[580px] text-[14px] leading-[1.6] text-muted">
        Fill in the full details, describe the condition, add the registration
        information, and attach the car&apos;s auction sheet. Our admin team
        reviews every submission — once approved, your listing goes live on the
        marketplace.
      </p>

      <ListingForm />
    </main>
  );
}
