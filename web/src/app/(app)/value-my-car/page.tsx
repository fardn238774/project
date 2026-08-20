import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ValueMyCarForm } from "./ValueMyCarForm";

export const metadata = { title: "Value my car — AutoBD" };

export default async function ValueMyCarPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-[760px] px-10 pb-24 pt-6">
      <Link href="/assistant" className="mb-4.5 block text-[13px] text-muted hover:text-text">
        &larr; Back to assistant
      </Link>
      <h1 className="mb-1.5 text-[26px] font-extrabold text-text">Value my car</h1>
      <p className="mb-6 max-w-[580px] text-[14px] leading-[1.6] text-muted">
        Tell us about your car and we&apos;ll estimate its market value — anchored on live
        classifieds prices for the same model, then adjusted for its age, mileage, accident
        history, service records, past repairs and condition.
      </p>
      <ValueMyCarForm />
    </main>
  );
}
