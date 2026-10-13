import { CHOKEPOINTS } from "@openfront/engine-api/resources/Chokepoints";
import {
  canPurchaseTech,
  TECH_NODES,
  TechEffects,
} from "@openfront/engine-api/resources/TechNodes";
import { EventBus } from "@openfront/shared/EventBus";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SendPurchaseTechIntentEvent } from "../Transport";
import { realisticWorldApplies } from "../utilities/RealisticWorldToggle";
import { translateText } from "../Utils";
import { GameView } from "../view";

/**
 * Realistic World readout: the tech tree (buy nodes with gold) and who holds
 * each strait. Embedded by game-right-sidebar, collapsed behind a header, and
 * hidden entirely when realism is off.
 */
@customElement("realism-panel")
export class RealismPanel extends LitElement {
  @property({ attribute: false }) game!: GameView;
  @property({ attribute: false }) eventBus!: EventBus;
  // Bumped by the parent each tick so ownership and gold stay current.
  @property({ attribute: false }) refreshKey = 0;
  @state() private open = false;

  createRenderRoot() {
    return this;
  }

  private controllerName(smallID: number | null): string {
    if (smallID === null) return translateText("realism_panel.controller_none");
    if (smallID === this.game.myPlayer()?.smallID()) {
      return translateText("realism_panel.controller_you");
    }
    const owner = this.game.playerBySmallID(smallID);
    return owner.isPlayer()
      ? owner.displayName()
      : translateText("realism_panel.controller_none");
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

  private renderTech() {
    const me = this.game.myPlayer();
    if (me === null) return html``;
    const owned = me.techRanks();
    const gold = me.gold();
    return html`
      <div class="font-bold text-xs text-gray-300">
        ${translateText("realism_panel.tech_tree")}
      </div>
      ${TECH_NODES.map((node) => {
        const isOwned = owned.includes(node.id);
        const canBuy = canPurchaseTech(node.id, owned, gold);
        return html`
          <div class="flex items-center justify-between gap-3">
            <div>
              <div>${translateText(`realism_panel.tech_${node.id}`)}</div>
              <div class="text-xs text-gray-400">
                ${this.effectText(node.effects)} -
                ${translateText("realism_panel.cost", { cost: node.cost })}
              </div>
            </div>
            ${isOwned
              ? html`<span class="text-xs text-green-400">
                  ${translateText("realism_panel.owned")}
                </span>`
              : html`<button
                  class="px-2 py-0.5 text-xs rounded border border-white/30 enabled:hover:bg-white/10 disabled:opacity-40"
                  ?disabled=${!canBuy}
                  @click=${() =>
                    this.eventBus.emit(
                      new SendPurchaseTechIntentEvent(node.id),
                    )}
                >
                  ${canBuy
                    ? translateText("realism_panel.buy")
                    : translateText("realism_panel.locked")}
                </button>`}
          </div>
        `;
      })}
    `;
  }

  private renderStraits() {
    const controllers = new Map(
      this.game
        .chokepointControllers()
        .map((c) => [c.id, c.controllerSmallID] as const),
    );
    const mySmallID = this.game.myPlayer()?.smallID();
    return html`
      <div class="font-bold text-xs text-gray-300">
        ${translateText("realism_panel.straits")}
      </div>
      ${CHOKEPOINTS.map((c) => {
        const smallID = controllers.get(c.id) ?? null;
        const mine = smallID !== null && smallID === mySmallID;
        return html`
          <div
            class="flex items-center justify-between gap-3 ${mine
              ? "text-green-400 font-bold"
              : ""}"
          >
            <span>
              ${translateText(`realism_panel.strait_${c.id}`)}
              <span class="text-xs text-gray-400">
                (${translateText(`realism_panel.tier_${c.tier}`)})
              </span>
            </span>
            <span class="text-xs">${this.controllerName(smallID)}</span>
          </div>
        `;
      })}
    `;
  }

  render() {
    const gc = this.game?.config().gameConfig();
    const visible =
      gc !== undefined &&
      realisticWorldApplies(
        gc.gameMap,
        gc.publicGameModifiers?.isRealisticWorld === true,
        gc.gameMapSize,
      );
    this.style.display = visible ? "block" : "none";
    if (!visible) return html``;

    return html`
      <div
        class="w-fit flex flex-col gap-1.5 py-2 px-4 bg-gray-800/92 backdrop-blur-sm shadow-xs rounded-bl-lg text-white text-sm max-h-[60vh] overflow-y-auto"
      >
        <button
          class="font-bold tracking-wide text-left"
          @click=${() => (this.open = !this.open)}
        >
          ${translateText("realism_panel.title")}
        </button>
        ${this.open ? html`${this.renderTech()}${this.renderStraits()}` : ""}
      </div>
    `;
  }
}
