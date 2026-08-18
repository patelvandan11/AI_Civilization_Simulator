import nodemailer from "nodemailer";

// In-memory OTP storage with 10-minute expiry
const otpStore: Record<string, { code: string; expiresAt: number }> = {};

export function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || "meivaninfo@gmail.com";
  const pass = process.env.SMTP_PASS || "dhxg jwaw twmh atun";

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });
}

export function generateAndStoreOtp(email: string): string {
  const cleanEmail = email.toLowerCase().trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[cleanEmail] = {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  };
  return code;
}

export function verifyStoredOtp(email: string, code: string): boolean {
  const cleanEmail = email.toLowerCase().trim();
  const entry = otpStore[cleanEmail];
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    delete otpStore[cleanEmail];
    return false;
  }
  if (entry.code === code.trim()) {
    delete otpStore[cleanEmail];
    return true;
  }
  return false;
}

export async function sendOtpEmail(toEmail: string, otpCode: string, name: string = "Citizen") {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || `"Rumla AI Civilization" <${process.env.SMTP_USER || "meivaninfo@gmail.com"}>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 24px; }
        .container { max-width: 500px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .logo { font-size: 32px; text-align: center; margin-bottom: 8px; }
        .title { color: #f59e0b; font-size: 22px; font-weight: 800; text-align: center; margin: 0 0 16px 0; letter-spacing: -0.5px; }
        .subtitle { color: #94a3b8; font-size: 13px; text-align: center; margin-bottom: 24px; }
        .otp-box { background: #020617; border: 2px dashed #f59e0b; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; margin: 0; }
        .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🏛️</div>
        <h1 class="title">RUMLA CIVILIZATION</h1>
        <p class="subtitle">Hello <strong>${name}</strong>, use the verification code below to authenticate your citizen account.</p>
        
        <div class="otp-box">
          <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin: 0 0 8px 0; font-weight: bold;">Your One-Time Security Code</p>
          <div class="otp-code">${otpCode}</div>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">
          This code is valid for 10 minutes. If you did not request this login, please ignore this email.
        </p>

        <div class="footer">
          Rumla Autonomous Micro-Nation Simulation &bull; Satellite GIS Citizen Authentication
        </div>
      </div>
    </body>
    </html>
  `;

  return await transporter.sendMail({
    from,
    to: toEmail,
    subject: `🔐 Your Rumla Civilization Verification Code: ${otpCode}`,
    text: `Hello ${name}, your Rumla verification code is: ${otpCode}. Valid for 10 minutes.`,
    html
  });
}

export async function sendMagicLinkEmail(toEmail: string, magicLinkUrl: string, name: string = "Citizen") {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || `"Rumla AI Civilization" <${process.env.SMTP_USER || "meivaninfo@gmail.com"}>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 24px; }
        .container { max-width: 500px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .logo { font-size: 32px; text-align: center; margin-bottom: 8px; }
        .title { color: #f59e0b; font-size: 22px; font-weight: 800; text-align: center; margin: 0 0 16px 0; }
        .btn { display: block; background: linear-gradient(135deg, #0284c7, #38bdf8); color: #020617 !important; text-decoration: none; font-weight: 800; font-size: 15px; text-align: center; padding: 14px 24px; border-radius: 10px; margin: 24px 0; }
        .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🏛️</div>
        <h1 class="title">RUMLA CIVILIZATION</h1>
        <p style="color: #94a3b8; font-size: 13px; text-align: center;">Click the button below to instantly sign in to your citizen dashboard.</p>
        
        <a href="${magicLinkUrl}" class="btn">🚀 ENTER RUMLA SIMULATION</a>

        <p style="color: #64748b; font-size: 11px; text-align: center; word-break: break-all;">
          Or copy link: ${magicLinkUrl}
        </p>

        <div class="footer">
          Rumla Autonomous Micro-Nation Simulation &bull; Passwordless Security
        </div>
      </div>
    </body>
    </html>
  `;

  return await transporter.sendMail({
    from,
    to: toEmail,
    subject: `🔗 Your Instant Magic Sign-In Link for Rumla Civilization`,
    text: `Click the link to sign in: ${magicLinkUrl}`,
    html
  });
}
