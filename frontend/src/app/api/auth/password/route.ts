import { NextRequest, NextResponse } from "next/server";
import { getPlayer, savePlayer, createNewPlayer, playerExists } from "@/lib/io";
import {
  hashPassword,
  verifyPassword,
  findUser,
  userExists,
  createUser,
  recordUserLogin,
  updateUserPassword,
  storeOtpInDb,
  verifyOtpInDb,
} from "@/lib/auth";
import { generateAndStoreOtp, verifyStoredOtp, sendOtpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || "login_password").trim();
    const email = String(body.email || body.email_or_phone || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "Email address or username is required." },
        { status: 400 }
      );
    }

    // =========================================================================
    // 1. FORGOT PASSWORD: SEND OTP TO EMAIL
    // =========================================================================
    if (action === "forgot_password_send_otp") {
      const existsInAuth = await userExists(email);
      const existsInWorld = await playerExists(email);

      if (!existsInAuth && !existsInWorld) {
        return NextResponse.json(
          {
            ok: false,
            message: `No citizen account found for "${email}". Please verify your email or sign up first.`,
            notFound: true,
          },
          { status: 404 }
        );
      }

      const existingUser = await findUser(email);
      const existingPlayer = await getPlayer(email);
      const citizenName = existingUser?.name || existingPlayer?.household?.name || email.split(/[@_]/)[0];

      const code = generateAndStoreOtp(email);
      await storeOtpInDb(email, code, 10);

      try {
        await sendOtpEmail(email, code, citizenName);
        return NextResponse.json({
          ok: true,
          message: `Password reset verification code sent to ${email}. Please check your inbox.`,
          devCode: process.env.NODE_ENV !== "production" ? code : undefined,
        });
      } catch (err: any) {
        console.error("Failed to send OTP via SMTP:", err);
        return NextResponse.json({
          ok: true,
          message: `Password reset code generated: ${code} (SMTP notice: ${err.message})`,
          devCode: code,
        });
      }
    }

    // =========================================================================
    // 2. FORGOT PASSWORD: VERIFY OTP AND RESET PASSWORD
    // =========================================================================
    if (action === "forgot_password_verify_and_reset") {
      const otpCode = String(body.otp || body.code || "").trim();
      const newPassword = String(body.new_password || password || "").trim();

      if (!otpCode) {
        return NextResponse.json(
          { ok: false, message: "OTP verification code is required." },
          { status: 400 }
        );
      }

      if (!newPassword || newPassword.length < 4) {
        return NextResponse.json(
          { ok: false, message: "New password must be at least 4 characters long." },
          { status: 400 }
        );
      }

      const isValidMemory = verifyStoredOtp(email, otpCode);
      const isValidDb = await verifyOtpInDb(email, otpCode);

      if (!isValidMemory && !isValidDb) {
        return NextResponse.json(
          { ok: false, message: "Invalid or expired OTP code. Please request a new one." },
          { status: 400 }
        );
      }

      const newHash = hashPassword(newPassword);

      // Update in civilization_auth.users
      await updateUserPassword(email, newHash);

      // Update in civilization_world.players
      const existingPlayer = await getPlayer(email);
      if (existingPlayer) {
        existingPlayer.password_hash = newHash;
        await savePlayer(existingPlayer);
      } else {
        const existingUser = await findUser(email);
        const newPlayer = createNewPlayer(email, {
          name: existingUser?.name || email.split(/[@_]/)[0],
        });
        newPlayer.password_hash = newHash;
        await savePlayer(newPlayer);
      }

      return NextResponse.json({
        ok: true,
        message: "Your password has been successfully reset! You can now sign in with your new password.",
        user_id: email,
      });
    }

    if (!password) {
      return NextResponse.json(
        { ok: false, message: "Password is required." },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { ok: false, message: "Password must be at least 4 characters long." },
        { status: 400 }
      );
    }

    // 3. LOGIN WITH PASSWORD
    if (action === "login_password") {
      const existingUser = await findUser(email);
      const existingPlayer = await getPlayer(email);

      // Check if user exists in Auth DB or World DB
      if (!existingUser && !existingPlayer) {
        return NextResponse.json(
          {
            ok: false,
            message: `No citizen account found for "${email}". Please create an account first.`,
            notFound: true,
          },
          { status: 404 }
        );
      }

      const storedHash = existingUser?.password_hash || existingPlayer?.password_hash;

      // If user has no password set yet (e.g. registered previously via OTP or legacy migration)
      if (!storedHash) {
        const newHash = hashPassword(password);
        if (existingPlayer) {
          existingPlayer.password_hash = newHash;
          await savePlayer(existingPlayer);
        }
        await createUser({
          user_id: email,
          email,
          name: existingPlayer?.household?.name || email.split(/[@_]/)[0],
          password_hash: newHash,
        });

        return NextResponse.json({
          ok: true,
          message: "Password registered & logged in successfully.",
          user_id: email,
        });
      }

      // Verify password
      const isValid = verifyPassword(password, storedHash);
      if (!isValid) {
        return NextResponse.json(
          {
            ok: false,
            message: "Incorrect password. Please check your password or sign in with OTP.",
          },
          { status: 401 }
        );
      }

      // If old hash was not PBKDF2 format, auto-upgrade to PBKDF2
      if (!storedHash.includes(":")) {
        const upgradedHash = hashPassword(password);
        await updateUserPassword(email, upgradedHash);
        if (existingPlayer) {
          existingPlayer.password_hash = upgradedHash;
          await savePlayer(existingPlayer);
        }
      }

      // Record login timestamp
      await recordUserLogin(email);

      return NextResponse.json({
        ok: true,
        message: "Logged in successfully to AI Civilization.",
        user_id: email,
        name: existingUser?.name || existingPlayer?.household?.name || email.split(/[@_]/)[0],
        role: existingUser?.role || (email === "vandan_11" ? "admin" : "citizen"),
      });
    }

    // 2. REGISTER WITH PASSWORD
    if (action === "register_password") {
      const citizenName = String(body.citizen_name || "").trim();
      const address = String(body.address || "").trim();
      const lat = Number(body.lat) || 20.9472;
      const lng = Number(body.lng) || 72.9515;
      const members = Array.isArray(body.members)
        ? body.members.map((m: any) => String(m).trim()).filter(Boolean)
        : [];

      // Check if user already exists
      const existsInAuth = await userExists(email);
      const existsInWorld = await playerExists(email);

      if (existsInAuth || existsInWorld) {
        return NextResponse.json(
          {
            ok: false,
            message: `An account already exists with "${email}". Please log in instead.`,
            alreadyExists: true,
          },
          { status: 409 }
        );
      }

      const passwordHash = hashPassword(password);

      // 1. Create auth user in MongoDB civilization_auth.users
      await createUser({
        user_id: email,
        email,
        name: citizenName,
        password_hash: passwordHash,
        address,
        lat,
        lng,
        members,
      });

      // 2. Create player state in MongoDB civilization_world.players
      const newPlayer = createNewPlayer(email, {
        name: citizenName,
        address,
        lat,
        lng,
        members,
      });
      newPlayer.password_hash = passwordHash;
      await savePlayer(newPlayer);

      return NextResponse.json({
        ok: true,
        message: `Citizen account successfully certified for ${citizenName || email}.`,
        user_id: email,
      });
    }

    return NextResponse.json({ ok: false, message: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("[Auth Password Route Error]:", err);
    return NextResponse.json(
      { ok: false, message: "Authentication server error: " + err.message },
      { status: 500 }
    );
  }
}

