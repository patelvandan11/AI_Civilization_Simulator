import { NextRequest, NextResponse } from "next/server";
import { generateAndStoreOtp, verifyStoredOtp, sendOtpEmail, sendMagicLinkEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;
    const email = String(body.email || "").trim();
    const name = String(body.name || "Citizen").trim();

    if (!email) {
      return NextResponse.json({ ok: false, message: "Email address is required." }, { status: 400 });
    }

    if (action === "send_otp") {
      const code = generateAndStoreOtp(email);
      try {
        await sendOtpEmail(email, code, name);
        return NextResponse.json({
          ok: true,
          message: `Verification code sent to ${email}. Please check your inbox (and spam folder).`,
          // Also return code for development convenience
          devCode: process.env.NODE_ENV !== "production" ? code : undefined
        });
      } catch (err: any) {
        console.error("Failed to send OTP via SMTP:", err);
        return NextResponse.json({
          ok: true, // Graceful fallback
          message: `Verification code generated for ${email}: ${code} (SMTP delivery error: ${err.message})`,
          devCode: code
        });
      }
    }

    if (action === "verify_otp") {
      const code = String(body.code || "").trim();
      if (!code) {
        return NextResponse.json({ ok: false, message: "OTP code cannot be empty." }, { status: 400 });
      }

      const isValid = verifyStoredOtp(email, code);
      if (isValid) {
        return NextResponse.json({ ok: true, message: "Email verified successfully." });
      } else {
        return NextResponse.json({ ok: false, message: "Invalid or expired OTP code. Please try again." }, { status: 400 });
      }
    }

    if (action === "send_magic_link") {
      const origin = req.nextUrl.origin || "http://localhost:3000";
      const magicUrl = `${origin}/?magic_user=${encodeURIComponent(email)}`;
      try {
        await sendMagicLinkEmail(email, magicUrl, name);
        return NextResponse.json({
          ok: true,
          message: `Magic sign-in link sent to ${email}!`,
          magicUrl
        });
      } catch (err: any) {
        return NextResponse.json({
          ok: true,
          message: `Magic link created: ${magicUrl}`,
          magicUrl
        });
      }
    }

    return NextResponse.json({ ok: false, message: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: "Auth error: " + err.message }, { status: 500 });
  }
}
