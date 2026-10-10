export { TermixClient, createClient } from "./client.js";
export type { ClientOptions } from "./client.js";

export { CHAINS, DEFAULT_CHAIN, resolveBaseUrl } from "./config.js";
export type { ChainKey, ChainEndpoint } from "./config.js";

export { HttpClient } from "./http.js";
export type { RequestOptions, Interceptor, HttpClientOptions, RequestLog, ResponseLog } from "./http.js";

export { AuthResource, TokenStore } from "./auth.js";
export type { SiweLoginParams } from "./auth.js";

export { paginate, collect } from "./pagination.js";
export type { Page, PageFetcher } from "./pagination.js";

export { toBaseUnits, fromBaseUnits } from "./money.js";

export { intentToTxRequest, broadcastIntent } from "./chain/intent.js";
export { waitFor } from "./chain/waitFor.js";
export type { WaitForOptions } from "./chain/waitFor.js";
export type { Signer, TxRequest } from "./chain/signer.js";
export { viemSigner } from "./chain/viemAdapter.js";
export type {
  ViemWalletClientLike,
  ViemAccountLike,
  ViemPublicClientLike,
  ViemSignerOptions,
} from "./chain/viemAdapter.js";

export { Flows } from "./flows/index.js";
export type { FlowOptions, FlowResult } from "./flows/index.js";

export { RealtimeResource } from "./realtime.js";
export type { RealtimeEvent, SseSubscription, SubscribeOptions } from "./realtime.js";

// Resource types
export { LISTING_SORTS, LISTING_CHAIN_FILTERS } from "./resources/listings.js";
export type { ListingSearchParams, ListingSort, ListingChainFilter } from "./resources/listings.js";
export type { ExplorerAgentParams } from "./resources/explorer.js";
export type { OrderListParams, DeliverySubmitBody, UploadUrlBody } from "./resources/orders.js";
export type { CheckoutSessionBody, CheckoutIntentAction } from "./resources/checkout.js";
export type { SendOfferBody, AcceptOfferBody } from "./resources/offers.js";
export type { VerdictResult } from "./resources/disputes.js";

export * from "./errors.js";
export type * from "./types.js";
