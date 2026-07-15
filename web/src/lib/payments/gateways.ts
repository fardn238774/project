import { Gateway } from "@/generated/prisma/enums";

/**
 * SSLCommerz (primary) and bKash (secondary), per the FR.
 *
 * Both are driven by real sandbox credentials from the environment. When a
 * gateway is not configured the checkout refuses rather than pretending to
 * succeed — a fake "payment complete" would be exactly the kind of simulated
 * behaviour this rebuild exists to remove.
 */
export type GatewayConfig = {
  gateway: Gateway;
  label: string;
  configured: boolean;
  sandbox: boolean;
};

export function sslcommerzConfig(): GatewayConfig {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePass = process.env.SSLCOMMERZ_STORE_PASSWORD;
  return {
    gateway: Gateway.SSLCOMMERZ,
    label: "SSLCommerz",
    configured: Boolean(storeId && storePass),
    sandbox: process.env.SSLCOMMERZ_SANDBOX !== "false",
  };
}

export function bkashConfig(): GatewayConfig {
  const appKey = process.env.BKASH_APP_KEY;
  const appSecret = process.env.BKASH_APP_SECRET;
  const username = process.env.BKASH_USERNAME;
  const password = process.env.BKASH_PASSWORD;
  return {
    gateway: Gateway.BKASH,
    label: "bKash",
    configured: Boolean(appKey && appSecret && username && password),
    sandbox: process.env.BKASH_SANDBOX !== "false",
  };
}

export function gatewayConfigs(): GatewayConfig[] {
  // SSLCommerz first — the FR makes it primary.
  return [sslcommerzConfig(), bkashConfig()];
}

export function configFor(gateway: Gateway): GatewayConfig {
  return gateway === Gateway.BKASH ? bkashConfig() : sslcommerzConfig();
}

// --------------------------------------------------------------- SSLCommerz

const SSLC_SANDBOX_INIT = "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";
const SSLC_LIVE_INIT = "https://securepay.sslcommerz.com/gwprocess/v4/api.php";
const SSLC_SANDBOX_VALIDATE =
  "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";
const SSLC_LIVE_VALIDATE =
  "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";

export type InitResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

/**
 * Creates an SSLCommerz session and returns the hosted checkout URL. The buyer
 * completes payment on SSLCommerz's page; we never handle card details.
 */
export async function sslcommerzInit(args: {
  tranId: string;
  amountBdt: number;
  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  baseUrl: string;
}): Promise<InitResult> {
  const cfg = sslcommerzConfig();
  if (!cfg.configured) {
    return { ok: false, error: "SSLCommerz is not configured on this deployment." };
  }

  const body = new URLSearchParams({
    store_id: process.env.SSLCOMMERZ_STORE_ID!,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD!,
    total_amount: args.amountBdt.toFixed(2),
    currency: "BDT",
    tran_id: args.tranId,
    success_url: `${args.baseUrl}/api/payments/sslcommerz/callback?status=success`,
    fail_url: `${args.baseUrl}/api/payments/sslcommerz/callback?status=fail`,
    cancel_url: `${args.baseUrl}/api/payments/sslcommerz/callback?status=cancel`,
    ipn_url: `${args.baseUrl}/api/payments/sslcommerz/ipn`,
    product_name: args.productName,
    product_category: "Automobile",
    product_profile: "physical-goods",
    cus_name: args.customerName,
    cus_email: args.customerEmail,
    cus_phone: args.customerPhone,
    cus_add1: "Bangladesh",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    shipping_method: "NO",
  });

  try {
    const res = await fetch(cfg.sandbox ? SSLC_SANDBOX_INIT : SSLC_LIVE_INIT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, error: `SSLCommerz returned HTTP ${res.status}.` };

    const data: { status?: string; GatewayPageURL?: string; failedreason?: string } =
      await res.json();
    if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
      return { ok: false, error: data.failedreason || "SSLCommerz refused the session." };
    }
    return { ok: true, redirectUrl: data.GatewayPageURL };
  } catch {
    return { ok: false, error: "Could not reach SSLCommerz." };
  }
}

/**
 * Server-side validation of a completed transaction. A success callback alone
 * is not trustworthy — it is a browser redirect the payer could forge — so the
 * amount and status are always re-checked against SSLCommerz directly.
 */
export async function sslcommerzValidate(valId: string): Promise<{
  ok: boolean;
  amountBdt?: number;
  tranId?: string;
  status?: string;
}> {
  const cfg = sslcommerzConfig();
  if (!cfg.configured) return { ok: false };

  const url = new URL(cfg.sandbox ? SSLC_SANDBOX_VALIDATE : SSLC_LIVE_VALIDATE);
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", process.env.SSLCOMMERZ_STORE_ID!);
  url.searchParams.set("store_passwd", process.env.SSLCOMMERZ_STORE_PASSWORD!);
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { ok: false };
    const data: { status?: string; amount?: string; tran_id?: string } = await res.json();
    const valid = data.status === "VALID" || data.status === "VALIDATED";
    return {
      ok: valid,
      amountBdt: data.amount ? Number(data.amount) : undefined,
      tranId: data.tran_id,
      status: data.status,
    };
  } catch {
    return { ok: false };
  }
}

// -------------------------------------------------------------------- bKash

const BKASH_SANDBOX = "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
const BKASH_LIVE = "https://tokenized.pay.bka.sh/v1.2.0-beta";

async function bkashToken(): Promise<string | null> {
  const cfg = bkashConfig();
  if (!cfg.configured) return null;

  try {
    const res = await fetch(`${cfg.sandbox ? BKASH_SANDBOX : BKASH_LIVE}/tokenized/checkout/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        username: process.env.BKASH_USERNAME!,
        password: process.env.BKASH_PASSWORD!,
      },
      body: JSON.stringify({
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data: { id_token?: string } = await res.json();
    return data.id_token ?? null;
  } catch {
    return null;
  }
}

export async function bkashCreate(args: {
  tranId: string;
  amountBdt: number;
  baseUrl: string;
}): Promise<InitResult> {
  const cfg = bkashConfig();
  if (!cfg.configured) {
    return { ok: false, error: "bKash is not configured on this deployment." };
  }

  const token = await bkashToken();
  if (!token) return { ok: false, error: "bKash refused the credentials." };

  try {
    const res = await fetch(`${cfg.sandbox ? BKASH_SANDBOX : BKASH_LIVE}/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-App-Key": process.env.BKASH_APP_KEY!,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: args.tranId,
        callbackURL: `${args.baseUrl}/api/payments/bkash/callback`,
        amount: args.amountBdt.toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: args.tranId,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, error: `bKash returned HTTP ${res.status}.` };

    const data: { bkashURL?: string; statusMessage?: string } = await res.json();
    if (!data.bkashURL) {
      return { ok: false, error: data.statusMessage || "bKash refused the session." };
    }
    return { ok: true, redirectUrl: data.bkashURL };
  } catch {
    return { ok: false, error: "Could not reach bKash." };
  }
}

/** Captures an authorised bKash payment. Returns the gateway transaction id. */
export async function bkashExecute(paymentId: string): Promise<{
  ok: boolean;
  trxId?: string;
  amountBdt?: number;
}> {
  const cfg = bkashConfig();
  const token = await bkashToken();
  if (!token) return { ok: false };

  try {
    const res = await fetch(`${cfg.sandbox ? BKASH_SANDBOX : BKASH_LIVE}/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-App-Key": process.env.BKASH_APP_KEY!,
      },
      body: JSON.stringify({ paymentID: paymentId }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false };

    const data: { transactionStatus?: string; trxID?: string; amount?: string } =
      await res.json();
    return {
      ok: data.transactionStatus === "Completed",
      trxId: data.trxID,
      amountBdt: data.amount ? Number(data.amount) : undefined,
    };
  } catch {
    return { ok: false };
  }
}
