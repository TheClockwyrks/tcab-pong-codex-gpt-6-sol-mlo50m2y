import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { describe, expect, it } from "vitest";
import {
  BALL_R,
  FIELD_CY,
  HOLD_TIME,
  P1_X1,
  PADDLE_SPEED,
  SERVE_SPEED,
  SPIN_FROM_PADDLE,
  WIN_SCORE,
} from "./constants";
import { BACKGROUND, game } from "./game";

function rig(stepMs = 10) {
  const events = new EventTarget();
  const engine = createEngine({
    canvas: createCanvas(1280, 720) as unknown as HTMLCanvasElement,
    width: 1280,
    height: 720,
    game,
    background: BACKGROUND,
    clock: new ConstantClock(stepMs),
    surface: {
      cssWidth: () => 1280,
      cssHeight: () => 720,
      dpr: () => 1,
      events: () => events,
    },
  });
  return { engine, events };
}
describe("Carom simulation", () => {
  it("initializes its world and serves after the hold", async () => {
    const { engine } = rig();
    await engine.initialize();
    expect(engine.debug.snapshot(engine.state).obstacles).toHaveLength(2);
    engine.apply((s) => engine.debug.setScreen(s, "countdown"));
    await engine.advance(100);
    const ball = engine.debug.snapshot(engine.state).ball;
    expect(engine.state.screen).toBe("playing");
    expect(ball?.held).toBe(false);
    expect(Math.hypot(ball?.vx ?? 0, ball?.vy ?? 0)).toBeCloseTo(SERVE_SPEED);
    expect(ball?.holdTimer).toBe(0);
    engine.destroy();
  });
  it("moves and clamps paddles, preserving actual velocity", async () => {
    const { engine } = rig();
    await engine.initialize();
    engine.apply((s) => engine.debug.setScreen(s, "playing"));
    engine.apply((s) => engine.debug.setPaddleDriven(s, "left", true));
    engine.apply((s) => engine.debug.setPaddleVy(s, "left", -PADDLE_SPEED));
    await engine.advance(100);
    expect(engine.state.paddles.left.cy).toBe(55);
    expect(engine.state.paddles.left.vy).toBe(0);
    engine.destroy();
  });
  it("adds paddle spin and scores a real point", async () => {
    const { engine } = rig(2);
    await engine.initialize();
    engine.apply((s) => engine.debug.setScreen(s, "playing"));
    engine.apply((s) => engine.debug.setPaddleDriven(s, "left", true));
    engine.apply((s) => engine.debug.setPaddleVy(s, "left", 300));
    engine.apply((s) =>
      engine.debug.setBallPosition(s, P1_X1 + BALL_R + 1, FIELD_CY),
    );
    engine.apply((s) => engine.debug.setBallVelocity(s, -SERVE_SPEED, 0));
    engine.apply((s) => engine.debug.setBallHeld(s, false));
    await engine.advance(1);
    expect(engine.state.ball?.vx).toBeGreaterThan(0);
    expect(engine.state.ball?.spin).toBeCloseTo(300 * SPIN_FROM_PADDLE, 0);
    engine.apply((s) => engine.debug.setScore(s, WIN_SCORE - 1, 0));
    engine.apply((s) => engine.debug.setBallPosition(s, 1293, 120));
    engine.apply((s) => engine.debug.setBallVelocity(s, 520, 0));
    await engine.advance(1);
    expect(engine.state.screen).toBe("matchover");
    expect(engine.state.winner).toBe("left");
    engine.destroy();
  });
  it("poses and resets the debug world", async () => {
    const { engine } = rig();
    await engine.initialize();
    engine.apply((s) => engine.debug.clearWorld(s));
    expect(engine.debug.snapshot(engine.state).ball).toBeNull();
    expect(() => engine.apply((s) => engine.debug.setBallSpin(s, 3))).toThrow();
    engine.apply((s) => engine.debug.spawnBall(s));
    engine.apply((s) => engine.debug.setBallHoldTimer(s, HOLD_TIME / 2));
    expect(engine.state.ball?.holdTimer).toBe(HOLD_TIME / 2);
    engine.apply((s) => engine.debug.reset(s));
    expect(engine.state.ball?.holdTimer).toBe(HOLD_TIME);
    engine.destroy();
  });
});
