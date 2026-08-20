import { GET as getDbStatus } from "../src/app/api/auth/db-status/route";
import { GET as getStatus } from "../src/app/api/status/route";
import { GET as getCatalog } from "../src/app/api/catalog/route";
import { POST as postSettings } from "../src/app/api/settings/route";
import { POST as postAgentToggle } from "../src/app/api/agent/toggle/route";
import { POST as postOtp } from "../src/app/api/auth/otp/route";
import { POST as postPassword } from "../src/app/api/auth/password/route";
import { GET as getAction, POST as postAction } from "../src/app/api/action/route";
import { GET as getDebug, POST as postDebug } from "../src/app/api/debug/route";

async function runApiTests() {
  console.log("=================================================================");
  console.log("🚀 STARTING COMPREHENSIVE AI CIVILIZATION API TEST SUITE");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  async function assert(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // TEST 1: Database Health & Status
  await assert("GET /api/auth/db-status", async () => {
    const req = new Request("http://localhost:3000/api/auth/db-status");
    const res = await getDbStatus(req as any);
    const data = await res.json();
    if (!data.status) throw new Error("Missing status in response");
    if (!data.databases) throw new Error("Missing databases info");
  });

  // TEST 2: Simulation Status
  await assert("GET /api/status?user_id=vandan11patel@gmail.com", async () => {
    const req = new Request("http://localhost:3000/api/status?user_id=vandan11patel@gmail.com");
    const res = await getStatus(req as any);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || "Failed status check");
    if (!Array.isArray(data.families)) throw new Error("Families is not an array");
  });

  // TEST 3: Catalog Items
  await assert("GET /api/catalog", async () => {
    const res = await getCatalog();
    const data = await res.json();
    if (!data.ok && !data.catalog) throw new Error("Invalid catalog response");
  });

  // TEST 4: Settings POST
  await assert("POST /api/settings", async () => {
    const postReq = new Request("http://localhost:3000/api/settings?user_id=vandan11patel@gmail.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { auto_sim: true, sim_speed: 1.0 } })
    });
    const postRes = await postSettings(postReq as any);
    const postData = await postRes.json();
    if (!postData.ok) throw new Error(postData.message || "Failed POST /api/settings");
  });

  // TEST 5: Agent Toggle POST
  await assert("POST /api/agent/toggle", async () => {
    const postReq = new Request("http://localhost:3000/api/agent/toggle?user_id=vandan11patel@gmail.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: "farming", enabled: true })
    });
    const postRes = await postAgentToggle(postReq as any);
    const postData = await postRes.json();
    if (!postData.ok) throw new Error(postData.message || "Failed POST /api/agent/toggle");
  });

  // TEST 6: Auth OTP Verification Code
  await assert("POST /api/auth/otp (Send Login OTP)", async () => {
    const req = new Request("http://localhost:3000/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_otp", email: "vandan11patel@gmail.com" })
    });
    const res = await postOtp(req as any);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || "Failed to send login OTP");
  });

  // TEST 7: Forgot Password Flow (OTP Send & Verify/Reset)
  let testOtpCode = "";
  await assert("POST /api/auth/password (Forgot Password Send OTP)", async () => {
    const req = new Request("http://localhost:3000/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forgot_password_send_otp", email: "vandan11patel@gmail.com" })
    });
    const res = await postPassword(req as any);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || "Failed to send reset OTP");
    testOtpCode = data.devCode || "123456";
  });

  await assert("POST /api/auth/password (Forgot Password Reset)", async () => {
    const req = new Request("http://localhost:3000/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "forgot_password_verify_and_reset",
        email: "vandan11patel@gmail.com",
        otp: testOtpCode,
        new_password: "admin_test_pass"
      })
    });
    const res = await postPassword(req as any);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || "Failed to reset password");
  });

  // TEST 8: Action API - List Users & Edit Citizen Details
  await assert("GET /api/action?action=list_all_users", async () => {
    const req = new Request("http://localhost:3000/api/action?action=list_all_users&user_id=vandan11patel@gmail.com");
    const res = await getAction(req as any);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || "Failed list_all_users");
    if (!Array.isArray(data.users)) throw new Error("Users field is not an array");
  });

  await assert("POST /api/action (Reset and Seed Database to 6 Citizens)", async () => {
    const req = new Request("http://localhost:3000/api/action?user_id=vandan11patel@gmail.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_and_seed_database" })
    });
    const res = await postAction(req as any);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || "Failed reset_and_seed_database");
  });

  await assert("POST /api/action (Edit Citizen Vehicle & Budget)", async () => {
    const req = new Request("http://localhost:3000/api/action?user_id=vandan11patel@gmail.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "edit_person_details",
        target_user_id: "vandan11patel@gmail.com",
        family_id: "my_home",
        old_name: "Thakorbhai",
        new_name: "Thakorbhai",
        role: "father",
        vehicle: "car",
        budget: 250
      })
    });
    const res = await postAction(req as any);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || "Failed edit_person_details");
  });

  // TEST 9: Developer Debug API GET & POST
  await assert("GET /api/debug (Developer Roster & Vehicle Distribution)", async () => {
    const req = new Request("http://localhost:3000/api/debug");
    const res = await getDebug(req as any);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Failed GET /api/debug");
    if (!Array.isArray(data.citizens_roster)) throw new Error("citizens_roster is not an array");
  });

  await assert("POST /api/debug (Test Citizen Diagnostic Trace)", async () => {
    const req = new Request("http://localhost:3000/api/debug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "test_update_citizen",
        user_id: "vandan11patel@gmail.com",
        family_id: "my_home",
        old_name: "Thakorbhai",
        vehicle: "scooter",
        budget: 280
      })
    });
    const res = await postDebug(req as any);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Failed POST /api/debug");
    if (!Array.isArray(data.diagnostic_trace)) throw new Error("diagnostic_trace is not an array");
  });

  console.log("\n=================================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED | TOTAL ${passed + failed}`);
  console.log("=================================================================");

  if (failed > 0) process.exit(1);
}

runApiTests().catch(err => {
  console.error("Fatal Test Suite Failure:", err);
  process.exit(1);
});
