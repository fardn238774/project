"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FeeType, Role } from "@/generated/prisma/client";

export type AuthResult = { error?: string };

const PASSWORD_MIN = 8;

function normalizeEmail(v: FormDataEntryValue | null) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

export async function login(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email and password are required." };

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Incorrect email or password." };
    }
    // signIn throws a redirect on success — let Next handle it.
    throw err;
  }
}

export async function register(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const role = String(formData.get("role") ?? "");
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  // Admin accounts are provisioned internally and cannot self-register.
  if (role === Role.ADMIN) {
    return { error: "Admin accounts are provisioned internally and cannot self-register." };
  }
  if (role !== Role.BUYER && role !== Role.ORGANIZATION) {
    return { error: "Choose a valid role." };
  }
  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < PASSWORD_MIN) {
    return { error: `Password must be at least ${PASSWORD_MIN} characters.` };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const passwordHash = await bcrypt.hash(password, 10);

  if (role === Role.BUYER) {
    const fullName = String(formData.get("fullName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    if (!fullName || !phone) return { error: "Full name and phone are required." };

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.BUYER,
        buyer: { create: { fullName, phone } },
      },
    });
  } else {
    const companyName = String(formData.get("companyName") ?? "").trim();
    const licenseNumber = String(formData.get("licenseNumber") ?? "").trim();
    const yearsInOperation = Number(formData.get("yearsInOperation") ?? 0);
    const feeType = String(formData.get("feeType") ?? FeeType.PERCENT);
    const feeValue = Number(formData.get("feeValue") ?? 0);

    if (!companyName || !licenseNumber) {
      return { error: "Company name and license number are required." };
    }
    if (!Number.isFinite(yearsInOperation) || yearsInOperation < 0) {
      return { error: "Years of track record must be a number." };
    }
    if (!Number.isFinite(feeValue) || feeValue <= 0) {
      return { error: "Fee value must be greater than zero." };
    }

    const dupLicense = await prisma.organization.findUnique({ where: { licenseNumber } });
    if (dupLicense) return { error: "That license number is already registered." };

    // Organizations start PENDING and stay inactive until an admin approves.
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.ORGANIZATION,
        organization: {
          create: {
            companyName,
            licenseNumber,
            yearsInOperation: Math.trunc(yearsInOperation),
            feeType: feeType === FeeType.FLAT ? FeeType.FLAT : FeeType.PERCENT,
            feeValue,
          },
        },
      },
    });
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
    return {};
  } catch (err) {
    if (err instanceof AuthError) return { error: "Account created, but sign-in failed." };
    throw err;
  }
}

export async function logout() {
  // Sign out returns to the public landing page, from which the user can log
  // back in or browse — rather than dropping straight onto the login form.
  await signOut({ redirectTo: "/welcome" });
}
