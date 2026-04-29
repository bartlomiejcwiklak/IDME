<p align="center">
  <img width="auto" height="180" alt="IDME Logo" src="https://github.com/user-attachments/assets/3083f82d-827a-4de9-a794-7678f3bea9f9" />
</p>

<p align="center">
  <strong>IDME (identify me)</strong> — A high-fidelity, real-time music guessing game powered by the iTunes API.
</p>

---

## 🎮 The Ultimate Music Challenge

**IDME** is not just another music quiz. It's a polished, interactive experience designed for music lovers who want to test their knowledge across genres, decades, and specific artist discographies.

### ✨ Key Features

- 🎵 **Live iTunes Integration**: Real-time access to millions of tracks with high-quality previews.
- 🌍 **Global & Regional Pools**: Choose between global hits or deep-dive into curated Polish music catalogs.
- 🎤 **Artist Fan Mode**: The ultimate test. Enter any artist's name to fetch their entire discography and prove you're a true fan.
- 📼 **Decades Journey**: Relive the hits from the **80s, 90s, 00s, and 10s**.
- 🎮 **Gaming OSTs**: Iconic soundtracks from legendary video games.
- 🌓 **Premium UI**: A stunning glassmorphism interface with native **Dark and Light mode** support.
- 📈 **Stats & Streaks**: Comprehensive tracking of your current streak, best streak, and total solved tracks.
- 🔊 **Immersive Sound**: Integrated sound effects and a smooth audio progress engine.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/IDME.git
   cd IDME
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

---

## 🛠️ Technical Overview

### Tech Stack
- **Core:** React 18 + TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS (Custom Design System)
- **State Management:** Custom React Hooks for Game Engine & Song Pooling
- **API Proxy:** Cloudflare Workers (handling iTunes API requests)

### How It Works
1. **Song Selection:** The game uses a sophisticated bias engine to prioritize curated "VIP" artists and classic tracks while maintaining a diverse pool.
2. **Real-time Search:** As you type, the game queries the iTunes API to provide instant suggestions with album artwork.
3. **Progressive Unlocking:** Each incorrect guess or skip unlocks more of the song preview, giving you a better chance to identify the track.