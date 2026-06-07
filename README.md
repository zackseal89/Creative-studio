<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />

# Studio.Agent: Creative Studio Agentic App

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Built with Gemini](https://img.shields.io/badge/Built%20with-Gemini-blue?logo=google-gemini)](https://ai.google.dev/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-blue?logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12-orange?logo=firebase)](https://firebase.google.com/)

</div>

Studio.Agent is an elite, agentic content workspace designed for modern creators. It leverages the power of Gemini 3.5 Flash with real-time Google Search grounding to transform simple topics into high-retention, production-ready video scripts and multimedia assets.

**View your app in AI Studio:** [https://ai.studio/apps/86b8dd93-b488-4de0-b231-407b96162bd7](https://ai.studio/apps/86b8dd93-b488-4de0-b231-407b96162bd7)

---

## 🚀 Key Features

### 1. Grounded Research Engine
Forget generic AI hallucinations. Studio.Agent uses Gemini's **Google Search grounding** to identify 5 trending facts/statistics and 3 high-impact "hooks" for any given topic, ensuring your content is rooted in real-time data.

### 2. Modular Storyboard Planner
The system automatically synthesizes research into a strategic 3-part content plan. Each milestone includes detailed narrative goals and visual cues, providing a rock-solid blueprint before a single word of the script is written.

### 3. High-Retention Scriptwriter
Generates full Markdown screenplays with production-ready visual directions. Choose between **Aggressive/Viral**, **Informative/Documentary**, or **Casual/Vlog** tones. Every script includes a hook, bridge, core modules, CTA, and a seamless loop for maximum watch time.

### 4. Audio Orchestrator & SFX Synth
A built-in Web Audio composition engine featuring:
- **Interactive Step Sequencer**: 4-track (Kick, Snare, Hi-Hat, Bass) drum machine.
- **AI Music Pilot**: Describe a vibe (e.g., "Dark tech noir tension"), and the AI configures the synthesizer parameters and beat patterns for you.
- **Cinematic SFX**: Synthesize risers, swooshes, and bass drops on demand.

### 5. Vision Analyst
Upload storyboard sketches or reference images. The multimodal Vision Analyst deconstructs lighting, composition, and style to generate exceptionally detailed image generation prompts for Midjourney, DALL-E, or Imagen.

### 6. Creator Core Copilot
An integrated AI administrator that understands your workspace context. It can:
- Execute UI commands (e.g., "Start research on Space Tourism").
- Brainstorm viral topics and hooks.
- Directly update your script or switch between modules.

---

## 🛠 Technical Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Motion.
- **Backend**: Node.js (Express), TypeScript (tsx).
- **AI Models**:
    - `gemini-3.5-flash` (Research, Planning, Scripting, Vision, Music Orchestration).
    - `gemini-3.1-flash-tts-preview` (Text-to-Speech).
- **Infrastructure**: Firebase (Firestore for project persistence, Google Auth for session management).

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- A Google AI Studio API Key ([Get one here](https://aistudio.google.com/app/apikey))

### 1. Clone & Install
```bash
git clone <repo-url>
cd creative-studio-agent
npm install
```

### 2. Configure Environment
Create a `.env.local` file in the root directory (referencing `.env.example`):
```env
GEMINI_API_KEY=your_api_key_here
```

### 3. Firebase Setup (Optional for Persistence)
The app is pre-configured for a default Firebase project. To use your own:
- Update `firebase-applet-config.json` with your credentials.
- Ensure Firestore rules allow read/write for authenticated users (see `firestore.rules`).

### 4. Run Locally
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

---

## 🔄 How It Works: The Agentic Workflow

1.  **Phase 1: Brief Setup**: Enter your target topic. The **Research Agent** queries the live web for trending signals.
2.  **Phase 2: Storyboard**: The **Strategist Agent** builds a 3-part structural outline based on the research.
3.  **Phase 3: Screenplay**: The **Writer Agent** compiles everything into a high-retention script with cinematic b-roll directives.
4.  **Creative Labs**: Use the **Audio** and **Vision** modules to design the soundtrack and visual style for your production.

---

## 📦 Deployment

### Google AI Studio Applet
This repository is structured as an AI Studio Applet.
- `metadata.json`: Defines app capabilities and permissions.
- `firebase-applet-config.json`: Handles identity and persistence within the AI Studio frame.

### Production Build
To generate a production-ready bundle:
```bash
npm run build
npm start
```

---

## 📄 License
SPDX-License-Identifier: Apache-2.0
