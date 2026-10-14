import { GameMapType } from "@openfront/engine-api/game/GameTypes";
import { coalitionSanctionPercent } from "@openfront/engine-api/resources/Sanctions";
import { render, type TemplateResult } from "lit";
import { describe, expect, it, vi } from "vitest";
import { PlayerPanel } from "../../src/client/hud/layers/PlayerPanel";
import type { GameView, PlayerView } from "../../src/client/view";

vi.mock("../../src/client/Utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/client/Utils")>()),
  translateText: (key: string, params?: Record<string, string | number>) =>
    params ? `${key} ${Object.values(params).join(" ")}` : key,
}));

interface PlayerOpts {
  reputation?: number;
  allianceBlocked?: boolean;
  allied?: boolean;
  embargoSenders?: number;
  troops?: number;
  gold?: number;
}

// Stub PlayerView. `embargoes` holds the players this one embargoes.
function player(opts: PlayerOpts = {}) {
  const embargoes = new Set<unknown>();
  return {
    embargoes,
    reputation: () => opts.reputation ?? 0,
    allianceBlocked: () => opts.allianceBlocked ?? false,
    embargoSenders: () => opts.embargoSenders ?? 0,
    troops: () => opts.troops ?? 0,
    gold: () => BigInt(opts.gold ?? 0),
    isAlliedWith: () => opts.allied ?? false,
    hasEmbargoAgainst: (other: unknown) => embargoes.has(other),
  };
}

function diplomacyText(opts: {
  realism?: boolean;
  me: ReturnType<typeof player>;
  other: ReturnType<typeof player>;
}): string {
  const panel = new PlayerPanel();
  panel.g = {
    config: () => ({
      gameConfig: () => ({
        gameMap: GameMapType.World,
        publicGameModifiers: { isRealisticWorld: opts.realism ?? true },
      }),
    }),
  } as unknown as GameView;
  const host = document.createElement("div");
  const view = panel as unknown as {
    renderDiplomacy(my: PlayerView, other: PlayerView): TemplateResult;
  };
  render(
    view.renderDiplomacy(
      opts.me as unknown as PlayerView,
      opts.other as unknown as PlayerView,
    ),
    host,
  );
  return host.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

describe("diplomacy block visibility", () => {
  it("is hidden when realism is off", () => {
    const me = player();
    const other = player();
    expect(diplomacyText({ realism: false, me, other })).toBe("");
  });

  it("is hidden when looking at your own country", () => {
    const me = player({ troops: 100 });
    expect(diplomacyText({ me, other: me })).toBe("");
  });
});

describe("diplomacy block rows", () => {
  it("standing: good, shaky and betrayer by reputation", () => {
    const me = player();
    expect(diplomacyText({ me, other: player({ reputation: 0 }) })).toContain(
      "diplomacy.standing_good",
    );
    expect(diplomacyText({ me, other: player({ reputation: -29 }) })).toContain(
      "diplomacy.standing_shaky",
    );
    expect(diplomacyText({ me, other: player({ reputation: -30 }) })).toContain(
      "diplomacy.standing_shaky",
    );
    expect(
      diplomacyText({
        me,
        other: player({ reputation: -30, allianceBlocked: true }),
      }),
    ).toContain("diplomacy.standing_betrayer");
  });

  it("standing hint appears only while alliances are blocked", () => {
    const me = player();
    expect(
      diplomacyText({
        me,
        other: player({ reputation: -30, allianceBlocked: true }),
      }),
    ).toContain("diplomacy.alliances_blocked");
    expect(
      diplomacyText({ me, other: player({ reputation: -10 }) }),
    ).not.toContain("diplomacy.alliances_blocked");
  });

  it("alliance: allied, can ally, blocked by the other, blocked by me", () => {
    const other = player();
    expect(diplomacyText({ me: player({ allied: true }), other })).toContain(
      "diplomacy.allied",
    );
    expect(diplomacyText({ me: player(), other })).toContain(
      "diplomacy.can_ally",
    );
    expect(
      diplomacyText({ me: player(), other: player({ allianceBlocked: true }) }),
    ).toContain("diplomacy.blocked_betrayer");
    expect(
      diplomacyText({ me: player({ allianceBlocked: true }), other }),
    ).toContain("diplomacy.you_cannot_ally");
  });

  it("trade: open, you embargo them, they embargo you, mutual", () => {
    const me = player();
    const other = player();
    expect(diplomacyText({ me, other })).toContain("diplomacy.trade_open");

    me.embargoes.add(other);
    expect(diplomacyText({ me, other })).toContain(
      "diplomacy.trade_you_embargo",
    );

    me.embargoes.clear();
    other.embargoes.add(me);
    expect(diplomacyText({ me, other })).toContain(
      "diplomacy.trade_they_embargo",
    );

    me.embargoes.add(other);
    expect(diplomacyText({ me, other })).toContain("diplomacy.trade_mutual");
  });

  it("sanctions: hidden with no senders, income cut for one and two or more", () => {
    const me = player();
    expect(diplomacyText({ me, other: player() })).not.toContain(
      "diplomacy.sanctions",
    );
    expect(
      diplomacyText({ me, other: player({ embargoSenders: 1 }) }),
    ).toContain("diplomacy.sanctioned_by 1 25");
    expect(
      diplomacyText({ me, other: player({ embargoSenders: 2 }) }),
    ).toContain("diplomacy.sanctioned_by 2 50");
    expect(
      diplomacyText({ me, other: player({ embargoSenders: 4 }) }),
    ).toContain("diplomacy.sanctioned_by 4 50");
  });

  it("strength: much stronger, comparable and much weaker by troop ratio", () => {
    const me = player({ troops: 300_000 });
    expect(
      diplomacyText({ me, other: player({ troops: 1_200_000 }) }),
    ).toContain("diplomacy.strength_much_stronger");
    expect(diplomacyText({ me, other: player({ troops: 450_000 }) })).toContain(
      "diplomacy.strength_comparable",
    );
    expect(diplomacyText({ me, other: player({ troops: 150_000 }) })).toContain(
      "diplomacy.strength_much_weaker",
    );
    expect(
      diplomacyText({
        me: player({ troops: 0 }),
        other: player({ troops: 5 }),
      }),
    ).toContain("diplomacy.strength_much_stronger");
  });

  it("shows troops and gold next to your own, abbreviated", () => {
    const text = diplomacyText({
      me: player({ troops: 300_000, gold: 90_000 }),
      other: player({ troops: 1_200_000, gold: 480_000 }),
    });
    expect(text).toContain("diplomacy.amount_vs_yours 120K 30.0K");
    expect(text).toContain("diplomacy.amount_vs_yours 480K 90.0K");
  });
});

describe("coalitionSanctionPercent", () => {
  it("is 100 with no senders, 75 with one, and 50 from two up", () => {
    expect(coalitionSanctionPercent(0)).toBe(100);
    expect(coalitionSanctionPercent(1)).toBe(75);
    expect(coalitionSanctionPercent(2)).toBe(50);
    expect(coalitionSanctionPercent(7)).toBe(50);
  });
});
