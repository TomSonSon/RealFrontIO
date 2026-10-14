import { PlayerType } from "@openfront/engine-api/game/GameTypes";
import { EventBus } from "@openfront/shared/EventBus";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CountryPicker } from "../../src/client/hud/layers/CountryPicker";
import {
  CloseViewEvent,
  CountryPickEvent,
} from "../../src/client/InputHandler";
import { SendSpawnIntentEvent } from "../../src/client/Transport";
import {
  countryPickOwner,
  countryProfile,
  rosterCountry,
  strengthRank,
} from "../../src/client/utilities/CountryPick";
import type { GameView, PlayerView } from "../../src/client/view";

vi.mock("../../src/client/Utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/client/Utils")>()),
  translateText: (key: string, params?: Record<string, string | number>) =>
    params ? `${key} ${Object.values(params).join(" ")}` : key,
}));

const MAP_WIDTH = 10_000;

interface PlayerOpts {
  smallID?: number;
  name?: string;
  type?: PlayerType;
  troops?: number;
  alive?: boolean;
  spawned?: boolean;
}

function player(opts: PlayerOpts = {}) {
  return {
    smallID: () => opts.smallID ?? 1,
    name: () => opts.name ?? "United States",
    type: () => opts.type ?? PlayerType.Nation,
    troops: () => opts.troops ?? 0,
    gold: () => 2_000n,
    isAlive: () => opts.alive ?? true,
    hasSpawned: () => opts.spawned ?? false,
    isPlayer: () => true,
  };
}

interface GameOpts {
  realBorders?: boolean;
  spawnPhase?: boolean;
  me?: ReturnType<typeof player> | null;
  players?: ReturnType<typeof player>[];
}

function game(opts: GameOpts = {}) {
  const all = opts.players ?? [];
  return {
    config: () => ({ isRealBorders: () => opts.realBorders ?? true }),
    inSpawnPhase: () => opts.spawnPhase ?? true,
    myPlayer: () => opts.me ?? null,
    players: () => all,
    playerBySmallID: (id: number) =>
      all.find((p) => p.smallID() === id) ?? { isPlayer: () => false },
    ref: (x: number, y: number) => y * MAP_WIDTH + x,
  } as unknown as GameView;
}

const US = rosterCountry("United States");

function mount(view: GameView, bus = new EventBus()) {
  const el = new CountryPicker();
  el.game = view;
  el.eventBus = bus;
  el.init();
  document.body.append(el);
  return { el, bus };
}

async function pick(view: GameView, smallID = 1, opts?: { bus?: EventBus }) {
  const { el, bus } = mount(view, opts?.bus);
  bus.emit(new CountryPickEvent(smallID));
  await el.updateComplete;
  return { el, bus };
}

function buttonLabelled(el: HTMLElement, text: string) {
  return [...el.querySelectorAll("button")].find((b) =>
    b.textContent?.includes(text),
  );
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CountryPicker card visibility", () => {
  const usPlayer = player({ smallID: 1, troops: 1_500_000 });

  it("stays hidden outside real borders", async () => {
    const { el } = await pick(
      game({ realBorders: false, players: [usPlayer], me: null }),
    );
    expect(el.querySelector("button")).toBeNull();
  });

  it("stays hidden outside the spawn phase", async () => {
    const { el } = await pick(
      game({ spawnPhase: false, players: [usPlayer], me: null }),
    );
    expect(el.querySelector("button")).toBeNull();
  });

  it("hides once the local player has spawned", async () => {
    const { el } = await pick(
      game({
        players: [usPlayer],
        me: player({ spawned: true }),
      }),
    );
    expect(el.querySelector("button")).toBeNull();
  });

  it("shows the card for a country before spawning", async () => {
    const { el } = await pick(game({ players: [usPlayer], me: null }));
    expect(buttonLabelled(el, "country_picker.confirm")).toBeDefined();
  });
});

describe("CountryPicker card contents", () => {
  it("shows the country's fields", async () => {
    const strong = player({ smallID: 1, troops: 1_500_000 });
    const weak = player({ smallID: 2, name: "Iceland", troops: 10 });
    const { el } = await pick(game({ players: [strong, weak] }));
    const text = el.textContent ?? "";
    expect(text).toContain("United States");
    expect(text).toContain("country_picker.strength_rank 1 2");
    expect(text).toContain("country_picker.troops");
    expect(text).toContain("150K");
    expect(text).toContain("country_picker.gold");
    expect(text).toContain("country_picker.population");
    expect(text).toContain("country_picker.gdp");
    expect(text).toContain("$21.4T");
    expect(text).toContain(US!.continent);
    expect(text).toContain("country_picker.allies");
    expect(text).toContain("country_picker.rivals");
    expect(text).toContain("country_picker.neighbours");
  });

  it("confirm emits the spawn intent on the anchor tile and closes", async () => {
    const onSpawn = vi.fn();
    const bus = new EventBus();
    bus.on(SendSpawnIntentEvent, onSpawn);
    const { el } = await pick(game({ players: [player({ smallID: 1 })] }), 1, {
      bus,
    });
    buttonLabelled(el, "country_picker.confirm")!.click();
    await el.updateComplete;

    const [x, y] = US!.anchor;
    expect(onSpawn).toHaveBeenCalledTimes(1);
    expect(onSpawn.mock.calls[0][0].tile).toBe(y * MAP_WIDTH + x);
    expect(el.querySelector("button")).toBeNull();
  });

  it("closes on Escape (CloseViewEvent)", async () => {
    const { el, bus } = await pick(game({ players: [player({ smallID: 1 })] }));
    bus.emit(new CloseViewEvent());
    await el.updateComplete;
    expect(el.querySelector("button")).toBeNull();
  });

  it("closes when the same country is picked again", async () => {
    const view = game({ players: [player({ smallID: 1 })] });
    const { el, bus } = await pick(view);
    bus.emit(new CountryPickEvent(1));
    await el.updateComplete;
    expect(el.querySelector("button")).toBeNull();
  });
});

describe("strengthRank", () => {
  it("ranks living nations by troops and ignores others", () => {
    const a = player({ smallID: 1, troops: 500 });
    const b = player({ smallID: 2, troops: 900 });
    const c = player({ smallID: 3, troops: 100 });
    const dead = player({ smallID: 4, troops: 9_999, alive: false });
    const bot = player({ smallID: 5, troops: 9_999, type: PlayerType.Bot });
    const all = [a, b, c, dead, bot] as unknown as PlayerView[];
    expect(strengthRank(all, a as unknown as PlayerView)).toEqual({
      rank: 2,
      total: 3,
    });
    expect(strengthRank(all, b as unknown as PlayerView)).toEqual({
      rank: 1,
      total: 3,
    });
  });
});

describe("countryPickOwner", () => {
  function owned(owner: unknown, isLand = true) {
    return {
      isLand: () => isLand,
      owner: () => owner,
    } as unknown as GameView;
  }

  it("returns a nation owner whose name is in the roster", () => {
    const usOwner = player({ name: "United States" });
    const got = countryPickOwner(owned(usOwner), 0);
    expect(got).toBe(usOwner);
  });

  it("ignores ocean, unowned land, bots and non-roster nations", () => {
    expect(countryPickOwner(owned(player(), false), 0)).toBeNull();
    expect(countryPickOwner(owned({ isPlayer: () => false }), 0)).toBeNull();
    expect(
      countryPickOwner(
        owned(player({ type: PlayerType.Bot, name: "United States" })),
        0,
      ),
    ).toBeNull();
    expect(countryPickOwner(owned(player({ name: "Atlantis" })), 0)).toBeNull();
  });
});

describe("countryProfile", () => {
  it("lists rivals with a score of -50 or worse in either direction", () => {
    const profile = countryProfile(US!);
    expect(profile.rivals).toContain("Russia");
    expect(profile.rivals.length).toBeGreaterThan(0);
  });

  it("lists allies from the starting treaty blocs", () => {
    const profile = countryProfile(rosterCountry("United Kingdom")!);
    expect(profile.allies).toContain("United States");
  });

  it("lists land neighbours by roster name", () => {
    const profile = countryProfile(US!);
    expect(profile.neighbours).toContain("Canada");
  });
});
