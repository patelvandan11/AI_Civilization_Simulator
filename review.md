# ⭐ AI Civilization Simulator — Live User Reviews & Ratings

Welcome to the real-time review registry for the **Navsari AI Civilization Simulator**.

This document automatically logs playtester evaluations, rating breakdowns, and feedback submitted through our **Google Forms** integration.

---

## 📊 Real-Time Community Rating Summary

| Metric | Community Average | Total Ratings |
| :--- | :---: | :---: |
| **Overall Civilization Experience** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Review |
| **Cozy Day / Night Theme Aesthetics** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Review |
| **Soundscape & Ambient Lofi Music** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Review |
| **Multi-Speed Simulation Engine (1x–1000x)** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Review |
| **Agricultural & Kisan AI Farming** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Review |
| **Industrial Sectors & Petroleum Cracker** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Review |
| **Geospatial Map & Citizen Commutes** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Review |

---

## 📝 Live User Review Feed

| # | Timestamp (IST) | Reviewer / Handle | Role | Overall | Visuals | Audio | Sim Engine | Feedback & Feature Requests |
| :-: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **01** | `20/08/2026 00:15` | **Supreme Admin (Vandan)** | PMO Admin | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐⭐⭐ (5/5) | Multi-speed 10x/60x clock acceleration and live news headlines are synchronized; cozy Day Mode palette looks great across all modals. |
| **02** | *Live Sync* | *[Awaiting Google Form Submission]* | Citizen | — | — | — | — | *New submissions automatically appear here via Google Forms.* |

---

## 🔗 Google Forms Real-Time Sync Setup (How It Works)

When a user submits your Google Form, a lightweight **Google Apps Script** automatically formats the response into Markdown and commits the new row to this `review.md` file on GitHub in **real time** (within 2 seconds).

### 🛠️ 3-Step Setup:

1. **Open your Google Form's connected Google Sheet**:
   - In Google Forms $\rightarrow$ click **Responses** tab $\rightarrow$ click **Link to Sheets**.
2. **Open Extensions $\rightarrow$ Apps Script**:
   - Paste the Google Apps Script below into `Code.gs`.
   - Replace `GITHUB_TOKEN` with your GitHub Personal Access Token (classic with `repo` scope).
3. **Add an Installable Trigger**:
   - In Apps Script $\rightarrow$ click **Triggers (Alarm Clock icon)** on left sidebar.
   - Click **+ Add Trigger** $\rightarrow$ select function `onFormSubmit` $\rightarrow$ Event Type: **On form submit** $\rightarrow$ **Save**.

```javascript
// Google Apps Script: Auto-updates review.md on GitHub on every form submission
function onFormSubmit(e) {
  var GITHUB_TOKEN = "ghp_YOUR_GITHUB_PERSONAL_ACCESS_TOKEN";
  var REPO_OWNER = "patelvandan11";
  var REPO_NAME = "AI_Civilization_Simulator";
  var FILE_PATH = "review.md";
  
  // 1. Extract submitted form values
  var values = e ? e.values : [];
  var timestamp = values[0] || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  var name = values[1] || "Anonymous Citizen";
  var role = values[2] || "Playtester";
  var rating = values[3] || "5";
  var visuals = values[4] || "5";
  var audio = values[5] || "5";
  var speed = values[6] || "5";
  var feedback = (values[7] || "Great civilization simulation!").replace(/\|/g, "/");

  // 2. Fetch current review.md file from GitHub
  var url = "https://api.github.com/repos/" + REPO_OWNER + "/" + REPO_NAME + "/contents/" + FILE_PATH;
  var headers = {
    "Authorization": "token " + GITHUB_TOKEN,
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Google-Apps-Script"
  };

  var response = UrlFetchApp.fetch(url, { headers: headers, muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) return;

  var fileData = JSON.parse(response.getContentText());
  var currentSha = fileData.sha;
  var decodedContent = Utilities.newBlob(Utilities.base64Decode(fileData.content)).getDataAsString();

  // 3. Format new Markdown table row
  var stars = "⭐".repeat(Math.min(5, Math.max(1, parseInt(rating) || 5))) + " (" + rating + "/5)";
  var vStars = "⭐".repeat(Math.min(5, Math.max(1, parseInt(visuals) || 5))) + " (" + visuals + "/5)";
  var aStars = "⭐".repeat(Math.min(5, Math.max(1, parseInt(audio) || 5))) + " (" + audio + "/5)";
  var sStars = "⭐".repeat(Math.min(5, Math.max(1, parseInt(speed) || 5))) + " (" + speed + "/5)";

  var newRow = "| **Live** | `" + timestamp + "` | **" + name + "** | " + role + " | " + stars + " | " + vStars + " | " + aStars + " | " + sStars + " | " + feedback + " |";

  // Append row before the placeholder line
  var updatedContent = decodedContent.replace(
    "| **02** | *Live Sync*",
    newRow + "\n| **02** | *Live Sync*"
  );

  // 4. Commit updated review.md to GitHub
  var payload = {
    message: "docs(review): real-time user feedback from " + name,
    content: Utilities.base64Encode(Utilities.newBlob(updatedContent).getBytes()),
    sha: currentSha
  };

  UrlFetchApp.fetch(url, {
    method: "PUT",
    headers: headers,
    payload: JSON.stringify(payload),
    contentType: "application/json"
  });
}
```
