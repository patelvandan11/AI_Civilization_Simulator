import { NextRequest, NextResponse } from "next/server";
import { loadPlayer, savePlayer, createNewPlayer } from "@/lib/io";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || "login_password").trim();
    const email = String(body.email || body.email_or_phone || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email) {
      return NextResponse.json({ ok: false, message: "Email address or username is required." }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ ok: false, message: "Password is required." }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ ok: false, message: "Password must be at least 4 characters long." }, { status: 400 });
    }

    // 1. LOGIN WITH PASSWORD
    if (action === "login_password") {
      const player = await loadPlayer(email);

      // If user has no password set yet (e.g. existing seeded account or first password login)
      if (!player.password_hash) {
        player.password_hash = hashPassword(password);
        await savePlayer(player);
        return NextResponse.json({
          ok: true,
          message: "Password registered & logged in successfully.",
          user_id: email
        });
      }

      // Verify password
      const isValid = verifyPassword(password, player.password_hash);
      if (!isValid) {
        return NextResponse.json({
          ok: false,
          message: "Incorrect password. Please verify your password or use OTP login."
        }, { status: 401 });
      }

      return NextResponse.json({
        ok: true,
        message: "Logged in successfully.",
        user_id: email
      });
    }

    // 2. REGISTER WITH PASSWORD
    if (action === "register_password") {
      const citizenName = String(body.citizen_name || "").trim();
      const address = String(body.address || "").trim();
      const lat = Number(body.lat) || 20.9472;
      const lng = Number(body.lng) || 72.9515;
      const members = Array.isArray(body.members) ? body.members.map((m: any) => String(m).trim()).filter(Boolean) : [];

      const newPlayer = createNewPlayer(email, {
        name: citizenName,
        address,
        lat,
        lng,
        members
      });

      newPlayer.password_hash = hashPassword(password);
      await savePlayer(newPlayer);

      return NextResponse.json({
        ok: true,
        message: `Citizen account registered with password for ${citizenName || email}.`,
        user_id: email
      });
    }

    return NextResponse.json({ ok: false, message: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: "Authentication error: " + err.message }, { status: 500 });
  }
}
