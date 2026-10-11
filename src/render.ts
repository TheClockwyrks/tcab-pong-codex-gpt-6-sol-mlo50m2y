import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
import type { CaromState, Screen } from "./game";

const colors = {
  cyan: "#48e3f0",
  coral: "#ff718d",
  gold: "#ffd17a",
  ink: "#090e1e",
  white: "#eef7ff",
  quiet: "#9babc5",
};
const items = (screen: Screen): readonly string[] =>
  screen === "title"
    ? C.TITLE_ITEMS
    : screen === "paused"
      ? C.PAUSE_ITEMS
      : screen === "matchover"
        ? C.MATCHOVER_ITEMS
        : screen === "howto"
          ? ["BACK TO MENU"]
          : [];
export function menuItemRect(
  s: DeepReadonly<CaromState>,
  index: number,
): { x: number; y: number; w: number; h: number } | null {
  if (index < 0 || index >= items(s.screen).length) return null;
  const first =
    s.screen === "title"
      ? 398
      : s.screen === "howto"
        ? 578
        : s.screen === "paused"
          ? 332
          : 414;
  return { x: 456, y: first + index * 67, w: 368, h: 54 };
}
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = colors.white,
  weight = 600,
  align: CanvasTextAlign = "center",
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}
function menu(
  ctx: CanvasRenderingContext2D,
  s: DeepReadonly<CaromState>,
): void {
  items(s.screen).forEach((item, i) => {
    const r = menuItemRect(s, i);
    if (!r) return;
    const selected = i === s.menuIndex;
    rounded(ctx, r.x, r.y, r.w, r.h, 12, selected ? "#263e57" : "#151e32");
    if (selected) {
      rounded(ctx, r.x, r.y, 5, r.h, 2, colors.cyan);
      ctx.strokeStyle = "#4b8195";
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }
    label(
      ctx,
      item,
      r.x + r.w / 2,
      r.y + r.h / 2,
      19,
      selected ? colors.white : colors.quiet,
      700,
    );
  });
}
function field(
  ctx: CanvasRenderingContext2D,
  s: DeepReadonly<CaromState>,
): void {
  ctx.fillStyle = colors.ink;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  const glow = ctx.createRadialGradient(
    C.FIELD_CX,
    C.FIELD_CY,
    100,
    C.FIELD_CX,
    C.FIELD_CY,
    660,
  );
  glow.addColorStop(0, "#15243a");
  glow.addColorStop(1, colors.ink);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  ctx.strokeStyle = "#294159";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, C.FIELD_W - 48, C.FIELD_H - 48);
  ctx.setLineDash([10, 16]);
  ctx.strokeStyle = "#33516a";
  ctx.beginPath();
  ctx.moveTo(C.NET_X, 30);
  ctx.lineTo(C.NET_X, C.FIELD_H - 30);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#20344d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(C.FIELD_CX, C.FIELD_CY, 92, 0, Math.PI * 2);
  ctx.stroke();
  for (const o of s.obstacles) {
    ctx.shadowColor = colors.gold;
    ctx.shadowBlur = 20;
    rounded(
      ctx,
      o.cx - C.OBSTACLE_HW,
      o.cy - C.OBSTACLE_HH,
      C.OBSTACLE_W,
      C.OBSTACLE_HH * 2,
      8,
      colors.gold,
    );
    ctx.shadowBlur = 0;
  }
  for (const [side, p] of [
    ["left", s.paddles.left],
    ["right", s.paddles.right],
  ] as const) {
    const x = side === "left" ? C.P1_X0 : C.P2_X0;
    const color = side === "left" ? colors.cyan : colors.coral;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    rounded(ctx, x, p.cy - C.PADDLE_HALF, C.PADDLE_W, C.PADDLE_H, 8, color);
    ctx.shadowBlur = 0;
  }
  if (s.ball) {
    const b = s.ball;
    for (let i = 0; i < b.trail.length; i++) {
      const p = b.trail[i];
      const age = Math.max(0, 1 - (s.simTime - p.t) / C.TRAIL_TIME);
      ctx.globalAlpha = age * 0.42;
      ctx.fillStyle = colors.white;
      ctx.beginPath();
      ctx.arc(p.x, p.y, C.BALL_R * (0.35 + 0.5 * age), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = colors.white;
    ctx.shadowBlur = 22;
    ctx.fillStyle = colors.white;
    ctx.beginPath();
    ctx.arc(b.x, b.y, C.BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  if (s.screen !== "title" && s.screen !== "howto") {
    label(ctx, String(s.score.p1), 540, 78, 52, colors.cyan, 800);
    label(ctx, String(s.score.p2), 740, 78, 52, colors.coral, 800);
    label(
      ctx,
      s.mode === "solo" ? "SOLO  /  VS AI" : "VERSUS  /  LOCAL",
      C.FIELD_CX,
      125,
      13,
      colors.quiet,
      700,
    );
  }
  label(ctx, "W / S", 105, 690, 13, colors.cyan, 700);
  label(
    ctx,
    s.mode === "solo" ? "↑ / ↓  ALSO MOVE P1" : "↑ / ↓",
    1175,
    690,
    13,
    colors.coral,
    700,
  );
}
export function drawGame(
  s: DeepReadonly<CaromState>,
  ctx: CanvasRenderingContext2D,
): void {
  field(ctx, s);
  if (s.screen === "countdown") {
    label(ctx, "GET READY", C.FIELD_CX, 294, 26, colors.quiet, 700);
    label(
      ctx,
      String(Math.max(1, Math.ceil(s.ball?.holdTimer ?? 0))),
      C.FIELD_CX,
      365,
      68,
      colors.white,
      800,
    );
  }
  if (s.screen === "playing") {
    label(
      ctx,
      "P  PAUSE      •      M  MUTE",
      C.FIELD_CX,
      690,
      12,
      colors.quiet,
      600,
    );
  }
  if (
    s.screen === "title" ||
    s.screen === "howto" ||
    s.screen === "paused" ||
    s.screen === "matchover"
  ) {
    ctx.fillStyle = "rgba(5, 10, 25, .77)";
    ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
    if (s.screen === "title") {
      label(
        ctx,
        "A PADDLE DUEL IN MOTION",
        C.FIELD_CX,
        178,
        17,
        colors.cyan,
        700,
      );
      label(ctx, C.TITLE_TEXT, C.FIELD_CX, 260, 104, colors.white, 900);
      label(
        ctx,
        "SPIN THE SHOT. BANK THE ANGLE.",
        C.FIELD_CX,
        333,
        18,
        colors.quiet,
        600,
      );
      menu(ctx, s);
      label(
        ctx,
        "W / S OR ↑ / ↓ TO CHOOSE    •    ENTER TO SELECT",
        C.FIELD_CX,
        651,
        14,
        colors.quiet,
        600,
      );
    }
    if (s.screen === "howto") {
      label(ctx, "HOW TO PLAY", C.FIELD_CX, 105, 54, colors.white, 800);
      label(
        ctx,
        "FIRST TO 11 • WIN BY 2",
        C.FIELD_CX,
        161,
        19,
        colors.cyan,
        700,
      );
      label(
        ctx,
        "P1: W / S     •     P2: ↑ / ↓",
        C.FIELD_CX,
        238,
        24,
        colors.white,
      );
      label(
        ctx,
        "IN SOLO, EITHER SET OF KEYS MOVES P1",
        C.FIELD_CX,
        277,
        16,
        colors.quiet,
      );
      label(
        ctx,
        "Move your paddle as the ball hits to bend its flight.",
        C.FIELD_CX,
        353,
        21,
        colors.white,
      );
      label(
        ctx,
        "Bank shots around the gold obstacles to outplay your rival.",
        C.FIELD_CX,
        396,
        21,
        colors.white,
      );
      label(
        ctx,
        "P or ESC pauses   •   M toggles sound",
        C.FIELD_CX,
        475,
        17,
        colors.quiet,
      );
      menu(ctx, s);
    }
    if (s.screen === "paused") {
      label(ctx, "PAUSED", C.FIELD_CX, 202, 64, colors.white, 800);
      label(ctx, "THE RALLY WAITS FOR YOU", C.FIELD_CX, 265, 16, colors.quiet);
      menu(ctx, s);
    }
    if (s.screen === "matchover") {
      label(ctx, "MATCH POINT", C.FIELD_CX, 168, 18, colors.gold, 700);
      label(
        ctx,
        s.winner === "left" ? "PLAYER ONE WINS" : "PLAYER TWO WINS",
        C.FIELD_CX,
        235,
        56,
        colors.white,
        800,
      );
      label(
        ctx,
        `${s.score.p1}  :  ${s.score.p2}`,
        C.FIELD_CX,
        317,
        42,
        colors.cyan,
        800,
      );
      menu(ctx, s);
    }
  }
}
