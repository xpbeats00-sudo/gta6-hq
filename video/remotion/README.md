# Remotion (optional second renderer)

**Not installed.** Nothing here has been run. The studio renders with its own Python and FFmpeg renderer (`python video/studio.py render`), which needs nothing installed. This folder is a prepared Remotion project for when React-based motion graphics are wanted.

## What installing does

- Downloads Remotion 4.0.543 and React into `video/remotion/node_modules` (a few hundred megabytes).
- At the first render, downloads Chrome Headless Shell into `node_modules/.remotion/`.
- Node 16 or newer is required; this machine has Node 24.15.

## Licence

Remotion is free for individuals and for companies of up to 3 people, including commercial use. Larger companies need a paid Company Licence. Source: https://www.remotion.dev/docs/license/pricing

## To install (only with the owner's approval)

```
cd video/remotion
npm install
npx remotion browser ensure
npx remotion render src/index.ts TitleCard out/title-card.mp4
```

Then check the file with the studio's own audit:

```
python video/studio.py audit studio-test --only technical --file video/remotion/out/title-card.mp4
```

## What is here

- `src/index.ts`, `src/Root.tsx`: registers three compositions (16:9, 9:16, 1:1).
- `src/TitleCard.tsx`: the title card in the app's look.

Source for the commands: https://www.remotion.dev/docs/brownfield and https://www.remotion.dev/docs/cli/render
