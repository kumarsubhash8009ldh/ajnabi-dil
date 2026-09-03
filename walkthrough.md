# Walkthrough: Updated Call Rates (Video: 8 Coins/min, Voice: 5 Coins/min)

Call billing rates and UI tags across all calling surfaces, profile configurations, and wallet deduction loops have been updated to the user's exact specification:
- **📹 Video Call**: **8 Coins / Minute**
- **📞 Voice Call**: **5 Coins / Minute**

---

## What Was Updated

### 1. ⚙️ Backend Database & Default Rates (`db.js` & `server.js`)
- `normalizeUser` default values updated:
  - `callRate`: **5**
  - `voiceCallRate`: **5** (coins per minute)
  - `videoCallRate`: **8** (coins per minute)
- New user registration and guest user creation default to 5 coins/min for voice and 8 coins/min for video.
- Welcome earnings message updated:
  `"...earn up to 70% revenue share on Voice Calls (5 coins/min), Video Calls (8 coins/min)..."`

### 2. ⏱️ Call Billing Deduction Loop (1-Minute Intervals)
- **`Calls.jsx`**:
  - `rate = callState.type === 'video' ? 8 : 5`
  - Periodic deduction interval set to `60000ms` (60 seconds / 1 minute).
  - Minimum coins required to initiate call: 8 coins for Video, 5 coins for Voice.
  - User cards updated with `📞 5c/min` and `📹 8c/min` badges.
- **`DMChat.jsx`**:
  - Active call deduction interval set to `60000ms` with 8 coins/min for Video and 5 coins/min for Voice.
  - Action button tooltips updated: `Voice Call (5 coins / min)` and `Video Call (8 coins / min)`.
- **`Feed.jsx`**:
  - Direct call buttons updated to 5 coins/min (Voice) and 8 coins/min (Video) with 60-second billing intervals.
- **`CallScreen.jsx`**:
  - Rate display updated: `🪙 Rate: 8c / min` (Video) and `5c / min` (Voice).
- **`Profile.jsx`**:
  - Custom calling rate controls updated with labels `📞 Voice Call (Coins/min)` (default 5) and `📹 Video Call (Coins/min)` (default 8).

---

## Verification & Build Results

1. **Automated Verification**:
   - `testUser.voiceCallRate === 5` -> **PASS**
   - `testUser.videoCallRate === 8` -> **PASS**

2. **Frontend Production Build**:
   ```bash
   cmd /c "npm run build"
   ✓ 1562 modules transformed.
   dist/index.html  702.78 kB │ gzip: 167.82 kB
   ✓ built in 10.56s
   ```
   *Result:* **PASS (Exit code 0)**

3. **Android APK Asset Sync**:
   - `copy /y frontend\dist\index.html apk_project\assets\index.html`
   *Result:* **PASS**

4. **Live Server Status**:
   - Local: `http://localhost:5000`
   - Public Worldwide Tunnel: `https://develop-midi-even-belts.trycloudflare.com`
