import {
  DeclareCoalitionWarIntentSchema,
  IntentSchema,
  StampedIntentSchema,
} from "@openfront/engine-api/Schemas";
import { EventBus } from "@openfront/shared/EventBus";
import { ServerMessage } from "@openfront/shared/WireSchemas";
import {
  createGameWireContext,
  decodeClientMessage,
  encodeServerMessage,
} from "@openfront/shared/ZbinWire";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testGameConfig } from "../util/Wire";

// section 8.6 coalition war declaration - client side: the intent schema parses the
// target + candidate ids the UI sends, and the Transport's send path turns a
// SendDeclareCoalitionWarIntentEvent into a decodable declare_coalition_war
// frame exactly matching the engine's DeclareCoalitionWarExecution inputs.

vi.mock("../../src/client/ClientEnv", () => ({
  ClientEnv: {
    workerPath: () => "w0",
    serverWsBase: () => "ws://game.test",
    gameWorkerPath: () => "w0",
    gameWsBase: () => "ws://game.test",
    gameHttpBase: () => "http://game.test",
    gitCommit: () => "test-commit",
  },
}));
vi.mock("../../src/client/Auth", () => ({
  getPlayToken: async () => "8f1d2c3e-4b5a-4c6d-8e7f-90a1b2c3d4e5",
}));
const localServer = vi.hoisted(() => ({
  onMessage: vi.fn(),
  start: vi.fn(),
  updateCallback: vi.fn(),
  endGame: vi.fn(),
}));
vi.mock("../../src/client/LocalServer", () => ({
  LocalServer: class {
    onMessage = localServer.onMessage;
    start = localServer.start;
    updateCallback = localServer.updateCallback;
    endGame = localServer.endGame;
  },
}));
vi.mock("../../src/client/InGameModal", () => ({
  showInGameConfirm: async () => false,
}));
vi.mock("../../src/client/Utils", () => ({
  translateText: (key: string) => key,
  homeHref: () => "/",
}));

import type { LobbyConfig } from "../../src/client/ClientGameRunner";
import {
  SendDeclareCoalitionWarIntentEvent,
  Transport,
} from "../../src/client/Transport";
import type { PlayerView } from "../../src/client/view";

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  binaryType = "blob";
  sent: Uint8Array[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  onerror: ((err: unknown) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: Uint8Array) {
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }

  serverOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  serverSend(msg: ServerMessage) {
    this.onmessage?.({ data: encodeServerMessage(msg, undefined).buffer });
  }
}

function makeTransport(extra: Partial<LobbyConfig> = {}) {
  const lobbyConfig = {
    gameID: "game1234",
    playerName: "tester",
    spectator: false,
    ...extra,
  } as unknown as LobbyConfig;
  const eventBus = new EventBus();
  return { transport: new Transport(lobbyConfig, eventBus), eventBus };
}

function handshake(transport: Transport): FakeWebSocket {
  transport.connect(
    () => {},
    () => {},
  );
  const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  ws.serverOpen();
  ws.serverSend({
    type: "start",
    turns: [],
    lobbyCreatedAt: 1_700_000_000_000,
    myClientID: "c0000001",
    gameStartInfo: {
      gameID: "game1234",
      lobbyCreatedAt: 1_700_000_000_000,
      config: testGameConfig(),
      players: [],
      tribes: [],
    },
  });
  return ws;
}

function decodeFrames(ws: FakeWebSocket) {
  return ws.sent.map((f) => decodeClientMessage(f, createGameWireContext([])));
}

describe("declare_coalition_war intent schema", () => {
  it("parses a target with candidate ids", () => {
    const intent = IntentSchema.parse({
      type: "declare_coalition_war",
      target: "player01",
      candidates: ["player02", "player03"],
    });
    expect(intent).toEqual({
      type: "declare_coalition_war",
      target: "player01",
      candidates: ["player02", "player03"],
    });
  });

  it("accepts zero candidates (no allies)", () => {
    const intent = IntentSchema.parse({
      type: "declare_coalition_war",
      target: "player01",
      candidates: [],
    });
    if (intent.type !== "declare_coalition_war") {
      throw new Error("expected a declare_coalition_war intent");
    }
    expect(intent.candidates).toEqual([]);
  });

  it("rejects an intent missing candidates", () => {
    expect(
      IntentSchema.safeParse({
        type: "declare_coalition_war",
        target: "player01",
      }).success,
    ).toBe(false);
  });

  it("survives stamping (rides a turn as a StampedIntent)", () => {
    const stamped = StampedIntentSchema.parse({
      type: "declare_coalition_war",
      target: "player02",
      candidates: ["player01"],
      clientID: "player01",
    });
    expect(stamped.type).toBe("declare_coalition_war");
    expect(stamped.clientID).toBe("player01");
  });

  it("round-trips the typed schema", () => {
    const parsed = DeclareCoalitionWarIntentSchema.parse({
      type: "declare_coalition_war",
      target: "player01",
      candidates: ["player02"],
    });
    expect(parsed.candidates).toEqual(["player02"]);
  });
});

describe("declare_coalition_war client-to-engine path", () => {
  let transports: Transport[];

  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
    localServer.onMessage.mockClear();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    transports = [];
  });

  afterEach(() => {
    for (const t of transports) t.leaveGame();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function connected() {
    const made = makeTransport();
    transports.push(made.transport);
    return { ...made, ws: handshake(made.transport) };
  }

  it("turns a SendDeclareCoalitionWarIntentEvent into a decodable frame", () => {
    const { eventBus, ws } = connected();
    const player = (id: string): PlayerView =>
      ({ id: () => id }) as unknown as PlayerView;

    eventBus.emit(
      new SendDeclareCoalitionWarIntentEvent(player("player01"), [
        player("player02"),
        player("player03"),
      ]),
    );

    expect(decodeFrames(ws)).toContainEqual({
      type: "intent",
      intent: {
        type: "declare_coalition_war",
        target: "player01",
        candidates: ["player02", "player03"],
      },
    });
  });
});
