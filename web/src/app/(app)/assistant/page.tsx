import Link from "next/link";
import { llmConfigured } from "@/lib/assistant/llm";
import { Assistant } from "./Assistant";

export const metadata = { title: "AI Assistant — AutoBD" };

export default function AssistantPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-10 pb-20 pt-6">
      <div className="mb-5.5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold text-text">AI car assistant</h1>
          <p className="mt-1 max-w-[440px] text-sm text-muted">
            Ask for recommendations or advice in plain language — across new, used and
            reconditioned listings.
          </p>
        </div>
        <Link
          href="/value-my-car"
          className="whitespace-nowrap rounded-[10px] bg-ink px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-accent hover:text-on-accent"
        >
          Value my car &rarr;
        </Link>
      </div>

      <Assistant llmConfigured={llmConfigured()} />
    </main>
  );
}
