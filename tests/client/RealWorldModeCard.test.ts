import {
  GameMapSize,
  GameMapType,
  GameMode,
} from "@openfront/engine-api/game/GameTypes";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/client/Cosmetics", () => ({
  getPlayerCosmetics: vi.fn(async () => ({})),
}));

vi.mock("../../src/client/CrazyGamesSDK", () => ({
  crazyGamesSDK: {
    isOnCrazyGames: vi.fn(() => false),
    requestMidgameAd: vi.fn(async () => {}),
  },
}));

vi.mock("../../src/client/TerrainMapFileLoader", () => ({
  terrainMapFileLoader: {
    getMapData: vi.fn(() => ({
      manifest: async () => ({ nations: [{}, {}, {}] }),
    })),
  },
}));

vi.mock("../../src/client/DesktopPresence", () => ({
  desktopPresence: {
    isAvailable: vi.fn(() => false),
    openInviteDialog: vi.fn(async () => true),
    set: vi.fn(),
    consumePendingInvite: vi.fn(async () => null),
    subscribeInvites: vi.fn(() => () => undefined),
  },
}));

import "../../src/client/components/GameConfigSettings";
import { HostLobbyModal } from "../../src/client/HostLobbyModal";
import "../../src/client/SinglePlayerModal";

// The map picker observes its thumbnails; jsdom has no IntersectionObserver.
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

function toggleEvent(enabled: boolean): CustomEvent {
  return new CustomEvent("real-world-mode-toggled", { detail: { enabled } });
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function settingsData(enabled: boolean | undefined) {
  return {
    ...(enabled === undefined ? {} : { realWorldMode: { enabled } }),
    map: { selected: GameMapType.World, useRandom: false },
    difficulty: { selected: 0, disabled: false },
    gameMode: { selected: GameMode.FFA },
    teamCount: { selected: 2 },
    options: {
      titleKey: "game_settings.options",
      bots: {
        value: 400,
        labelKey: "game_settings.bots",
        disabledKey: "common.disabled",
      },
      nations: {
        value: 3,
        labelKey: "game_settings.nations",
        disabledKey: "common.disabled",
      },
      toggles: [],
      inputCards: [],
    },
    unitTypes: { titleKey: "game_settings.disable_units", disabledUnits: [] },
  };
}

async function mountSettings(enabled?: boolean) {
  const el = document.createElement("game-config-settings") as any;
  el.settings = settingsData(enabled);
  document.body.appendChild(el);
  await el.updateComplete;
  return el as HTMLElement;
}

function cardOf(el: HTMLElement): HTMLButtonElement {
  return el.querySelector("button[role='switch']") as HTMLButtonElement;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Realistic World card in game config settings", () => {
  it("is the first thing in the setup, above the map", async () => {
    const el = await mountSettings(false);
    const wrapper = el.firstElementChild as HTMLElement;
    expect(wrapper.firstElementChild).toBe(cardOf(el));
    expect(cardOf(el).getAttribute("aria-checked")).toBe("false");
    expect(cardOf(el).textContent).toContain("real_world_mode.title");
    expect(cardOf(el).textContent).toContain("real_world_mode.description");
  });

  it("emits the next state when the whole card is clicked", async () => {
    const el = await mountSettings(false);
    const events: CustomEvent[] = [];
    el.addEventListener("real-world-mode-toggled", (e) =>
      events.push(e as CustomEvent),
    );
    cardOf(el).click();
    expect(events[events.length - 1]?.detail).toEqual({ enabled: true });

    el.remove();
    const on = await mountSettings(true);
    on.addEventListener("real-world-mode-toggled", (e) =>
      events.push(e as CustomEvent),
    );
    expect(cardOf(on).getAttribute("aria-checked")).toBe("true");
    cardOf(on).click();
    expect(events[events.length - 1]?.detail).toEqual({ enabled: false });
  });

  it("locks the map and hides mode, team, bots and nations while on", async () => {
    const off = await mountSettings(false);
    expect(
      off.querySelector("map-picker")?.parentElement?.hasAttribute("inert"),
    ).toBe(false);
    expect(off.textContent).toContain("host_modal.mode");
    expect(off.querySelectorAll("fluent-slider")).toHaveLength(2);

    off.remove();
    const on = await mountSettings(true);
    expect(
      on.querySelector("map-picker")?.parentElement?.hasAttribute("inert"),
    ).toBe(true);
    expect(on.textContent).toContain("real_world_mode.map_locked");
    expect(on.textContent).not.toContain("host_modal.mode");
    expect(on.querySelector("input[type='text']")).toBeNull();
    expect(on.querySelectorAll("fluent-slider")).toHaveLength(0);
  });
});

describe("Realistic World in the Solo modal", () => {
  function createSolo(): any {
    return document.createElement("single-player-modal") as any;
  }

  it("sets the card on the page first when the modal is mounted", async () => {
    const modal = createSolo();
    document.body.appendChild(modal);
    await modal.updateComplete;
    const settings = modal.querySelector("game-config-settings") as HTMLElement;
    expect(settings.firstElementChild?.firstElementChild).toBe(
      cardOf(settings),
    );
  });

  it("switches the setup to World / Normal / Free For All and restores it", async () => {
    const modal = createSolo();
    modal.selectedMap = GameMapType.Africa;
    modal.gameMode = GameMode.Team;
    modal.compactMap = true;
    modal.randomSpawn = true;
    modal.bots = 50;
    modal.nations = 2;

    modal.handleConfigRealWorldModeToggled(toggleEvent(true));
    await flush();
    expect(modal.realisticWorld).toBe(true);
    expect(modal.selectedMap).toBe(GameMapType.World);
    expect(modal.gameMode).toBe(GameMode.FFA);
    expect(modal.compactMap).toBe(false);
    expect(modal.randomSpawn).toBe(false);
    expect(modal.bots).toBe(400);
    expect(modal.nations).toBe(3);

    modal.handleConfigRealWorldModeToggled(toggleEvent(false));
    await flush();
    expect(modal.realisticWorld).toBe(false);
    expect(modal.selectedMap).toBe(GameMapType.Africa);
    expect(modal.gameMode).toBe(GameMode.Team);
    expect(modal.compactMap).toBe(true);
    expect(modal.randomSpawn).toBe(true);
    expect(modal.bots).toBe(50);
    expect(modal.nations).toBe(2);
  });

  it("sends publicGameModifiers.isRealisticWorld only when on for World / Normal / FFA", async () => {
    const modal = createSolo();
    const configs: any[] = [];
    modal.addEventListener("join-lobby", (e: Event) =>
      configs.push((e as CustomEvent).detail.gameStartInfo.config),
    );

    modal.handleConfigRealWorldModeToggled(toggleEvent(true));
    await flush();
    await modal.startGame();
    expect(configs[0].publicGameModifiers).toEqual({ isRealisticWorld: true });
    expect(configs[0].gameMap).toBe(GameMapType.World);
    expect(configs[0].gameMapSize).toBe(GameMapSize.Normal);
    expect(configs[0].gameMode).toBe(GameMode.FFA);

    modal.handleConfigRealWorldModeToggled(toggleEvent(false));
    await flush();
    await modal.startGame();
    expect(configs[1].publicGameModifiers).toBeUndefined();
  });
});

describe("Realistic World in the Host lobby", () => {
  function createHost(): any {
    const host = new HostLobbyModal() as any;
    host.constructUrl = async () => new URL("http://localhost/");
    host.updateLobbyHistory = () => {};
    return host;
  }

  function collectConfigs(host: HTMLElement): any[] {
    const events: any[] = [];
    host.addEventListener("update-game-config", (e) =>
      events.push((e as CustomEvent).detail.config),
    );
    return events;
  }

  it("pushes the locked config on, then restores and pushes it off", async () => {
    const host = createHost();
    host.selectedMap = GameMapType.Europe;
    host.gameMode = GameMode.Team;
    host.compactMap = true;
    host.randomSpawn = true;
    const configs = collectConfigs(host);

    host.handleConfigRealWorldModeToggled(toggleEvent(true));
    await flush();
    expect(host.realisticWorld).toBe(true);
    expect(host.selectedMap).toBe(GameMapType.World);
    expect(host.gameMode).toBe(GameMode.FFA);
    expect(host.compactMap).toBe(false);
    expect(host.randomSpawn).toBe(false);
    expect(configs[configs.length - 1].gameMapSize).toBe(GameMapSize.Normal);
    expect(configs[configs.length - 1].publicGameModifiers).toEqual({
      isRealisticWorld: true,
    });

    host.handleConfigRealWorldModeToggled(toggleEvent(false));
    await flush();
    expect(host.selectedMap).toBe(GameMapType.Europe);
    expect(host.gameMode).toBe(GameMode.Team);
    expect(host.compactMap).toBe(true);
    expect(host.randomSpawn).toBe(true);
    expect(configs[configs.length - 1].publicGameModifiers).toEqual({
      isRealisticWorld: false,
    });
  });
});
