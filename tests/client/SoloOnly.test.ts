import type { GameID } from "@openfront/engine-api/Schemas";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserMe } from "../../src/client/Api";
import { userAuth } from "../../src/client/Auth";
import { ClientEnv } from "../../src/client/ClientEnv";
import "../../src/client/FeaturedStream";
import "../../src/client/GameModeSelector";
import { startSingleplayerHeartbeat } from "../../src/client/SingleplayerHeartbeat";

vi.mock("../../src/client/SoloOnly", () => ({ SOLO_ONLY: true }));

const { socketStart } = vi.hoisted(() => ({ socketStart: vi.fn() }));
vi.mock("../../src/client/LobbySocket", () => ({
  PublicLobbySocket: class {
    start = socketStart;
    stop(): void {}
  },
}));

vi.mock("../../src/client/LazyModals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/client/LazyModals")>()),
  whenModalLoaded: (_tag: string, open: () => void) => open(),
}));

beforeEach(() => {
  window.BOOTSTRAP_CONFIG = {
    gameEnv: "dev",
    numWorkers: 1,
    turnstileSiteKey: "",
    jwtAudience: "test",
    instanceId: "test",
    gitCommit: "test",
  };
  ClientEnv.reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  socketStart.mockClear();
  document.body.innerHTML = "";
  document.body.classList.remove("solo-only");
  window.BOOTSTRAP_CONFIG = undefined;
  ClientEnv.reset();
});

describe("solo-only build", () => {
  it("answers signed-out without any request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await userAuth()).toBe(false);
    expect(await getUserMe()).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("starts no heartbeat and renders no streams feed", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const stop = startSingleplayerHeartbeat("abcdefgh" as GameID);
    stop();
    const stream = document.createElement("featured-stream");
    document.body.appendChild(stream);
    await Promise.resolve();

    expect(stream.innerHTML).toBe("");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("hides online navigation under the solo-only body class", () => {
    const css = readFileSync(resolve("src/client/styles.css"), "utf8");
    const style = document.createElement("style");
    style.textContent = css.slice(css.indexOf("/* Solo-only build"));
    document.head.appendChild(style);
    document.body.classList.add("solo-only");

    const hidden = [
      "page-item-store",
      "page-inventory",
      "page-leaderboard",
      "page-clan",
      "page-news",
    ].map((page) => {
      const el = document.createElement("button");
      el.dataset.page = page;
      document.body.appendChild(el);
      return el;
    });
    const play = document.createElement("button");
    play.dataset.page = "page-play";
    document.body.appendChild(play);
    const account = document.createElement("nav-account-menu");
    document.body.appendChild(account);

    for (const el of [...hidden, account]) {
      expect(getComputedStyle(el).display).toBe("none");
    }
    expect(getComputedStyle(play).display).not.toBe("none");
    style.remove();
  });

  describe("solo home", () => {
    let selector: HTMLElement & { updateComplete: Promise<unknown> };
    let open: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      open = vi.fn();
      const modal = document.createElement(
        "single-player-modal",
      ) as HTMLElement & {
        open: typeof open;
      };
      modal.open = open;
      document.body.appendChild(modal);

      selector = document.createElement("game-mode-selector") as HTMLElement & {
        updateComplete: Promise<unknown>;
      };
      document.body.appendChild(selector);
      await selector.updateComplete;
    });

    it("renders only the solo cards and never starts the lobby socket", () => {
      const buttons = selector.querySelectorAll("button");
      expect(buttons).toHaveLength(3);
      expect(selector.querySelector("button.group")).toBeNull();
      expect(selector.querySelector("h2")).toBeNull();
      expect(socketStart).not.toHaveBeenCalled();
    });

    it("opens the solo setup with Realistic World on", () => {
      selector.querySelectorAll("button")[0].click();
      expect(open).toHaveBeenCalledWith({ realisticWorld: true });
    });

    it("opens the solo setup with Realistic World off for classic solo", () => {
      selector.querySelectorAll("button")[1].click();
      expect(open).toHaveBeenCalledWith({ realisticWorld: false });
    });
  });
});
