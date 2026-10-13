import { GameUpdateType } from "@openfront/engine-api/game/GameUpdates";
import { EventBus } from "@openfront/shared/EventBus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../../src/client/hud/layers/WinModal";
import type { WinModal } from "../../../../src/client/hud/layers/WinModal";

vi.mock("../../../../src/client/SoloOnly", () => ({ SOLO_ONLY: true }));

vi.mock("../../../../src/client/Utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../src/client/Utils")>()),
  translateText: (key: string) => key,
  getGamesPlayed: () => 10,
  isInIframe: () => false,
}));

vi.mock("../../../../src/client/CrazyGamesSDK", () => ({
  crazyGamesSDK: {
    happytime: vi.fn(),
    requestAd: vi.fn(),
    gameplayStop: vi.fn(),
  },
}));

function nationWin() {
  return {
    [GameUpdateType.Win]: [
      { winner: ["nation", "France"], allPlayersStats: {} },
    ],
  };
}

function mountWithNationWin(): WinModal {
  const el = document.createElement("win-modal") as WinModal;
  el.eventBus = new EventBus();
  el.game = {
    config: () => ({
      gameConfig: () => ({ gameType: "Singleplayer", rankedType: undefined }),
      isReplay: () => false,
    }),
    myPlayer: () => null,
    myClientID: () => undefined,
    gameID: () => "abcdefgh",
    updatesSinceLastTick: () => nationWin(),
    inSpawnPhase: () => false,
  } as unknown as WinModal["game"];
  document.body.append(el);
  el.init();
  return el;
}

describe("WinModal in the solo-only build", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("shows the result without any network request", async () => {
    const el = mountWithNationWin();
    el.tick();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(el.querySelector("h2")?.textContent).toContain(
      "win_modal.nation_won",
    );
    expect(el.querySelector('[data-win-action="exit"]')).not.toBeNull();
    expect(el.querySelector('[data-win-action="keep"]')).not.toBeNull();
  });

  it("renders no purchasable patterns, wishlist or support box", async () => {
    const el = mountWithNationWin();
    el.tick();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(el.querySelector("[data-win-cosmetic-promo]")).toBeNull();
    expect(el.querySelector("purchase-button")).toBeNull();
    expect(el.querySelector("cosmetic-card")).toBeNull();
    expect(el.querySelector("steam-wishlist")).toBeNull();
    expect(el.textContent).not.toContain("win_modal.support_openfront");
    expect(el.textContent).not.toContain("steam_wishlist.buy_on_steam");
  });
});
