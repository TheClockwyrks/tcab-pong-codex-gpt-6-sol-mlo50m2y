# Carom

Carom is a browser paddle duel with spin, bank shots, a solo AI, and local two player play. Move as the ball meets your paddle to curve its flight, then use the two center obstacles to create tricky returns. The first side to reach 11 points with a two point lead wins.

## Run locally

```sh
npm ci
npm run dev
```

Open the address Vite prints. To build a static site, run `npm run build` and serve `dist/` from any static host. `npm run preview` serves the built version locally.

## Controls

| Action | Keys |
| --- | --- |
| Player one up / down | W / S |
| Player two up / down | Up / Down arrows |
| Choose / confirm | Enter or Space |
| Pause / resume | P or Escape |
| Mute | M |

In Solo, either paddle key pair moves player one. On menus, W/S and the arrow keys move the selection; a mouse or touch can select an item directly. Touch controls appear automatically on touch devices.

## Development checks

Run `npm run typecheck`, `npm run lint`, `npm run format`, and `npm test` to check the TypeScript, style, formatting, and simulation tests.
