import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("lit", () => ({
  html: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  }),
  nothing: Symbol("nothing"),
  LitElement: class extends EventTarget {
    requestUpdate() {}
  },
}));

vi.mock("lit/decorators.js", () => ({
  customElement: () => (clazz: unknown) => clazz,
  state: () => () => {},
  property: () => () => {},
  query: () => () => {},
}));

vi.mock("../../src/client/Utils", () => ({
  translateText: vi.fn((key: string) => key),
  textDirection: vi.fn(() => "ltr"),
}));

import { TutorialPanel } from "../../src/client/hud/layers/TutorialPanel";

function makePanel(realBorders: boolean) {
  const panel = new TutorialPanel();
  const toggle = vi.fn();
  (panel as any).classList = { toggle };
  (panel as any).userSettings = { tutorialDismissed: () => false };
  (panel as any).game = {
    config: () => ({
      isReplay: () => false,
      isRealBorders: () => realBorders,
    }),
    myPlayer: () => null,
    setOwnSpawnRing: vi.fn(),
  };
  return { panel, toggle };
}

describe("TutorialPanel in real borders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("stays hidden in real borders", () => {
    const { panel, toggle } = makePanel(true);

    panel.tick();

    expect((panel as any).active).toBe(false);
    expect(toggle).not.toHaveBeenCalled();
  });

  test("activates in classic games when the tutorial is not dismissed", () => {
    const { panel, toggle } = makePanel(false);

    panel.tick();

    expect(toggle).toHaveBeenCalledWith("hidden", false);
  });
});
