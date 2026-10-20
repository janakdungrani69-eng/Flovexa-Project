type OtpRecord = { otp: string; expiresAt: number; verifiedAt?: number };

const globalForOtp = globalThis as unknown as {
  otpStore?: Map<string, OtpRecord>;
};

export const otpStore = globalForOtp.otpStore ?? new Map<string, OtpRecord>();

if (process.env.NODE_ENV !== "production") {
  globalForOtp.otpStore = otpStore;
}

export function normalizePhone(phone: string) {
  return String(phone ?? "").trim();
}

export function normalizeEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}
