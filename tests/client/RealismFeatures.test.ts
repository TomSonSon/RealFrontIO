import { GameMapType, PlayerType } from "@openfront/engine-api/game/GameTypes";
import { CHOKEPOINTS } from "@openfront/engine-api/resources/Chokepoints";
import { EventBus } from "@openfront/shared/EventBus";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RealismPanel } from "../../src/client/components/RealismPanel";
import { PlayerPanel } from "../../src/client/hud/layers/PlayerPanel";
import {
  SendDeclareCoalitionWarIntentEvent,
  SendPurchaseTechIntentEvent,
} from "../../src/client/Transport";
import { notableLobbySettings } from "../../src/client/utilities/LobbySettingsSummary";
import { realisticWorldApplies } from "../../src/client/utilities/RealisticWorldToggle";
import type { GameView, PlayerView } from "../../src/client/view";
import { testGameConfig } from "../util/Wire";

vi.mock("../../src/client/Utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/client/Utils")>()),
  translateText: (key: string) => key,
}));

describe("realistic world toggle", () => {
  it("applies only on the World map", () => {
    expect(realisticWorldApplies(GameMapType.World, true)).toBe(true);
    expect(realisticWorldApplies(GameMapType.World, false)).toBe(false);
    expect(realisticWorldApplies(GameMapType.Africa, true)).toBe(false);
  });

  it("shows up in the lobby settings summary", () => {
    const config = testGameConfig({
      publicGameModifiers: { isRealisticWorld: true },
    });
    expect(notableLobbySettings(config, null).map((i) => i.label)).toContain(
      "game_settings.realistic_world",
    );
  });
});

function panel(opts: {
  realism: boolean;
  gold?: bigint;
  owned?: string[];
  controllers?: { id: string; controllerSmallID: number | null }[];
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
      }),
    }),
    myPlayer: () => me,
    playerBySmallID: (id: number) => ({
      isPlayer: () => true,
      displayName: () => `P${id}`,
    }),
    chokepointControllers: () => opts.controllers ?? [],
  } as unknown as GameView;
  const eventBus = new EventBus();
  const el = new RealismPanel();
  el.game = game;
  el.eventBus = eventBus;
  document.body.appendChild(el);
  return { el, eventBus };
}

describe("RealismPanel", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("is hidden when realism is off", async () => {
    const { el } = panel({ realism: false });
    await el.updateComplete;
    expect(el.style.display).toBe("none");
    expect(el.textContent?.trim()).toBe("");
  });

  it("lists nodes and straits once opened, and buys an affordable node", async () => {
    const { el, eventBus } = panel({
      realism: true,
      gold: 30_000n,
      controllers: [{ id: CHOKEPOINTS[0].id, controllerSmallID: 1 }],
    });
    const bought: string[] = [];
    eventBus.on(SendPurchaseTechIntentEvent, (e) => bought.push(e.techId));
    await el.updateComplete;
    el.querySelector<HTMLButtonElement>("button")!.click();
    await el.updateComplete;

    expect(el.textContent).toContain("realism_panel.tech_economy_3");
    expect(el.textContent).toContain(
      `realism_panel.strait_${CHOKEPOINTS[CHOKEPOINTS.length - 1].id}`,
    );
    expect(el.textContent).toContain("realism_panel.controller_you");
    expect(el.querySelector(".text-green-400")).not.toBeNull();

    const buttons = Array.from(el.querySelectorAll("button")).slice(1);
    const enabled = buttons.filter((b) => !b.disabled);
    expect(enabled).toHaveLength(2); // economy_1 and military_1 (25k)
    enabled[0].click();
    expect(bought).toEqual(["military_1"]);
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
