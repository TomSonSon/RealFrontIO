import {
  CHOKEPOINTS,
  TIER_BASE_TOLL,
} from "@openfront/engine-api/resources/Chokepoints";
import {
  canPurchaseTech,
  CAP_TOTAL_RANKS,
  isUnlocked,
  nodeById,
  TECH_NODES,
  TechBranch,
  TechEffects,
  TechNodeDef,
} from "@openfront/engine-api/resources/TechNodes";
import { renderNumber } from "@openfront/engine-lib/Format";
import { EventBus, GameEvent } from "@openfront/shared/EventBus";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SendPurchaseTechIntentEvent } from "../Transport";
import { realisticWorldActive } from "../utilities/RealisticWorldToggle";
import { translateText } from "../Utils";
import { GameView } from "../view";

/** Opens or closes the tech tree overlay (hotkey and build bar button). */
export class ToggleTechTreeEvent implements GameEvent {}

type TechTab = "technology" | "straits";
type NodeStatus = "owned" | "ready" | "short" | "blocked";

const CARD_CLASS: Record<NodeStatus, string> = {
  owned: "border-emerald-500/40 bg-white/[0.03]",
  ready: "border-sky-400/70 bg-sky-400/5",
  short: "border-white/15",
  blocked: "border-white/10 opacity-50",
};

const CHECK_ICON = html`<svg
  viewBox="0 0 24 24"
  class="size-3.5"
  fill="none"
  stroke="currentColor"
  stroke-width="2.5"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M5 12l5 5L20 7" />
</svg>`;

const CLOSE_ICON = html`<svg
  viewBox="0 0 24 24"
  class="size-4"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
>
  <path d="M6 6l12 12M18 6L6 18" />
</svg>`;

/**
 * Realistic World tech tree and strait list, shown as a centered overlay over
 * the running game. Opened and closed by ToggleTechTreeEvent and hidden
 * entirely when realism is off.
 */
@customElement("tech-tree-panel")
export class TechTreePanel extends LitElement {
  @property({ attribute: false }) game!: GameView;
  @property({ attribute: false }) eventBus!: EventBus;
  // Bumped by the parent each tick so ownership and gold stay current.
  @property({ attribute: false }) refreshKey = 0;
  @state() private open = false;
  @state() private tab: TechTab = "technology";

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.onKeydown);
    this.eventBus.on(ToggleTechTreeEvent, this.onToggle);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.onKeydown);
    this.eventBus.off(ToggleTechTreeEvent, this.onToggle);
    super.disconnectedCallback();
  }

  private readonly onToggle = () => {
    if (this.realismOn()) this.open = !this.open;
  };

  private readonly onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.open = false;
  };

  private realismOn(): boolean {
    return this.game !== undefined && realisticWorldActive(this.game);
  }

  private effectText(effects: TechEffects): string {
    return (Object.entries(effects) as [keyof TechEffects, number][])
      .map(([hook, value]) =>
        translateText(`realism_panel.effect_${hook}`, {
          pct: Math.round(value * 100),
        }),
      )
      .join(", ");
  }

  private nodeStatus(
    node: TechNodeDef,
    owned: string[],
    gold: bigint,
  ): NodeStatus {
    if (owned.includes(node.id)) return "owned";
    if (owned.length >= CAP_TOTAL_RANKS || !isUnlocked(new Set(owned), node.id))
      return "blocked";
    return canPurchaseTech(node.id, owned, gold) ? "ready" : "short";
  }

  private blockedText(node: TechNodeDef, owned: string[]): string {
    if (owned.length >= CAP_TOTAL_RANKS) {
      return translateText("tech_tree.rank_cap_reached");
    }
    const prev = nodeById(`${node.branch}_${node.tier - 1}`);
    if (prev === undefined) return "";
    return translateText("tech_tree.requires", {
      name: translateText(`realism_panel.tech_${prev.id}`),
    });
  }

  private renderAction(
    node: TechNodeDef,
    status: NodeStatus,
    owned: string[],
    gold: bigint,
    spectator: boolean,
  ) {
    if (status === "owned") {
      return html`<div
        class="flex items-center gap-1 text-xs text-emerald-300/80"
      >
        ${CHECK_ICON}${translateText("realism_panel.owned")}
      </div>`;
    }
    if (status === "short") {
      return html`<div class="text-xs text-gray-300">
        ${translateText("tech_tree.need_more", {
          amount: renderNumber(BigInt(node.cost) - gold),
        })}
      </div>`;
    }
    if (status === "blocked") {
      return html`<div class="text-xs text-gray-500">
        ${this.blockedText(node, owned)}
      </div>`;
    }
    return html`<div class="flex justify-end">
      <button
        type="button"
        class="rounded border border-sky-400/70 px-2.5 py-0.5 text-xs text-sky-100 enabled:hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-40"
        ?disabled=${spectator}
        @click=${() =>
          this.eventBus.emit(new SendPurchaseTechIntentEvent(node.id))}
      >
        ${translateText("realism_panel.buy")}
      </button>
    </div>`;
  }

  private renderCard(
    node: TechNodeDef,
    owned: string[],
    gold: bigint,
    spectator: boolean,
  ) {
    const status = this.nodeStatus(node, owned, gold);
    return html`<div
      class="flex flex-col gap-1 rounded-md border p-2.5 ${CARD_CLASS[status]}"
    >
      <div class="font-semibold">
        ${translateText(`realism_panel.tech_${node.id}`)}
      </div>
      <div class="text-xs text-gray-300">${this.effectText(node.effects)}</div>
      <div class="text-xs text-gray-400">
        ${translateText("realism_panel.cost", {
          cost: renderNumber(node.cost),
        })}
      </div>
      ${this.renderAction(node, status, owned, gold, spectator)}
    </div>`;
  }

  private renderBranch(
    branch: TechBranch,
    labelKey: string,
    owned: string[],
    gold: bigint,
    spectator: boolean,
  ) {
    const tiers = TECH_NODES.filter((n) => n.branch === branch).sort(
      (a, b) => a.tier - b.tier,
    );
    return html`<section class="flex flex-col">
      <h3
        class="mb-2 text-center text-xs font-semibold tracking-wide text-gray-400 uppercase"
      >
        ${translateText(labelKey)}
      </h3>
      ${tiers.map(
        (node, i) => html`
          ${i > 0
            ? html`<div class="mx-auto h-3 w-px bg-white/20"></div>`
            : nothing}
          ${this.renderCard(node, owned, gold, spectator)}
        `,
      )}
    </section>`;
  }

  private renderTechnology() {
    const owned = this.game.myPlayer()?.techRanks() ?? [];
    const gold = this.game.myPlayer()?.gold() ?? 0n;
    const spectator = this.game.isSpectator();
    return html`
      ${spectator
        ? html`<div class="text-xs text-gray-400">
            ${translateText("tech_tree.not_playing")}
          </div>`
        : nothing}
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
        ${this.renderBranch(
          "economy",
          "tech_tree.branch_economy",
          owned,
          gold,
          spectator,
        )}
        ${this.renderBranch(
          "military",
          "tech_tree.branch_military",
          owned,
          gold,
          spectator,
        )}
      </div>
      <div
        class="flex flex-wrap justify-between gap-2 border-t border-white/10 pt-2 text-xs text-gray-300"
      >
        <span>
          ${translateText("tech_tree.footer_gold", {
            gold: renderNumber(gold),
          })}
        </span>
        <span>
          ${translateText("tech_tree.ranks_used", {
            used: owned.length,
            max: CAP_TOTAL_RANKS,
          })}
        </span>
      </div>
    `;
  }

  private renderController(smallID: number | null) {
    const none = html`<span class="text-gray-400"
      >${translateText("realism_panel.controller_none")}</span
    >`;
    if (smallID === null) return none;
    const owner = this.game.playerBySmallID(smallID);
    if (!owner.isPlayer()) return none;
    const isMe = smallID === this.game.myPlayer()?.smallID();
    const name = isMe
      ? translateText("realism_panel.controller_you")
      : owner.displayName();
    return html`<span
        class="inline-block size-2.5 rounded-full"
        style="background-color: ${owner.territoryColor().toHex()}"
      ></span>
      <span>${name}</span>`;
  }

  private renderStraits() {
    const mySmallID = this.game.myPlayer()?.smallID();
    const controllers = new Map(
      this.game
        .chokepointControllers()
        .map((c) => [c.id, c.controllerSmallID] as const),
    );
    const goldMultiplier = this.game.config().gameConfig().goldMultiplier ?? 1;
    const rows = CHOKEPOINTS.map((c) => {
      const smallID = controllers.get(c.id) ?? null;
      return { c, smallID, mine: smallID !== null && smallID === mySmallID };
    }).sort((a, b) => Number(b.mine) - Number(a.mine));
    return html`
      <p class="mb-3 text-xs text-gray-300">
        ${translateText("tech_tree.straits_intro")}
      </p>
      <div class="flex flex-col gap-1.5">
        ${rows.map(
          ({ c, smallID, mine }) => html`
            <div
              class="flex items-center justify-between gap-3 rounded-md border px-2.5 py-2 ${mine
                ? "border-sky-400/70 bg-sky-400/10"
                : "border-white/10"}"
            >
              <div class="min-w-0">
                <div class=${mine ? "font-semibold" : ""}>
                  ${translateText(`realism_panel.strait_${c.id}`)}
                </div>
                <div class="text-xs text-gray-400">
                  ${translateText(`realism_panel.tier_${c.tier}`)} -
                  ${translateText("tech_tree.toll_per_ship", {
                    toll: renderNumber(
                      BigInt(
                        Math.round(TIER_BASE_TOLL[c.tier] * goldMultiplier),
                      ),
                    ),
                  })}
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-1.5 text-xs">
                ${this.renderController(smallID)}
              </div>
            </div>
          `,
        )}
      </div>
    `;
  }

  private renderTab(tab: TechTab, labelKey: string) {
    const active = this.tab === tab;
    return html`<button
      type="button"
      role="tab"
      aria-selected=${active ? "true" : "false"}
      class="-mb-px border-b-2 pb-2 ${active
        ? "border-sky-400 font-semibold text-white"
        : "border-transparent text-gray-400 hover:text-white"}"
      @click=${() => (this.tab = tab)}
    >
      ${translateText(labelKey)}
    </button>`;
  }

  render() {
    const visible = this.realismOn();
    this.style.display = visible ? "" : "none";
    if (!visible || !this.open) return nothing;

    return html`
      <div
        class="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        @click=${(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.open = false;
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label=${translateText("tech_tree.title")}
          class="flex max-h-[85vh] w-full max-w-3xl flex-col gap-3 rounded-lg bg-gray-800/95 p-4 text-sm text-white shadow-xl backdrop-blur-sm"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="text-base font-bold">
              ${translateText("tech_tree.title")}
            </div>
            <button
              type="button"
              class="text-gray-400 hover:text-white"
              aria-label=${translateText("tech_tree.close")}
              @click=${() => (this.open = false)}
            >
              ${CLOSE_ICON}
            </button>
          </div>
          <div role="tablist" class="flex gap-4 border-b border-white/10">
            ${this.renderTab("technology", "tech_tree.tab_technology")}
            ${this.renderTab("straits", "tech_tree.tab_straits")}
          </div>
          <div class="min-h-0 overflow-y-auto">
            ${this.tab === "technology"
              ? this.renderTechnology()
              : this.renderStraits()}
          </div>
        </div>
      </div>
    `;
  }
}
