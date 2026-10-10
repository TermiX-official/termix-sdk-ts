import { AuthResource, TokenStore } from "./auth.js";
import { HttpClient } from "./http.js";
import type { Interceptor } from "./http.js";
import { resolveBaseUrl, CHAINS } from "./config.js";
import type { ChainKey } from "./config.js";
import type { Signer } from "./chain/signer.js";
import type { ContractsConfig } from "./types.js";
import { ConfigResource } from "./resources/config.js";
import { ListingsResource } from "./resources/listings.js";
import { ExplorerResource } from "./resources/explorer.js";
import { StatsResource } from "./resources/stats.js";
import { AgentsResource } from "./resources/agents.js";
import { OrdersResource } from "./resources/orders.js";
import { OffersResource } from "./resources/offers.js";
import { CheckoutResource } from "./resources/checkout.js";
import { ConversationsResource } from "./resources/conversations.js";
import { DisputesResource, EvaluatorResource } from "./resources/disputes.js";
import { RequestsResource } from "./resources/requests.js";
import { CampaignsResource } from "./resources/campaigns.js";
import { RewardsResource } from "./resources/rewards.js";
import { MetricsResource } from "./resources/metrics.js";
import { AccountResource } from "./resources/account.js";
import { A2AResource } from "./resources/a2a.js";
import { SettingsResource } from "./resources/settings.js";
import { RealtimeResource } from "./realtime.js";
import { Flows } from "./flows/index.js";

export interface ClientOptions {
  /** Named chain (bsc | base | rh). Ignored when `baseUrl` is set. */
  chain?: ChainKey;
  /** Explicit API base override (self-host / dev / testnet). `/api/v1` appended if absent. */
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** Session JWT (from SIWE) to start with. */
  token?: string;
  refreshToken?: string;
  /** Programmatic API key (used as bearer when no session token is present). */
  apiKey?: string;
  /** Inject a Signer to enable mode B (internal sign + broadcast). Omit for mode A. */
  signer?: Signer;
  interceptors?: Interceptor[];
  fetchImpl?: typeof fetch;
  /** Called on configuration-drift warnings (default: console.warn). */
  onWarning?: (message: string) => void;
}

export class TermixClient {
  readonly http: HttpClient;
  readonly signer?: Signer;

  readonly auth: AuthResource;
  readonly config: ConfigResource;
  readonly listings: ListingsResource;
  readonly explorer: ExplorerResource;
  readonly stats: StatsResource;
  readonly agents: AgentsResource;
  readonly orders: OrdersResource;
  readonly offers: OffersResource;
  readonly checkout: CheckoutResource;
  readonly conversations: ConversationsResource;
  readonly disputes: DisputesResource;
  readonly evaluator: EvaluatorResource;
  readonly requests: RequestsResource;
  readonly campaigns: CampaignsResource;
  readonly rewards: RewardsResource;
  readonly metrics: MetricsResource;
  readonly account: AccountResource;
  readonly a2a: A2AResource;
  readonly settings: SettingsResource;
  readonly realtime: RealtimeResource;
  readonly flows: Flows;

  private _contracts?: ContractsConfig;
  private _chain?: ChainKey;
  private _baseUrlOverride: boolean;
  private _onWarning: (message: string) => void;
  private _compatChecked = false;

  constructor(options: ClientOptions = {}) {
    const store = new TokenStore(options.token, options.refreshToken);
    this._chain = options.chain;
    this._baseUrlOverride = Boolean(options.baseUrl);
    this._onWarning = options.onWarning ?? ((m) => console.warn(`[termix] ${m}`));
    const tokenProvider = () => store.access ?? options.apiKey;
    this.http = new HttpClient({
      baseUrl: resolveBaseUrl(options),
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
      interceptors: options.interceptors,
      fetchImpl: options.fetchImpl,
      tokenProvider,
      onUnauthorized: () => this.auth.tryRefresh(),
    });
    this.signer = options.signer;

    this.auth = new AuthResource(this.http, store);
    this.config = new ConfigResource(this.http);
    this.listings = new ListingsResource(this.http);
    this.explorer = new ExplorerResource(this.http);
    this.stats = new StatsResource(this.http);
    this.agents = new AgentsResource(this.http);
    this.orders = new OrdersResource(this.http);
    this.offers = new OffersResource(this.http);
    this.checkout = new CheckoutResource(this.http);
    this.conversations = new ConversationsResource(this.http);
    this.disputes = new DisputesResource(this.http);
    this.evaluator = new EvaluatorResource(this.http);
    this.requests = new RequestsResource(this.http);
    this.campaigns = new CampaignsResource(this.http);
    this.rewards = new RewardsResource(this.http);
    this.metrics = new MetricsResource(this.http);
    this.account = new AccountResource(this.http);
    this.a2a = new A2AResource(this.http);
    this.settings = new SettingsResource(this.http);
    this.realtime = new RealtimeResource(this.http.baseUrl, tokenProvider, options.fetchImpl ?? fetch);
    this.flows = new Flows(this);
  }

  /** Cached /config/contracts for this deployment. */
  async contracts(force = false): Promise<ContractsConfig> {
    if (!this._contracts || force) {
      this._contracts = await this.config.contracts();
      this.checkCompat(this._contracts);
    }
    return this._contracts;
  }

  /** Warn once if the live backend's chainId doesn't match the requested named chain
   *  (catches pointing e.g. a `bsc` client at the wrong backend). Skipped for baseUrl overrides. */
  private checkCompat(cfg: ContractsConfig): void {
    if (this._compatChecked) return;
    this._compatChecked = true;
    if (this._chain && !this._baseUrlOverride) {
      const expected = CHAINS[this._chain].chainId;
      if (cfg.chainId !== expected) {
        this._onWarning(
          `backend chainId ${cfg.chainId} does not match expected ${expected} for chain "${this._chain}"`,
        );
      }
    }
  }
}

/** Construct a client and warm the chain config. */
export async function createClient(options: ClientOptions = {}): Promise<TermixClient> {
  const client = new TermixClient(options);
  await client.contracts();
  return client;
}
