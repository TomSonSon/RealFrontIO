import type { RealismCountry } from "@openfront/engine-api/resources/RealismCountries";
import { renderNumber, renderTroops } from "@openfront/engine-lib/Format";
import { assetUrl } from "@openfront/shared/AssetUrls";
import { EventBus } from "@openfront/shared/EventBus";
import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { Controller } from "../../Controller";
import { CloseViewEvent, CountryPickEvent } from "../../InputHandler";
import { GoToPlayerEvent } from "../../TransformHandler";
import { SendSpawnIntentEvent } from "../../Transport";
import {
  countryProfile,
  rosterCountry,
  strengthRank,
} from "../../utilities/CountryPick";
import { translateText } from "../../Utils";
import { GameView, PlayerView } from "../../view";

const LIST_LIMIT = 6;
const NEIGHBOUR_LIMIT = 8;

// renderNumber stops at millions, so GDP gets its own scale.
function formatGdp(dollars: number): string {
  const scaled = (n: number) => Number(n.toFixed(1));
  if (dollars >= 1e12) return `$${scaled(dollars / 1e12)}T`;
  if (dollars >= 1e9) return `$${scaled(dollars / 1e9)}B`;
  return `$${scaled(dollars / 1e6)}M`;
}

@customElement("country-picker")
export class CountryPicker extends LitElement implements Controller {
  public game: GameView;
  public eventBus: EventBus;

  @state() private picked: PlayerView | null = null;

  createRenderRoot() {
    return this;
  }

  init() {
    this.eventBus.on(CountryPickEvent, (e) => this.onPick(e));
    this.eventBus.on(CloseViewEvent, () => this.close());
  }

  tick() {
    if (this.picked !== null) this.requestUpdate();
  }

  private canPick(): boolean {
    return (
      this.game.config().isRealBorders() &&
      this.game.inSpawnPhase() &&
      !this.game.myPlayer()?.hasSpawned()
    );
  }

  private onPick(event: CountryPickEvent) {
    const player = this.game.playerBySmallID(event.smallID);
    if (
      !this.canPick() ||
      !player.isPlayer() ||
      this.picked?.smallID() === event.smallID
    ) {
      this.close();
      return;
    }
    this.picked = player;
  }

  private close() {
    this.picked = null;
  }

  private confirm(player: PlayerView, country: RealismCountry) {
    const [x, y] = country.anchor;
    this.eventBus.emit(new SendSpawnIntentEvent(this.game.ref(x, y)));
    this.eventBus.emit(new GoToPlayerEvent(player, 10));
    this.close();
  }

  private stat(label: string, value: string) {
    return html`<div>
      <dt class="text-white/60">${translateText(label)}</dt>
      <dd class="font-medium">${value}</dd>
    </div>`;
  }

  private nameList(label: string, names: readonly string[], limit: number) {
    const shown = names.slice(0, limit);
    const hidden = names.length - shown.length;
    const text =
      shown.length === 0
        ? translateText("country_picker.none")
        : shown.join(", ") +
          (hidden > 0
            ? `, ${translateText("country_picker.and_more", { count: hidden })}`
            : "");
    return html`<div class="mt-4">
      <div class="text-white/60">${translateText(label)}</div>
      <div>${text}</div>
    </div>`;
  }

  render() {
    const player = this.picked;
    const country = player && rosterCountry(player.name());
    if (!player || !country || !this.canPick()) return nothing;

    const { rank, total } = strengthRank(this.game.players(), player);
    const profile = countryProfile(country);

    return html`<div
      class="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-slate-900 p-5 text-white shadow-2xl md:inset-x-auto md:bottom-auto md:right-4 md:top-20 md:max-h-[calc(100vh-6rem)] md:w-80 md:rounded-2xl"
    >
      <div class="flex items-center gap-3">
        ${country.flag
          ? html`<img
              src=${assetUrl(`flags/${country.flag}.svg`)}
              alt=""
              class="h-8 w-8 rounded-full object-cover"
            />`
          : nothing}
        <div class="min-w-0">
          <div class="truncate text-lg font-semibold">${country.name}</div>
          <div class="text-sm text-white/60">
            ${translateText("country_picker.strength_rank", { rank, total })}
          </div>
        </div>
      </div>

      <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
        ${this.stat("country_picker.troops", renderTroops(player.troops()))}
        ${this.stat("country_picker.gold", renderNumber(player.gold()))}
        ${this.stat(
          "country_picker.population",
          renderNumber(country.population),
        )}
        ${this.stat("country_picker.gdp", formatGdp(country.gdpMd * 1_000_000))}
        ${this.stat("country_picker.continent", country.continent)}
        ${this.stat("country_picker.tiles", renderNumber(country.tiles))}
      </dl>

      ${this.nameList("country_picker.allies", profile.allies, LIST_LIMIT)}
      ${this.nameList("country_picker.rivals", profile.rivals, LIST_LIMIT)}
      ${this.nameList(
        "country_picker.neighbours",
        profile.neighbours,
        NEIGHBOUR_LIMIT,
      )}

      <div class="mt-5 flex flex-col gap-2">
        <button
          class="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500"
          @click=${() => this.confirm(player, country)}
        >
          ${translateText("country_picker.confirm", { country: country.name })}
        </button>
        <button
          class="w-full rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10"
          @click=${() => this.close()}
        >
          ${translateText("country_picker.cancel")}
        </button>
      </div>
    </div>`;
  }
}
