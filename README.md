# ⛏️ Idle Wall Destroyer

An addictive, visually rich incremental idle browser game built with React, Vite, Canvas API, Web Audio API, and Tailwind CSS.

---

## 🎮 How to Play

- **Tap to Break Walls:** Click/tap anywhere on the central wall to deal damage and collect coins & gems.
- **Equip Arsenal Pickaxes:** Open the **Smash Arsenal** tab or use the **Quick Tool Dock** at the bottom of the screen to select and equip your pickaxes/tools.
- **Automated Drones & Helpers:** Hire Steam Golems, Shatter Drones, and Chronos Lasers to deal passive continuous DPS.
- **Multipliers & Upgrades:** Upgrade Sledge Power, Weak Spot Scan (Crits), and Salvage Operations.
- **Worlds & Rebirth:** Progress through multiple worlds or trigger **Quantum Rebirth (Prestige)** for permanent DPS multipliers.

---

## 🚀 Setup & Host on GitHub / GitHub Pages

### 1. Exporting to GitHub from AI Studio
1. Open the **Settings / Export** menu in AI Studio (top-right gear icon).
2. Choose **Export to GitHub** (or download as ZIP and push to a new GitHub repository).

### 2. Automatic GitHub Pages Deployment
This repository includes a pre-configured GitHub Actions workflow in `.github/workflows/deploy.yml`.

To host the game on **GitHub Pages**:
1. Go to your repository on GitHub.
2. Click on **Settings** > **Pages**.
3. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
4. Push your code to the `main` or `master` branch.
5. GitHub will automatically build the app and deploy it live at:
   `https://<your-username>.github.io/<your-repository-name>/`

---

## 💻 Local Development

Run the game locally on your computer:

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build
```

Open `http://localhost:3000` in your browser.
