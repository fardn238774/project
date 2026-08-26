import { requireBuyer } from "@/lib/session";
import { getCartItems } from "@/lib/cart";
import { gatewayConfigs } from "@/lib/payments/gateways";
import { CartView } from "./CartView";

export const metadata = { title: "My cart — AutoBD" };

export default async function CartPage() {
  const buyer = await requireBuyer();
  const items = await getCartItems(buyer.id);
  const total = items.reduce((s, i) => s + Number(i.amountBdt.toString()), 0);
  const methods = gatewayConfigs().map((g) => ({
    key: g.gateway as string,
    label: g.label,
    configured: g.configured,
  }));

  return (
    <main className="mx-auto w-full max-w-[820px] px-10 pb-24 pt-6">
      <h1 className="mb-1.5 text-[26px] font-extrabold text-text">Your cart &amp; payments</h1>
      <p className="mb-6 max-w-[560px] text-sm text-muted">
        Everything you&apos;re buying across AutoBD — new, used, reconditioned and modifications —
        in one place. Settle it all in a single checkout.
      </p>
      <CartView
        items={items.map((i) => ({
          id: i.id,
          kind: i.kind,
          title: i.title,
          subtitle: i.subtitle,
          amountBdt: Number(i.amountBdt.toString()),
        }))}
        total={total}
        methods={methods}
      />
    </main>
  );
}
