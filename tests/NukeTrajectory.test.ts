import {
  buildNukeTrajectory,
  computeNukeControlPoints,
  computeTrajectoryThresholds,
  type TrajectoryLimits,
} from "../src/client/render/gl/utils/NukeTrajectory";

// A large map height so the parabola arc isn't clamped.
const MAP_H = 1000;

// Classic-map limits, as Config reports them at mapScale 1.
const CLASSIC: TrajectoryLimits = {
  parabolaMinHeight: 50,
  targetableRange: 150,
  maxSamRange: 150,
};

// Classic SAM range formula, level 6: 150 - 480 / (6 + 5).
const SAM_LEVEL_6_RANGE = 150 - 480 / 11;

// Helper: build control points for a straight horizontal trajectory.
function horizontalCp(srcX: number, dstX: number) {
  return computeNukeControlPoints(
    srcX,
    500,
    dstX,
    500,
    MAP_H,
    true,
    CLASSIC.parabolaMinHeight,
  );
}

describe("NukeTrajectory thresholds", () => {
  test("tSamIntercept is 1.0 when no SAMs", () => {
    const cp = horizontalCp(100, 800);
    const th = computeTrajectoryThresholds(cp, 100, 500, 800, 500, [], CLASSIC);
    expect(th.tSamIntercept).toBe(1.0);
  });

  test("long trajectory has an untargetable mid-air zone", () => {
    const cp = horizontalCp(100, 800);
    const th = computeTrajectoryThresholds(cp, 100, 500, 800, 500, [], CLASSIC);
    expect(th.tUntargetableStart).toBeGreaterThanOrEqual(0);
    expect(th.tUntargetableEnd).toBeGreaterThan(th.tUntargetableStart);
  });

  test("buildNukeTrajectory combines control points and thresholds", () => {
    const data = buildNukeTrajectory(
      100,
      500,
      800,
      500,
      MAP_H,
      true,
      [],
      CLASSIC,
    );
    expect(data.tSamIntercept).toBe(1.0);
    expect(data.p0x).toBe(100);
    expect(data.p3x).toBe(800);
  });

  test("intercepts nuke when SAM covers tUntargetableEnd but excludes next sample", () => {
    const cp = horizontalCp(100, 800);
    const thBase = computeTrajectoryThresholds(
      cp,
      100,
      500,
      800,
      500,
      [],
      CLASSIC,
    );
    const t = thBase.tUntargetableEnd,
      T = 1 - t;
    const x =
      T * (T * (T * cp.p0x + 3 * t * cp.p1x) + 3 * t * t * cp.p2x) +
      t * t * t * cp.p3x;
    const y =
      T * (T * (T * cp.p0y + 3 * t * cp.p1y) + 3 * t * t * cp.p2y) +
      t * t * t * cp.p3y;
    const th = computeTrajectoryThresholds(
      cp,
      100,
      500,
      800,
      500,
      [{ x, y, r: 5 }],
      CLASSIC,
    );
    expect(th.tSamIntercept).toBe(t);
  });

  test("detects SAM intercept along trajectory", () => {
    const cp = horizontalCp(100, 800);
    const sam = { x: 750, y: 500, r: 50 };
    const th = computeTrajectoryThresholds(
      cp,
      100,
      500,
      800,
      500,
      [sam],
      CLASSIC,
    );
    expect(th.tSamIntercept).toBeLessThan(1.0);
  });

  test("validates 32 samples across tangent cells and safe cells without padding", () => {
    const srcX = 1249;
    const srcY = 108;
    const samX = 984;
    const samY = 380;
    const sams = [{ x: samX, y: samY, r: SAM_LEVEL_6_RANGE }];

    // Direct intercept cell
    const traj = buildNukeTrajectory(
      srcX,
      srcY,
      859,
      397,
      1000,
      true,
      sams,
      CLASSIC,
    );
    expect(traj.tSamIntercept).toBeLessThan(1.0);

    // Safe cell passing outside SAM range
    const safeTraj = buildNukeTrajectory(
      srcX,
      srcY,
      865,
      380,
      1000,
      true,
      sams,
      CLASSIC,
    );
    expect(safeTraj.tSamIntercept).toBe(1.0);
  });

  test("real-borders limits (x2.5) keep the same intercept outcome on a 2.5x map", () => {
    const s = 2.5;
    const scaled: TrajectoryLimits = {
      parabolaMinHeight: CLASSIC.parabolaMinHeight * s,
      targetableRange: CLASSIC.targetableRange * s,
      maxSamRange: CLASSIC.maxSamRange * s,
    };
    const sams = [{ x: 984 * s, y: 380 * s, r: SAM_LEVEL_6_RANGE * s }];

    const hit = buildNukeTrajectory(
      1249 * s,
      108 * s,
      859 * s,
      397 * s,
      1000 * s,
      true,
      sams,
      scaled,
    );
    expect(hit.tSamIntercept).toBeLessThan(1.0);

    const safe = buildNukeTrajectory(
      1249 * s,
      108 * s,
      865 * s,
      380 * s,
      1000 * s,
      true,
      sams,
      scaled,
    );
    expect(safe.tSamIntercept).toBe(1.0);
  });

  test("parabola arc height uses the supplied minimum height", () => {
    const low = computeNukeControlPoints(100, 500, 110, 500, MAP_H, true, 50);
    const high = computeNukeControlPoints(100, 500, 110, 500, MAP_H, true, 125);
    expect(low.p1y).toBe(450);
    expect(high.p1y).toBe(375);
  });
});
