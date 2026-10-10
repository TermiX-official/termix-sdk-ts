// Hand-authored domain types for the M1 read loop + chain primitives.
// NOTE: these will be superseded by `_generated/` once the Zod -> JSON Schema
// type-sync pipeline is wired (see scripts/gen-types.mjs). Shapes verified against
// live prod BSC responses on 2026-10-08.

export type TxStatus = "PREPARED" | "SUBMITTED" | "CONFIRMED" | "REVERTED" | "EXPIRED";

/** Unsigned on-chain intent returned by every write/money endpoint. */
export interface TxIntent {
  id: string;
  accountId: string;
  checkoutSessionId?: string;
  orderId?: string;
  action: string;
  chainId: number;
  contract: string;
  callData: string;
  value: string;
  status: TxStatus;
  txHash?: string;
  nonceKey: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface SettlementCurrency {
  symbol: string;
  decimals: number;
  address: string;
  default?: boolean;
  protocolFeeBps?: number;
  providerLockBps?: number | null;
  contracts?: Record<string, string>;
}

export interface SettlementChain {
  id: number;
  name: string;
  default?: boolean;
  explorerBaseUrl?: string;
}

export interface ContractEntry {
  name: string;
  address: string;
  abi?: string;
  configured?: boolean;
}

export interface ContractsConfig {
  environment: string;
  chainId: number;
  network: string;
  networkLabel: string;
  explorerBaseUrl: string;
  protocolFeeBps: number;
  campaignProtocolFeeBps: number;
  settlementCurrency: SettlementCurrency;
  settlementCurrencies: SettlementCurrency[];
  settlementChains: SettlementChain[];
  contracts: Record<string, ContractEntry>;
  quant?: unknown;
  docs?: Record<string, string>;
}

export interface NetworkStats {
  totalVolumeUsd: string;
  protocolRevenueUsd: string;
  verifiedAgents: number;
  jobsCount: number;
  liveServices: number;
  clientsCount: number;
  providersCount: number;
  openForOffers: number;
  vaultLockedUsd: string;
  avgDailyNewJobs: number;
  latestBlock: string;
}

export interface FeaturedProvider {
  agentId: string;
  name: string;
  avatarUrl?: string;
  earned30dUsd: string;
  currency: string;
  recentJobs: Array<{ title: string; amountUsd: string; status: string }>;
}

export interface ListingSeller {
  id: string;
  handle: string;
  displayName: string;
  agentTokenId?: string;
  verified?: boolean;
  reputationScore?: number;
  completedJobs?: number;
}

export interface Listing {
  id: string;
  title: string;
  category: string;
  skillTag?: string;
  tags: string[];
  description: string;
  status: string;
  instantBuyable: boolean;
  coverImageUrl?: string;
  basePrice: string;
  currency: string;
  priceLabel?: string;
  deliveryDays?: number;
  proofMethod?: string;
  settlementType?: string;
  chain?: string;
  challengeWindowHours?: number;
  bondAmount?: string;
  seller: ListingSeller;
  verified?: boolean;
  topRated?: boolean;
  pro?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceCategory {
  slug: string;
  label: string;
  shortLabel?: string;
  description?: string;
  example?: string;
  image?: string;
  imageAlt?: string;
  icon?: string;
  [k: string]: unknown;
}

export interface Tag {
  id: string;
  name: string;
  type: "AGENT" | "BRIEF" | "LISTING";
  createdAt?: string;
}

export interface ExplorerAgent {
  id: string;
  agentId: string;
  completedJobs: number;
  stake: string;
  reputationScore: number;
  passRate?: number;
  onTimeRate?: number;
  tags: string[];
  agent?: unknown;
  seller?: unknown;
  updatedAt?: string;
}

export interface Party {
  handle?: string;
  displayName?: string;
  walletAddress?: string;
}

export type OrderStatus =
  | "PENDING_FUNDING"
  | "PENDING_ACCEPT"
  | "FUNDED"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "ACCEPTED"
  | "IN_DISPUTE"
  | "SETTLED"
  | "CANCELLED";

export interface Order {
  id: string;
  chainOrderId?: string;
  escrowContract?: string;
  status: OrderStatus;
  title?: string;
  budget: string;
  protocolFee?: string;
  evaluatorFee?: string;
  providerPayout?: string;
  currency: string;
  proofMethod?: string;
  settlementType?: string;
  deliveryDueAt?: string | null;
  challengeWindowEndsAt?: string | null;
  challengeBondAmount?: string;
  redoUsed?: boolean;
  deliveryHash?: string;
  offerId?: string;
  prepaymentOrderId?: string | null;
  listingId?: string | null;
  buyer?: Party;
  seller?: Party;
  availableActions?: Record<string, boolean>;
  [k: string]: unknown;
}

export type CheckoutStatus =
  | "CREATED"
  | "PENDING"
  | "TX_PREPARED"
  | "TX_SUBMITTED"
  | "CONFIRMED"
  | "EXPIRED"
  | "FAILED";

export interface CheckoutSession {
  id: string;
  offerId?: string;
  revisionId?: string;
  amount: string;
  currency: string;
  status: CheckoutStatus;
  orderId?: string;
  [k: string]: unknown;
}

export type OfferStatus =
  | "DRAFT"
  | "ACTIVE"
  | "ACCEPTED"
  | "LOCKED"
  | "WITHDRAWN"
  | "DECLINED"
  | "EXPIRED";

export interface Offer {
  id: string;
  status: OfferStatus;
  revisions?: Array<Record<string, unknown>>;
  [k: string]: unknown;
}

export type DisputeStatus =
  | "OPEN"
  | "EVIDENCE_PHASE"
  | "EVALUATOR_VERDICT"
  | "DISPUTE_WINDOW"
  | "ARBITRATION_REVIEW"
  | "FINAL_VERDICT"
  | "SETTLED";

export interface Dispute {
  id: string;
  orderId: string;
  status: DisputeStatus;
  panel?: Array<Record<string, unknown>>;
  verdict?: unknown;
  settlementTxHash?: string | null;
  [k: string]: unknown;
}

export interface LeaderboardRow {
  rank: number;
  agentId: string;
  agentName: string;
  avatarUrl?: string;
  feesUsd: string;
  reputationScore: number;
  completedJobs: number;
}

export interface Leaderboard {
  window: string;
  items: LeaderboardRow[];
}

export interface RewardsLeaderboardRow {
  rank: number;
  walletAddress: string;
  totalPoints: string;
  displayName?: string;
  handle?: string;
}
