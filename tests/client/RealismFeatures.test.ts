import {
  GameMapSize,
  GameMapType,
  PlayerType,
} from "@openfront/engine-api/game/GameTypes";
import {
  CHOKEPOINTS,
  TIER_BASE_TOLL,
} from "@openfront/engine-api/resources/Chokepoints";
import { computeMultipliers } from "@openfront/engine-api/resources/TechNodes";
import { renderNumber } from "@openfront/engine-lib/Format";
import { EventBus } from "@openfront/shared/EventBus";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TechTreePanel,
  ToggleTechTreeEvent,
} from "../../src/client/components/TechTreePanel";
import { PlayerPanel } from "../../src/client/hud/layers/PlayerPanel";
import { UnitDisplay } from "../../src/client/hud/layers/UnitDisplay";
import {
  SendDeclareCoalitionWarIntentEvent,
  SendPurchaseTechIntentEvent,
} from "../../src/client/Transport";
import type { UIState } from "../../src/client/UIState";
import { getDefaultKeybinds } from "../../src/client/UserSettings";
import { notableLobbySettings } from "../../src/client/utilities/LobbySettingsSummary";
import {
  realisticWorldApplies,
  techAdjustedTroopIncrease,
} from "../../src/client/utilities/RealisticWorldToggle";
import type { GameView, PlayerView } from "../../src/client/view";
import { testGameConfig } from "../util/Wire";

// Params are appended so tests can assert on interpolated values.
vi.mock("../../src/client/Utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/client/Utils")>()),
  translateText: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}|${Object.values(params).join("|")}` : key,
}));

describe("realistic world toggle", () => {
  it("applies only on the World map", () => {
    expect(realisticWorldApplies(GameMapType.World, true, undefined)).toBe(
      true,
    );
    expect(realisticWorldApplies(GameMapType.World, false, undefined)).toBe(
      false,
    );
    expect(realisticWorldApplies(GameMapType.Africa, true, undefined)).toBe(
      false,
    );
  });

  it("shows up in the lobby settings summary", () => {
    const config = testGameConfig({
      publicGameModifiers: { isRealisticWorld: true },
    });
    expect(notableLobbySettings(config, null).map((i) => i.label)).toContain(
      "real_world_mode.title",
    );
  });
});

function panel(opts: {
  realism: boolean;
  gold?: bigint;
  owned?: string[];
  spectator?: boolean;
  controllers?: { id: string; controllerSmallID: number | null }[];
  goldMultiplier?: number;
}) {
  const me = {
    smallID: () => 1,
    gold: () => opts.gold ?? 0n,
    techRanks: () => opts.owned ?? [],
  } as unknown as PlayerView;
  const game = {
    config: () => ({
      gameConfig: () => ({
        gameMap: GameMapType.World,
        publicGameModifiers: { isRealisticWorld: opts.realism },
        goldMultiplier: opts.goldMultiplier,
      }),
    }),
    myPlayer: () => me,
    isSpectator: () => opts.spectator ?? false,
    playerBySmallID: (id: number) => ({
      isPlayer: () => true,
      displayName: () => `P${id}`,
      territoryColor: () => ({ toHex: () => "#123456" }),
    }),
    chokepointControllers: () => opts.controllers ?? [],
  } as unknown as GameView;
  const eventBus = new EventBus();
  const el = new TechTreePanel();
  el.game = game;
  el.eventBus = eventBus;
  document.body.appendChild(el);
  return { el, eventBus };
}

async function openPanel(el: TechTreePanel, eventBus: EventBus) {
  await el.updateComplete;
  eventBus.emit(new ToggleTechTreeEvent());
  await el.updateComplete;
}

function buyButtons(el: HTMLElement): HTMLButtonElement[] {
  return Array.from(el.querySelectorAll("button")).filter(
    (b) => b.textContent?.trim() === "realism_panel.buy",
  );
}

describe("TechTreePanel", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("is hidden when realism is off", async () => {
    const { el, eventBus } = panel({ realism: false });
    await openPanel(el, eventBus);
    expect(el.style.display).toBe("none");
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });

  it("toggles with the event and closes on Escape or a backdrop click", async () => {
    const { el, eventBus } = panel({ realism: true });
    const dialog = () => el.querySelector<HTMLElement>('[role="dialog"]');
    await openPanel(el, eventBus);
    expect(dialog()).not.toBeNull();

    eventBus.emit(new ToggleTechTreeEvent());
    await el.updateComplete;
    expect(dialog()).toBeNull();

    await openPanel(el, eventBus);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await el.updateComplete;
    expect(dialog()).toBeNull();

    await openPanel(el, eventBus);
    el.querySelector<HTMLElement>(".fixed")!.click();
    await el.updateComplete;
    expect(dialog()).toBeNull();

    await openPanel(el, eventBus);
    dialog()!.click();
    await el.updateComplete;
    expect(dialog()).not.toBeNull();
  });

  it("shows owned, affordable, short and blocked node states", async () => {
    const { el, eventBus } = panel({
      realism: true,
      gold: 30_000n,
      owned: ["economy_1"],
    });
    await openPanel(el, eventBus);
    const text = el.textContent ?? "";

    expect(text).toContain("realism_panel.owned");
    expect(text).toContain(`tech_tree.need_more|${renderNumber(20_000n)}`);
    expect(text).toContain("tech_tree.requires|realism_panel.tech_economy_2");
    expect(text).toContain("tech_tree.requires|realism_panel.tech_military_1");
    // Only Conscript Drill (25k, unlocked, affordable) gets a Buy button.
    expect(buyButtons(el)).toHaveLength(1);
  });

  it("reports the rank cap instead of a prerequisite once it is full", async () => {
    const { el, eventBus } = panel({
      realism: true,
      gold: 1_000_000n,
      owned: [
        "military_1",
        "military_2",
        "military_3",
        "economy_1",
        "economy_2",
      ],
    });
    await openPanel(el, eventBus);
    expect(el.textContent).toContain("tech_tree.rank_cap_reached");
    expect(el.textContent).toContain("tech_tree.ranks_used|5|5");
    expect(buyButtons(el)).toHaveLength(0);
  });

  it("emits a purchase intent when Buy is clicked", async () => {
    const { el, eventBus } = panel({ realism: true, gold: 30_000n });
    const bought: string[] = [];
    eventBus.on(SendPurchaseTechIntentEvent, (e) => bought.push(e.techId));
    await openPanel(el, eventBus);

    // Economy is rendered first, so its tier 1 node is the first Buy.
    const buys = buyButtons(el);
    expect(buys).toHaveLength(2);
    buys[0].click();
    expect(bought).toEqual(["economy_1"]);
  });

  it("disables Buy for spectators and explains why", async () => {
    const { el, eventBus } = panel({
      realism: true,
      gold: 30_000n,
      spectator: true,
    });
    await openPanel(el, eventBus);
    const buys = buyButtons(el);
    expect(buys).toHaveLength(2);
    expect(buys.every((b) => b.disabled)).toBe(true);
    expect(el.textContent).toContain("tech_tree.not_playing");
  });

  it("shows gold and ranks in the footer", async () => {
    const { el, eventBus } = panel({ realism: true, gold: 30_000n });
    await openPanel(el, eventBus);
    expect(el.textContent).toContain(
      `tech_tree.footer_gold|${renderNumber(30_000n)}`,
    );
    expect(el.textContent).toContain("tech_tree.ranks_used|0|5");
  });

  it("lists straits you control first on the Straits tab", async () => {
    const mine = CHOKEPOINTS[CHOKEPOINTS.length - 1];
    const other = CHOKEPOINTS[0];
    const { el, eventBus } = panel({
      realism: true,
      controllers: [
        { id: other.id, controllerSmallID: 2 },
        { id: mine.id, controllerSmallID: 1 },
      ],
    });
    await openPanel(el, eventBus);
    el.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    await el.updateComplete;

    expect(el.textContent).not.toContain("realism_panel.tech_economy_1");
    expect(el.textContent).toContain("tech_tree.straits_intro");
    const firstRow = el.querySelector(".min-w-0 > div")?.textContent?.trim();
    expect(firstRow).toBe(`realism_panel.strait_${mine.id}`);
    expect(el.textContent).toContain("realism_panel.controller_you");
    expect(el.textContent).toContain("P2");
    expect(el.textContent).toContain(
      `tech_tree.toll_per_ship|${renderNumber(TIER_BASE_TOLL[mine.tier])}`,
    );
  });

  it("scales the strait toll by the game's gold multiplier", async () => {
    const tier = CHOKEPOINTS[0];
    const { el, eventBus } = panel({
      realism: true,
      goldMultiplier: 2,
      controllers: [{ id: tier.id, controllerSmallID: 1 }],
    });
    await openPanel(el, eventBus);
    el.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    await el.updateComplete;

    expect(el.textContent).toContain(
      `tech_tree.toll_per_ship|${renderNumber(BigInt(Math.round(TIER_BASE_TOLL[tier.tier] * 2)))}`,
    );
  });
});

describe("tech tree build bar button", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function unitDisplay(opts: {
    realism: boolean;
    gold: bigint;
    owned?: string[];
  }) {
    const player = {
      isAlive: () => true,
      gold: () => opts.gold,
      techRanks: () => opts.owned ?? [],
      buildables: async () => [],
      totalUnitLevels: () => 0,
      units: () => [],
    };
    const game = {
      config: () => ({
        isUnitDisabled: () => false,
        gameConfig: () => ({
          gameMap: GameMapType.World,
          publicGameModifiers: { isRealisticWorld: opts.realism },
        }),
      }),
      myPlayer: () => player,
      inSpawnPhase: () => false,
      isSpectator: () => false,
    } as unknown as GameView;
    const el = new UnitDisplay();
    el.game = game;
    el.eventBus = new EventBus();
    el.uiState = { ghostStructure: null } as unknown as UIState;
    el.init();
    el.tick();
    document.body.appendChild(el);
    return el;
  }

  const techButton = (el: HTMLElement) =>
    el.querySelector<HTMLButtonElement>(
      'button[title="tech_tree.button_tooltip|H"]',
    );

  it("is hidden when realism is off", async () => {
    const el = unitDisplay({ realism: false, gold: 1_000_000n });
    await el.updateComplete;
    expect(techButton(el)).toBeNull();
  });

  it("badges only when a node is affordable and unlocked", async () => {
    const poor = unitDisplay({ realism: true, gold: 0n });
    await poor.updateComplete;
    expect(techButton(poor)).not.toBeNull();
    expect(poor.querySelector("span.bg-sky-400")).toBeNull();

    const rich = unitDisplay({ realism: true, gold: 30_000n });
    await rich.updateComplete;
    expect(rich.querySelector("span.bg-sky-400")).not.toBeNull();
  });

  it("opens the tech tree when clicked", async () => {
    const el = unitDisplay({ realism: true, gold: 0n });
    const events: ToggleTechTreeEvent[] = [];
    el.eventBus.on(ToggleTechTreeEvent, (e) => events.push(e));
    await el.updateComplete;
    techButton(el)!.click();
    expect(events).toHaveLength(1);
  });
});

describe("tech tree hotkey", () => {
  it("defaults to KeyH, which no other default uses", () => {
    const defaults = getDefaultKeybinds(false);
    expect(defaults.toggleTechTree).toBe("KeyH");
    const clashes = Object.entries(defaults).filter(
      ([action, key]) => action !== "toggleTechTree" && key === "KeyH",
    );
    expect(clashes).toEqual([]);
  });
});

describe("coalition war button visibility", () => {
  const canDeclare = (realism: boolean, friendly: boolean) => {
    const proto = PlayerPanel.prototype as unknown as {
      isCoalitionWarEnabled(): boolean;
      canDeclareCoalitionWar(my: unknown, other: unknown): boolean;
    };
    const self = {
      isCoalitionWarEnabled: proto.isCoalitionWarEnabled,
      g: {
        config: () => ({
          gameConfig: () => ({
            gameMap: GameMapType.World,
            publicGameModifiers: { isRealisticWorld: realism },
          }),
        }),
      },
    };
    return proto.canDeclareCoalitionWar.call(
      self,
      { isFriendly: () => friendly },
      {},
    );
  };

  it("shows only in realism games against non-friendly players", () => {
    expect(canDeclare(true, false)).toBe(true);
    expect(canDeclare(true, true)).toBe(false);
    expect(canDeclare(false, false)).toBe(false);
  });
});

describe("coalition war candidates", () => {
  it("sends at most 32 nation allies and skips humans", () => {
    const ally = (id: number, type: PlayerType) => ({
      id: () => `p${id}`,
      type: () => type,
    });
    const allies = [
      ally(0, PlayerType.Human),
      ...Array.from({ length: 40 }, (_, i) => ally(i + 1, PlayerType.Nation)),
    ];
    const sent: SendDeclareCoalitionWarIntentEvent[] = [];
    const self = {
      isCoalitionWarEnabled: () => true,
      hide: () => {},
      eventBus: {
        emit: (e: SendDeclareCoalitionWarIntentEvent) => sent.push(e),
      },
    };
    const proto = PlayerPanel.prototype as unknown as {
      handleDeclareCoalitionWarClick(e: unknown, me: unknown, o: unknown): void;
    };
    proto.handleDeclareCoalitionWarClick.call(
      self,
      { stopPropagation: () => {} },
      { allies: () => allies },
      { displayName: () => "X" },
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].candidates).toHaveLength(32);
    expect(
      sent[0].candidates.every(
        (c) => (c as never as (typeof allies)[0]).type() === PlayerType.Nation,
      ),
    ).toBe(true);
  });
});

describe("tech-adjusted troop regen", () => {
  function view(opts: { realism: boolean; owned: string[]; troops: number }) {
    const player = {
      techRanks: () => opts.owned,
      troops: () => opts.troops,
    } as unknown as PlayerView;
    const game = {
      config: () => ({
        troopIncreaseRate: () => 100,
        maxTroops: () => 1000,
        gameConfig: () => ({
          gameMap: GameMapType.World,
          publicGameModifiers: { isRealisticWorld: opts.realism },
        }),
      }),
    } as unknown as GameView;
    return techAdjustedTroopIncrease(game, player);
  }

  it("scales positive regen by the troopRegen multiplier", () => {
    const { troopRegen } = computeMultipliers(new Set(["military_1"]));
    expect(troopRegen).toBeGreaterThan(1);
    expect(
      view({ realism: true, owned: ["military_1"], troops: 0 }),
    ).toBeCloseTo(100 * troopRegen);
  });

  it("leaves the rate alone without realism or without tech", () => {
    expect(view({ realism: false, owned: ["military_1"], troops: 0 })).toBe(
      100,
    );
    expect(view({ realism: true, owned: [], troops: 0 })).toBe(100);
  });

  it("never grows past the cap", () => {
    expect(view({ realism: true, owned: ["military_1"], troops: 995 })).toBe(5);
  });

  it("is off for a Compact map", () => {
    expect(
      realisticWorldApplies(GameMapType.World, true, GameMapSize.Compact),
    ).toBe(false);
  });
});
