# Branchline demo video

This is the finished Remotion source for the Branchline OpenAI Build Week demo.
It renders a **1:15** product-first, narrated 1080p story using real screens
captured from the local Branchline application.

## Render locally

```powershell
cd demo-video
npm install
npm run render
```

`npm run render` creates an offline Windows narration WAV and an original
pulse bed, then writes the final H.264 MP4 to
`out/branchline-demo.mp4`. Generated audio and render output are intentionally
ignored by Git. On non-Windows systems, provide a replacement
`public/narration.wav` before running the Remotion render command.

## What the story proves

1. A real Git contract change becomes an evidence map.
2. The same evidence drives deterministic release rehearsal and path comparison.
3. The Release Council validates specialist conclusions against one immutable
   evidence packet, while a human records the accountable decision.
4. Portable policy gates and the read-only MCP server move that evidence into CI
   and coding-agent harnesses.

The four images under `public/screens/` are representative captures from the
working local application, not fabricated product mockups.

## Quality checks

```powershell
npm run lint
npx remotion still BranchlineDemo out/frame-check.jpg --frame=3350
npm run render
```

The final render is designed for a 1920×1080 H.264 MP4 with a stereo AAC audio
track and a 75-second duration, safely below the three-minute limit.
