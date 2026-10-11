import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
import { drawGame, menuItemRect } from "./render";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly simTime: number;
  readonly muted: boolean;
  readonly menuPress: readonly {
    readonly id: number;
    readonly index: number;
  }[];
}
export interface CaromDebugApi {
  readonly version: number;
  clearWorld(s: DeepReadonly<CaromState>): CaromState;
  spawnBall(s: DeepReadonly<CaromState>): CaromState;
  spawnObstacle(s: DeepReadonly<CaromState>, index: number): CaromState;
  reset(s: DeepReadonly<CaromState>): CaromState;
  reconcile(s: DeepReadonly<CaromState>): CaromState;
  setScreen(s: DeepReadonly<CaromState>, screen: Screen): CaromState;
  setMode(s: DeepReadonly<CaromState>, mode: Mode): CaromState;
  setMenuIndex(s: DeepReadonly<CaromState>, index: number): CaromState;
  setTitleIndex(s: DeepReadonly<CaromState>, index: number): CaromState;
  setResumeScreen(
    s: DeepReadonly<CaromState>,
    screen: "countdown" | "playing",
  ): CaromState;
  setScore(s: DeepReadonly<CaromState>, p1: number, p2: number): CaromState;
  setWinner(s: DeepReadonly<CaromState>, side: Side | null): CaromState;
  setReceiver(s: DeepReadonly<CaromState>, side: Side): CaromState;
  setPaddleCy(s: DeepReadonly<CaromState>, side: Side, cy: number): CaromState;
  setPaddleVy(s: DeepReadonly<CaromState>, side: Side, vy: number): CaromState;
  setPaddleDriven(
    s: DeepReadonly<CaromState>,
    side: Side,
    driven: boolean,
  ): CaromState;
  setBallPosition(
    s: DeepReadonly<CaromState>,
    x: number,
    y: number,
  ): CaromState;
  setBallVelocity(
    s: DeepReadonly<CaromState>,
    vx: number,
    vy: number,
  ): CaromState;
  setBallSpin(s: DeepReadonly<CaromState>, spin: number): CaromState;
  setBallHeld(s: DeepReadonly<CaromState>, held: boolean): CaromState;
  setBallHoldTimer(s: DeepReadonly<CaromState>, seconds: number): CaromState;
  setBallServeSign(s: DeepReadonly<CaromState>, sign: 1 | -1): CaromState;
  drawBallServeSign(s: DeepReadonly<CaromState>): CaromState;
  setAiTracking(s: DeepReadonly<CaromState>, enabled: boolean): CaromState;
  setAiMovement(s: DeepReadonly<CaromState>, enabled: boolean): CaromState;
  setMuted(s: DeepReadonly<CaromState>, muted: boolean): CaromState;
  snapshot(s: DeepReadonly<CaromState>): Omit<
    CaromState,
    "menuPress" | "ball"
  > & {
    readonly version: number;
    readonly ball: (BallState & { readonly speed: number }) | null;
  };
  menuItemRect(
    s: DeepReadonly<CaromState>,
    index: number,
  ): { x: number; y: number; w: number; h: number } | null;
}
export const BACKGROUND = "#090e1e";
const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));
const sign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
const park = (): BallState => ({
  x: C.FIELD_CX,
  y: C.FIELD_CY,
  vx: 0,
  vy: 0,
  spin: 0,
  held: true,
  holdTimer: C.HOLD_TIME,
  serveSign: sign(),
  trail: [],
});
const paddle = (): PaddleState => ({
  cy: C.FIELD_CY,
  vy: 0,
  driven: false,
  drivenVy: 0,
});
const obstacles = (): ObstacleState[] =>
  C.OBSTACLE_CENTERS.map((p, index) => ({ index, cx: p.x, cy: p.y }));
const fresh = (muted: boolean, titleIndex = 0, simTime = 0): CaromState => ({
  screen: "title",
  mode: "solo",
  menuIndex: titleIndex,
  titleIndex,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  paddles: { left: paddle(), right: paddle() },
  ai: { tracking: true, movement: true },
  receiver: "left",
  ball: park(),
  obstacles: obstacles(),
  simTime,
  muted,
  menuPress: [],
});
const start = (s: DeepReadonly<CaromState>, mode: Mode): CaromState => ({
  ...s,
  screen: "countdown",
  mode,
  menuIndex: 0,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  receiver: "left",
  ball: park(),
  paddles: {
    left: { ...s.paddles.left, cy: C.FIELD_CY, vy: 0 },
    right: { ...s.paddles.right, cy: C.FIELD_CY, vy: 0 },
  },
  menuPress: [],
});
const copy = (s: DeepReadonly<CaromState>): CaromState => ({ ...s });
const requireBall = (s: DeepReadonly<CaromState>): BallState => {
  if (!s.ball) throw new Error("Carom: no ball");
  return s.ball;
};
const ballPose = (
  s: DeepReadonly<CaromState>,
  fields: Partial<BallState>,
): CaromState => ({ ...s, ball: { ...requireBall(s), ...fields } });
const paddlePose = (
  s: DeepReadonly<CaromState>,
  side: Side,
  fields: Partial<PaddleState>,
): CaromState => ({
  ...s,
  paddles: { ...s.paddles, [side]: { ...s.paddles[side], ...fields } },
});
const debug: CaromDebugApi = {
  version: C.CAROM_DEBUG_VERSION,
  clearWorld: (s) => ({ ...s, ball: null, obstacles: [] }),
  spawnBall: (s) => ({ ...s, ball: park() }),
  spawnObstacle: (s, index) => {
    const p = C.OBSTACLE_CENTERS[index];
    if (!p) throw new Error("Carom: invalid obstacle");
    return {
      ...s,
      obstacles: [
        ...s.obstacles.filter((o) => o.index !== index),
        { index, cx: p.x, cy: p.y },
      ].sort((a, b) => a.index - b.index),
    };
  },
  reset: (s) => fresh(s.muted),
  reconcile: (s) => copy(s),
  setScreen: (s, screen) => ({ ...s, screen }),
  setMode: (s, mode) => ({ ...s, mode }),
  setMenuIndex: (s, menuIndex) => ({ ...s, menuIndex }),
  setTitleIndex: (s, titleIndex) => ({ ...s, titleIndex }),
  setResumeScreen: (s, resumeScreen) => ({ ...s, resumeScreen }),
  setScore: (s, p1, p2) => ({ ...s, score: { p1, p2 } }),
  setWinner: (s, winner) => ({ ...s, winner }),
  setReceiver: (s, receiver) => ({ ...s, receiver }),
  setPaddleCy: (s, side, cy) => paddlePose(s, side, { cy }),
  setPaddleVy: (s, side, drivenVy) => paddlePose(s, side, { drivenVy }),
  setPaddleDriven: (s, side, driven) => paddlePose(s, side, { driven }),
  setBallPosition: (s, x, y) => ballPose(s, { x, y }),
  setBallVelocity: (s, vx, vy) => ballPose(s, { vx, vy }),
  setBallSpin: (s, spin) => ballPose(s, { spin }),
  setBallHeld: (s, held) => ballPose(s, { held }),
  setBallHoldTimer: (s, holdTimer) => ballPose(s, { holdTimer }),
  setBallServeSign: (s, serveSign) => ballPose(s, { serveSign }),
  drawBallServeSign: (s) => ballPose(s, { serveSign: sign() }),
  setAiTracking: (s, tracking) => ({ ...s, ai: { ...s.ai, tracking } }),
  setAiMovement: (s, movement) => ({ ...s, ai: { ...s.ai, movement } }),
  setMuted: (s, muted) => ({ ...s, muted }),
  snapshot: (s) => ({
    version: C.CAROM_DEBUG_VERSION,
    screen: s.screen,
    mode: s.mode,
    menuIndex: s.menuIndex,
    titleIndex: s.titleIndex,
    resumeScreen: s.resumeScreen,
    score: { ...s.score },
    winner: s.winner,
    paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
    ai: { ...s.ai },
    receiver: s.receiver,
    ball: s.ball
      ? {
          ...s.ball,
          trail: [...s.ball.trail],
          speed: Math.hypot(s.ball.vx, s.ball.vy),
        }
      : null,
    obstacles: s.obstacles.map((o) => ({ ...o })),
    simTime: s.simTime,
    muted: s.muted,
  }),
  menuItemRect,
};
function movePaddle(
  p: DeepReadonly<PaddleState>,
  vy: number,
  dt: number,
): PaddleState {
  const cy = clamp(p.cy + vy * dt, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return {
    ...p,
    cy,
    vy: dt > 0 && cy !== p.cy + vy * dt ? (cy - p.cy) / dt : vy,
  };
}
function movePaddles(
  s: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState["paddles"] {
  const v = (up: boolean, down: boolean): number =>
    (Number(down) - Number(up)) * C.PADDLE_SPEED;
  const left = s.paddles.left;
  const lv = left.driven
    ? left.drivenVy
    : v(
        api.input.value("p1-up") > 0 ||
          (s.mode === "solo" && api.input.value("p2-up") > 0),
        api.input.value("p1-down") > 0 ||
          (s.mode === "solo" && api.input.value("p2-down") > 0),
      );
  const right = s.paddles.right;
  let rv = right.drivenVy;
  if (!right.driven && s.mode === "versus")
    rv = v(api.input.value("p2-up") > 0, api.input.value("p2-down") > 0);
  if (!right.driven && s.mode === "solo") {
    const defend =
      s.ai.tracking && s.screen === "playing" && !!s.ball && s.ball.vx > 0;
    const target =
      defend && s.ball ? s.ball.y - s.ball.vy * C.AI_REACT : C.AI_HOME_Y;
    const diff = target - right.cy;
    rv =
      !s.ai.movement ||
      Math.abs(diff) <= (defend ? C.AI_DEADZONE : C.AI_HOME_DEADZONE) ||
      dt <= 0
        ? 0
        : Math.sign(diff) * Math.min(C.AI_SPEED, Math.abs(diff) / dt);
  }
  return { left: movePaddle(left, lv, dt), right: movePaddle(right, rv, dt) };
}
type Face = "left" | "right" | "top" | "bottom";
function rectHit(
  b: BallState,
  r: C.Rect,
): { ball: BallState; face: Face; bounced: boolean } | null {
  if (!(
    b.x > r.x0 - C.BALL_R &&
    b.x < r.x1 + C.BALL_R &&
    b.y > r.y0 - C.BALL_R &&
    b.y < r.y1 + C.BALL_R
  ))
    return null;
  const depths = [
    b.x - (r.x0 - C.BALL_R),
    r.x1 + C.BALL_R - b.x,
    b.y - (r.y0 - C.BALL_R),
    r.y1 + C.BALL_R - b.y,
  ];
  const i = depths.indexOf(Math.min(...depths));
  const face: Face = ["left", "right", "top", "bottom"][i] as Face;
  const into = [b.vx > 0, b.vx < 0, b.vy > 0, b.vy < 0][i];
  return {
    face,
    bounced: into,
    ball: {
      ...b,
      x: i === 0 ? r.x0 - C.BALL_R : i === 1 ? r.x1 + C.BALL_R : b.x,
      y: i === 2 ? r.y0 - C.BALL_R : i === 3 ? r.y1 + C.BALL_R : b.y,
      vx: i < 2 && into ? -b.vx : b.vx,
      vy: i >= 2 && into ? -b.vy : b.vy,
    },
  };
}
function stepBall(
  s: DeepReadonly<CaromState>,
  dt: number,
  api: UpdateApi,
): BallState {
  let b = requireBall(s);
  const cues = new Set<string>();
  const n = Math.max(
    1,
    Math.ceil((Math.hypot(b.vx, b.vy) * dt) / C.MAX_SUBSTEP),
  );
  const h = dt / n;
  for (let j = 0; j < n; j++) {
    const speed = Math.hypot(b.vx, b.vy);
    const a = speed > 0 ? (b.spin / speed) * h : 0;
    const vx = b.vx * Math.cos(a) - b.vy * Math.sin(a),
      vy = b.vx * Math.sin(a) + b.vy * Math.cos(a);
    b = {
      ...b,
      vx,
      vy,
      spin: b.spin * Math.pow(0.5, h / C.SPIN_HALFLIFE),
      x: b.x + vx * h,
      y: b.y + vy * h,
    };
    if (b.y - C.BALL_R < 0 && b.vy < 0) {
      b = { ...b, y: C.BALL_R, vy: -b.vy };
      cues.add(C.CUES.wallBounce);
    } else if (b.y + C.BALL_R > C.FIELD_H && b.vy > 0) {
      b = { ...b, y: C.FIELD_H - C.BALL_R, vy: -b.vy };
      cues.add(C.CUES.wallBounce);
    }
    for (const side of ["left", "right"] as const) {
      const r =
        side === "left"
          ? {
              x0: C.P1_X0,
              x1: C.P1_X1,
              y0: s.paddles.left.cy - C.PADDLE_HALF,
              y1: s.paddles.left.cy + C.PADDLE_HALF,
            }
          : {
              x0: C.P2_X0,
              x1: C.P2_X1,
              y0: s.paddles.right.cy - C.PADDLE_HALF,
              y1: s.paddles.right.cy + C.PADDLE_HALF,
            };
      const hit = rectHit(b, r);
      if (!hit) continue;
      b = hit.ball;
      if (hit.face === "top" || hit.face === "bottom") {
        if (hit.bounced) cues.add(C.CUES.wallBounce);
        continue;
      }
      if (!hit.bounced) continue;
      const speed = Math.min(
        Math.hypot(b.vx, b.vy) * C.SPEED_MULT,
        C.SPEED_CAP,
      );
      const theta =
        clamp((b.y - s.paddles[side].cy) / C.PADDLE_HALF, -1, 1) *
        C.MAX_BOUNCE_ANGLE;
      b = {
        ...b,
        x: side === "left" ? C.P1_X1 + C.BALL_R : C.P2_X0 - C.BALL_R,
        vx: (side === "left" ? 1 : -1) * speed * Math.cos(theta),
        vy: speed * Math.sin(theta),
        spin: clamp(
          b.spin + s.paddles[side].vy * C.SPIN_FROM_PADDLE,
          -C.SPIN_CLAMP,
          C.SPIN_CLAMP,
        ),
      };
      cues.add(C.CUES.paddleHit);
    }
    for (const o of s.obstacles) {
      const hit = rectHit(b, C.OBSTACLES[o.index]);
      if (hit) {
        b = hit.ball;
        if (hit.bounced) cues.add(C.CUES.obstacleBounce);
      }
    }
  }
  for (const cue of cues) api.audio.play(cue);
  return b;
}
function confirm(s: DeepReadonly<CaromState>): CaromState {
  if (s.screen === "title") {
    const titleIndex = s.menuIndex;
    if (titleIndex < 2)
      return { ...start(s, titleIndex === 0 ? "solo" : "versus"), titleIndex };
    return { ...s, screen: "howto", menuIndex: 0, titleIndex };
  }
  if (s.screen === "howto") return fresh(s.muted, s.titleIndex, s.simTime);
  if (s.screen === "paused") {
    if (s.menuIndex === 0) return { ...s, screen: s.resumeScreen };
    if (s.menuIndex === 1) return start(s, s.mode);
    return fresh(s.muted, s.titleIndex, s.simTime);
  }
  if (s.screen === "matchover")
    return s.menuIndex === 0
      ? start(s, s.mode)
      : fresh(s.muted, s.titleIndex, s.simTime);
  return copy(s);
}
function menuCount(screen: Screen): number {
  return screen === "title" || screen === "paused"
    ? 3
    : screen === "matchover"
      ? 2
      : screen === "howto"
        ? 1
        : 0;
}
function readInput(s: DeepReadonly<CaromState>, api: UpdateApi): CaromState {
  let next = copy(s);
  const up = api.input.pressed("p1-up") || api.input.pressed("p2-up");
  const down = api.input.pressed("p1-down") || api.input.pressed("p2-down");
  const keyConfirm = api.input.pressed("confirm");
  const back = api.input.pressed("back");
  const pause = api.input.pressed("pause");
  const mute = api.input.pressed("mute");
  if (s.muted !== api.audio.muted()) api.audio.setMuted(s.muted);
  if (mute) api.audio.setMuted(!api.audio.muted());
  next = { ...next, muted: api.audio.muted() };
  if (s.screen === "countdown" || s.screen === "playing") {
    if (pause)
      next = {
        ...next,
        screen: "paused",
        resumeScreen: s.screen,
        menuIndex: 0,
      };
    return next;
  }
  if (s.screen === "paused" && (pause || back))
    return { ...next, screen: s.resumeScreen };
  if (s.screen === "howto" && (keyConfirm || back)) return confirm(next);
  if (s.screen === "matchover" && back)
    return fresh(next.muted, next.titleIndex, next.simTime);
  const count = menuCount(s.screen);
  if (!count) return next;
  if (up) next = { ...next, menuIndex: (next.menuIndex + count - 1) % count };
  else if (down) next = { ...next, menuIndex: (next.menuIndex + 1) % count };
  else if (keyConfirm) return confirm(next);
  const itemAt = (x: number, y: number): number => {
    for (let i = 0; i < count; i++) {
      const r = menuItemRect(s, i);
      if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
        return i;
    }
    return -1;
  };
  let presses = [...s.menuPress];
  for (const sample of api.input.pointerSamples()) {
    if (
      sample.device !== "touch" &&
      sample.button !== null &&
      sample.button !== "primary"
    )
      continue;
    const index = itemAt(sample.x, sample.y);
    if (index >= 0) next = { ...next, menuIndex: index };
    if (sample.type === "down")
      presses = [
        ...presses.filter((p) => p.id !== sample.id),
        { id: sample.id, index },
      ];
    if (sample.type === "up") {
      const pressed = presses.find((p) => p.id === sample.id);
      presses = presses.filter((p) => p.id !== sample.id);
      if (pressed && pressed.index >= 0 && pressed.index === index) {
        next = { ...next, menuIndex: index, menuPress: [] };
        return confirm(next);
      }
    }
  }
  return { ...next, menuPress: presses };
}
export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api: InitApi<CaromState>): [CaromState, CaromDebugApi] {
    for (const action of C.ACTIONS)
      api.input.register(action, { keys: [...C.BINDINGS[action]] });
    api.audio.define(C.CUES.paddleHit, {
      wave: "triangle",
      freq: 510,
      freqTo: 310,
      gain: 0.19,
      durationMs: 90,
    });
    api.audio.define(C.CUES.wallBounce, {
      wave: "sine",
      freq: 350,
      freqTo: 270,
      gain: 0.16,
      durationMs: 75,
    });
    api.audio.define(C.CUES.obstacleBounce, {
      wave: "square",
      freq: 200,
      freqTo: 130,
      gain: 0.11,
      durationMs: 100,
    });
    api.audio.define(C.CUES.score, {
      wave: "sawtooth",
      freq: 180,
      freqTo: 440,
      gain: 0.16,
      durationMs: 260,
    });
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("mode", (s) => s.mode);
    api.diagnostics.register("score", (s) => `${s.score.p1} : ${s.score.p2}`);
    api.diagnostics.register("ball", (s) =>
      s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "none",
    );
    api.diagnostics.register("velocity", (s) =>
      s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "none",
    );
    api.diagnostics.register("speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy).toFixed(1) : "none",
    );
    api.diagnostics.register("spin", (s) =>
      s.ball ? s.ball.spin.toFixed(1) : "none",
    );
    for (const side of ["left", "right"] as const)
      api.diagnostics.register(
        side,
        (s) =>
          `${s.paddles[side].cy.toFixed(1)}, ${s.paddles[side].vy.toFixed(1)}`,
      );
    return [fresh(false), debug];
  },
  update(
    state: DeepReadonly<CaromState>,
    api: UpdateApi,
    dt: number,
  ): CaromState {
    let s = readInput(state, api);
    s = { ...s, simTime: s.simTime + dt };
    if (s.muted !== api.audio.muted()) api.audio.setMuted(s.muted);
    if (s.screen !== "countdown" && s.screen !== "playing") return s;
    s = { ...s, paddles: movePaddles(s, api, dt) };
    if (!s.ball) return s;
    let b: BallState = s.ball;
    if (s.screen === "countdown") {
      const holdTimer = b.holdTimer - dt;
      if (holdTimer <= 0) {
        b = {
          ...b,
          held: false,
          holdTimer: 0,
          trail: [],
          vx:
            (s.receiver === "left" ? -1 : 1) *
            C.SERVE_SPEED *
            Math.cos(C.SERVE_ANGLE),
          vy: b.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
        };
        s = { ...s, screen: "playing" };
      } else b = { ...b, holdTimer };
    } else if (!b.held) b = stepBall(s, dt, api);
    b = {
      ...b,
      trail: [...b.trail, { x: b.x, y: b.y, t: s.simTime }].filter(
        (p) => p.t >= s.simTime - C.TRAIL_TIME,
      ),
    };
    s = { ...s, ball: b };
    if (
      s.screen === "playing" &&
      !b.held &&
      (b.x - C.BALL_R > C.FIELD_W || b.x + C.BALL_R < 0)
    ) {
      const scorer: Side = b.x > C.FIELD_W ? "left" : "right";
      const score = {
        p1: s.score.p1 + Number(scorer === "left"),
        p2: s.score.p2 + Number(scorer === "right"),
      };
      api.audio.play(C.CUES.score);
      const won =
        scorer === "left"
          ? score.p1 >= C.WIN_SCORE && score.p1 - score.p2 >= C.WIN_LEAD
          : score.p2 >= C.WIN_SCORE && score.p2 - score.p1 >= C.WIN_LEAD;
      s = won
        ? { ...s, score, winner: scorer, screen: "matchover", menuIndex: 0 }
        : {
            ...s,
            score,
            receiver: scorer === "left" ? "right" : "left",
            ball: park(),
            screen: "countdown",
          };
    }
    return s;
  },
  render(state: DeepReadonly<CaromState>, api: RenderApi): void {
    drawGame(state, api.ctx);
  },
};
