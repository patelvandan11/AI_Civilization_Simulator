# ⭐ AI Civilization Simulator — Live User Reviews & Ratings

Welcome to the real-time community review hub for the **Navsari AI Civilization Simulator**.

> ### 📢 Submit Your Review / Feedback
> **Share your experience, ratings, and feature suggestions via our official Google Form:**  
> 👉 **[Submit Your Review on Google Forms (https://forms.gle/1fZbiLkoaL3jP1fW9)](https://forms.gle/1fZbiLkoaL3jP1fW9)** 👈

---

## 📊 Community Rating Overview

| Evaluation Metric | Community Average | Total Reviews |
| :--- | :---: | :---: |
| **Overall Civilization Experience** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Verified Review |
| **Cozy Day / Night Theme Aesthetics** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Verified Review |
| **Soundscape & Ambient Lofi Music** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Verified Review |
| **Multi-Speed Simulation Engine (1x–1000x)** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Verified Review |
| **Agricultural & Kisan AI Farming** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Verified Review |
| **Industrial Sectors & Petroleum Cracker** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Verified Review |
| **Geospatial Map & Citizen Commutes** | ⭐⭐⭐⭐⭐ **5.0 / 5.0** | 1 Verified Review |

---

## 📝 Verified Live User Reviews

| # | Timestamp (IST) | Reviewer / Handle | Role | Overall | Visuals | Audio | Sim Engine | Feedback & Suggestions |
| :-: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **01** | `20/08/2026 00:15` | **Supreme Admin (Vandan)** | PMO Admin | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐⭐⭐ (5/5) | Multi-speed 10x/60x clock acceleration and live news headlines are synchronized; cozy Day Mode palette looks great across all modals. |
| **02** | *Live Sync* | *[Awaiting Google Form Submission]* | Citizen / Playtester | — | — | — | — | *Submissions from [Google Form](https://forms.gle/1fZbiLkoaL3jP1fW9) automatically appear here.* |

---

## 🔗 Real-Time Google Forms $\rightarrow$ `review.md` Sync Script

To enable automatic instant updates to this file whenever someone fills out **[https://forms.gle/1fZbiLkoaL3jP1fW9](https://forms.gle/1fZbiLkoaL3jP1fW9)**:

### 🛠️ Quick 2-Minute Setup:

1. Open your **Google Form** $\rightarrow$ go to **Responses** tab $\rightarrow$ click **Link to Sheets** (creates your responses Google Sheet).
2. In the Google Sheet, click **Extensions** $\rightarrow$ **Apps Script**.
3. Replace the script code with:

```javascript
// Google Apps Script: Commits new form responses directly to review.md on GitHub
function onFormSubmit(e) {
  var GITHUB_TOKEN = "ghp_YOUR_GITHUB_PERSONAL_ACCESS_TOKEN"; // Replace with your GitHub Token
  var REPO_OWNER = "patelvandan11";
  var REPO_NAME = "AI_Civilization_Simulator";
  var FILE_PATH = "review.md";
  
  // 1. Read submitted Google Form fields
  var values = e ? e.values : [];
  var timestamp = values[0] || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  var name = values[1] || "Anonymous Citizen";
  var role = values[2] || "Playtester";
  var rating = values[3] || "5";
  var visuals = values[4] || "5";
  var audio = values[5] || "5";
  var speed = values[6] || "5";
  var feedback = (values[7] || "Great civilization simulation!").replace(/\|/g, "/");

  // 2. Fetch current review.md from GitHub
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

  // 3. Format into Markdown table row
  var stars = "⭐".repeat(Math.min(5, Math.max(1, parseInt(rating) || 5))) + " (" + rating + "/5)";
  var vStars = "⭐".repeat(Math.min(5, Math.max(1, parseInt(visuals) || 5))) + " (" + visuals + "/5)";
  var aStars = "⭐".repeat(Math.min(5, Math.max(1, parseInt(audio) || 5))) + " (" + audio + "/5)";
  var sStars = "⭐".repeat(Math.min(5, Math.max(1, parseInt(speed) || 5))) + " (" + speed + "/5)";

  var newRow = "| **Live** | `" + timestamp + "` | **" + name + "** | " + role + " | " + stars + " | " + vStars + " | " + aStars + " | " + sStars + " | " + feedback + " |";

  var updatedContent = decodedContent.replace(
    "| **02** | *Live Sync*",
    newRow + "\n| **02** | *Live Sync*"
  );

  // 4. Commit updated review.md to GitHub repository
  var payload = {
    message: "docs(review): new live review submitted by " + name,
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

4. Click the **Triggers (Alarm Clock ⏰ icon)** on the left $\rightarrow$ **+ Add Trigger** $\rightarrow$ set Event Type to **On form submit** $\rightarrow$ **Save**.

---

### 🧭 Navigation & Documentation Index
- 📖 [Main Project Readme](Readme.MD)
- 🔄 [System Workflows](workflow.md)
- 🏗️ [System Design & Architecture](system_design.md)
- 🛠️ [Scripts & Tooling Reference](scripts.md)
- 🌍 [Overall Working Master Guide](overall_working.md)
- 📝 [Playtester Evaluation Form](form.md)



---

## 🏛️ Citizen Feedback

**📅 Submitted:** `20/08/2026 01:20:53`  
**👤 Citizen:** Vandan Patel  
**📧 Email:** vandan120ptl@gmail.com  
**📋 Feedback Type:** 🐛 Bug Report  
**⭐ Experience Rating:** ⭐⭐⭐⭐⭐ (5/5)



---

## 🏛️ Citizen Feedback

**📅 Submitted:** `20/08/2026 01:21:58`  
**👤 Citizen:**   
**📧 Email:** anfoangoew@gmail.com  
**📋 Feedback Type:**   
**⭐ Experience Rating:** ⭐⭐⭐⭐⭐ (5/5)

