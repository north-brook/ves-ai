Here’s your Bold Startup style guide converted into an organized Markdown file, updated to specify Lucide Icons for the iconography section.

⸻

# VES Brand Style Guide — Bold Startup Direction

## 1. Brand Personality

- **Tone:** Energetic, confident, and action-driven.
- **Voice:** Clear, direct, and slightly provocative.
- **Emphasis:** Speed to value, cutting-edge AI, delivering real product wins.
- **Target Vibe:** Feels like a modern SaaS startup with product-led growth energy — a little playful but still credible to serious teams.

---

## 2. Color Palette

### Dark Mode (Default)

- **Background:** `#0A0A0A` (near black)
- **Surface:** `#141414` (elevated surfaces)
- **Text Primary:** `#FFFFFF` (white)
- **Text Secondary:** `rgba(255, 255, 255, 0.7)` (70% white)
- **Text Muted:** `rgba(255, 255, 255, 0.4)` (40% white)
- **Border:** `rgba(255, 255, 255, 0.1)` (10% white)

### Light Mode

- **Background:** `#FFFFFF` (white)
- **Surface:** `#F8F8F8` (light gray)
- **Text Primary:** `#0A0A0A` (near black)
- **Text Secondary:** `rgba(10, 10, 10, 0.7)` (70% black)
- **Text Muted:** `rgba(10, 10, 10, 0.4)` (40% black)
- **Border:** `rgba(10, 10, 10, 0.1)` (10% black)

### Accent Colors (Both Modes)

- **Accent Purple:** `#6C47FF` (vivid purple)
- **Accent Pink:** `#FF4D94` (hot pink)
- **Accent Orange:** `#FF8A3D` (warm orange)

**Gradient Example:**

```css
background: linear-gradient(90deg, #6c47ff 0%, #ff4d94 50%, #ff8a3d 100%);
```

⸻

## 3. Typography

### Headings (Display)

- **Font:** Space Grotesk (Bold)
- **Weight:** 700
- **Size Range:** 32px (H3) → 64px (H1)
- **Case:** Sentence case (avoid ALL CAPS except small labels)

### Body Text

- **Font:** Inter (Regular, Medium)
- **Weight:** 400 for normal, 500 for emphasis
- **Size:** 16px–18px
- **Line Height:** 150%

### CTA Buttons

- **Font:** Space Grotesk Medium, uppercase
- **Size:** 16px
- **Color:** White text on gradient background

---

## 4. Logo Usage

### Primary Logo

- Gradient logomark (abstract "V" or AI waveform) + VES wordmark in Space Grotesk Bold
- Place on white or very dark backgrounds only
- Maintain clear space equal to height of "V"

### Monochrome Versions

- Black on light backgrounds
- White on dark backgrounds

---

## 5. Imagery & Graphics

### Photography

- High-energy, tech-forward imagery (screens with product dashboards, motion blur effects)
- Avoid generic stock photos of people in offices
- Use blurred/abstract motion backgrounds to evoke "AI processing"

### Illustrations

- Flat vector shapes with gradient fills
- Use to highlight key concepts: session replay screens, Linear tickets, AI "eye" icons, flow diagrams

### Product Screenshots

- Full-width with rounded corners (12–16px radius)
- Annotated with arrows & short 2–3 word callouts
- Drop shadows for depth

---

## 6. Iconography (Lucide Icons)

- Use Lucide Icons for all UI and marketing illustrations
- **Style:**
  - Simple line icons
  - Slightly rounded ends
  - Consistent stroke weight (~2px)
  - Apply gradient fills for key icons (e.g., bug, lightbulb, activity)
- **Example Lucide icons for VES:**
  - Eye for "watch sessions"
  - Bug for bug detection
  - Lightbulb for feature ideas
  - Activity for UX friction points
  - ListChecks for backlog tickets

---

## 7. Buttons & UI Elements

### Primary CTA Button (High Contrast)

```css
/* Gradient border with light fill for better contrast */
position: relative;
background: linear-gradient(90deg, #6c47ff 0%, #ff4d94 50%, #ff8a3d 100%);
padding: 2px; /* Border width */
border-radius: 8px;

/* Inner content */
&::after {
  content: '';
  position: absolute;
  inset: 2px;
  background: rgba(255, 255, 255, 0.9); /* Light mode */
  background: rgba(0, 0, 0, 0.9); /* Dark mode */
  border-radius: 6px;
}

/* Text styling */
color: #6c47ff; /* Light mode - use gradient color */
color: #ffffff; /* Dark mode - white text */
font-family: "Space Grotesk", sans-serif;
font-weight: 600;
padding: 14px 28px;
```

### Secondary Button

```css
/* Clean outline style */
border: 1px solid var(--border);
background: #ffffff; /* Light mode - white fill */
background: #0a0a0a; /* Dark mode - black fill */
color: var(--foreground);
font-family: "Inter", sans-serif;
font-weight: 500;
border-radius: 8px;
padding: 10px 24px;

/* Hover state */
&:hover {
  background: #f8f8f8; /* Light mode - subtle gray */
  background: #141414; /* Dark mode - slightly lighter */
}
```

---

## 8. Motion & Animation

- Micro-interactions: Button hover = slight scale (1.02) & gradient shift
- Hero animation: Loop of session replays → AI "scan" overlay → tickets dropping into Linear
- Scroll reveal: Fade & slide up elements on viewport entry

---

## 9. Tone in Copy

### Headlines: Action-driven, benefit-focused

- "Use AI to watch every session and suggest product improvements"
- "Ship better features, faster"
- "Catch every bug before your users complain"

### Body: Short, confident, plainspoken

- Avoid meaningless buzzwords
- Use present tense, active voice

---

## 10. Example Application

### Hero Section

- Dark background (#0A0A0A)
- Large Space Grotesk headline in white
- Subhead in Inter Regular, 18px, light gray #D0D0D0
- Gradient CTA button centered
- Looping product demo video in the background with 40% opacity overlay
