import { describe, expect, test, vi } from "vitest";

vi.mock("../../src/client/Utils", () => ({
  translateText: vi.fn((key: string) => key),
  renderDuration: vi.fn((seconds: number) => `${seconds}s`),
}));

import {
  PERMANENT_ALLIANCE_SECONDS,
  renderAllianceRemaining,
} from "../../src/client/utilities/AllianceExpiry";

describe("renderAllianceRemaining", () => {
  test("shows a normal countdown below the permanent threshold", () => {
    expect(renderAllianceRemaining(90)).toBe("90s");
  });

  test("treats exactly the threshold as a countdown", () => {
    expect(renderAllianceRemaining(PERMANENT_ALLIANCE_SECONDS)).toBe(
      `${PERMANENT_ALLIANCE_SECONDS}s`,
    );
  });

  test("shows Permanent for a real-borders treaty expiry", () => {
    // tick + 1,000,000,000 at 10 ticks per second, with the game at tick 0.
    expect(renderAllianceRemaining(100_000_000)).toBe("alliance.permanent");
  });
});
