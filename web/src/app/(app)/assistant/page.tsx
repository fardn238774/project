import { llmConfigured } from "@/lib/assistant/llm";
import { Assistant } from "./Assistant";

export const metadata = { title: "AI Assistant — AutoBD" };

export default function AssistantPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-10 pb-20 pt-6">
      <h1 className="mb-1.5 text-[26px] font-extrabold text-text">
        AI car recommendation assistant
      </h1>
      <p className="mb-5.5 text-sm text-muted">
        Describe what you need in plain language — spanning new, used, and reconditioned
        listings.
      </p>

      <Assistant llmConfigured={llmConfigured()} />
    </main>
  );
}
