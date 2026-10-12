import { describe, expect, it } from "vitest";
import { getActiveModifiers } from "../../src/client/Utils";

// Realistic World is part of the public "special" modifier rotation, so an
// active isRealisticWorld modifier must surface a lobby badge like every
// other rotation modifier.
describe("realistic world public modifier", () => {
  it("surfaces a realistic-world badge when the modifier is active", () => {
    const mods = getActiveModifiers({ isRealisticWorld: true });
    expect(mods).toHaveLength(1);
    expect(mods[0].badgeKey).toBe("public_game_modifier.realistic_world");
    expect(mods[0].labelKey).toBe("public_game_modifier.realistic_world_label");
  });

  it("omits the badge when the modifier is absent", () => {
    expect(getActiveModifiers({})).toHaveLength(0);
    expect(getActiveModifiers(undefined)).toHaveLength(0);
  });
});
