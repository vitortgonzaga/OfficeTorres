# Vitor Gonzaga: the office

A portfolio you explore as a compact 3D office. Each object opens part of the work: the
MacBook is the about section, the pennant shows the stack, the corkboard has experience, the
shelf holds the main projects, the frames hold the degree, certification and research paper,
the monitor has a terminal and GitHub, and the curtain switches between day and night.

Built with Vite, React, TypeScript, Three.js and React Three Fiber. The whole office is
modeled in code, so it ships with no 3D model files.

## Run

```bash
npm install
npm run dev
```

`npm run build` writes a static site to `dist/`, which any static host can serve.

## Edit the content

- Projects: `src/content/projects.ts`
- About, experience, stack, contact and fun facts: `src/content/site.ts`
- Resume PDFs: `public/assets/curriculos` (listed in `RESUMES` in `site.ts`)
- Objects in the room: `src/scene/Office.tsx`
- Close-up camera for each object: `VIEWS` in `src/scene/OfficeCamera.tsx`

## Mobile and accessibility

The scene renders on demand, merges static geometry, bakes its shadow once and caps the
pixel ratio on phones. On upright phones the visitor stands inside the room and drags to look around.
Every object is also reachable from the navigation menu. Without
WebGL, or with `?2d` in the URL, the site falls back to a plain 2D page with the same
content. Reduced-motion preferences are respected.
