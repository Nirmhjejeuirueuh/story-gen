# StoryCraft AI - Personalized Children's Book SaaS Platform

An advanced, full-stack children's storybook platform designed to generate personalized stories and consistent character drawings from reference photos. Built with a highly clean, decoupled backend architecture following SOLID principles, paired with a modern React dashboard customizer.

---

## 🎨 Creative Architecture & Key Features

### 1. Robust Consistent Characters (No AI Model Training)
- **Problem**: Traditional image models fail to retain consistent facial structures and clothing between page drawings without complex and expensive custom LoRA training.
- **Solution**: StoryCraft AI creates an **AI standard Model Pose Sheet** (11 standardized poses: profiles, emotions, and actions). This sheet acts as a persistent drawing model. Page-by-page prompts are injected with references to specific pose profiles from the approved Character Sheet, ensuring clothing, hair, and facial proportions match across illustrations.

### 2. Standardized Poses Grid
- **Profiles**: Front, Left, Right, Back Views
- **Emotions**: Happy, Sad, Excited, Angry
- **Actions**: Running, Sitting, Jumping

### 3. Integrated Story Wizard (8 Steps)
1. **Photo Upload**: Drag-and-drop 3 to 10 photos of the child.
2. **Model Sheet Drafting**: Generates and inspects the 11 character poses.
3. **Choose Style**: Pixar, Disney, Classic Watercolor, Storybook, and more.
4. **Select Story**: Browse pre-configured themes or draft a custom script.
5. **Text & Script Drafting**: Generates a rich 8-page storyboard outline.
6. **Illustration Rendering**: Background queue drawing of final illustrations.
7. **Book Preview**: Flip through your completed hardback double-page spread.
8. **Print & Archive**: Download print-ready high-resolution landscape PDFs and ZIP collections of your illustration assets.

### 4. Fully Configurable Prompts (Administrative Config)
- Includes an administrative configuration board allowing users to dynamically customize and add story archetype scripts, age ranges, page counts, and base instruction prompts on-the-fly.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Framer Motion (`motion/react`)
- **Backend**: Node.js, Express, TypeScript, `tsx`
- **AI Core**: `@google/genai` (Server-Side proxying for secure key management)
- **Database**: Durable file-based JSON persistence engine (local repository pattern)
- **Queue Service**: Local asynchronous job workers (limits concurrent image loads)
- **Export Engines**: `jsPDF` for client-side PDF compilation, `JSZip` for photo archives.

---

## 🚀 Execution & Deployment Commands

### Development
Starts the combined full-stack Express server and integrated Vite HMR middleware:
```bash
npm run dev
```

### Production Build
Compiles frontend bundles and packs the Express entry point to a lightweight, Node-executable file:
```bash
npm run build
```

### Run Production
Launches the standalone application:
```bash
npm start
```
# story-gen
