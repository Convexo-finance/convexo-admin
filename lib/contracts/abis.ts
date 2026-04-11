// Core Convexo Protocol ABIs - Version 3.18
// All ABIs are direct arrays from deployment artifacts
// Updated with new tier system: Passport (1) → LimitedPartner (2) → VaultCreator (3)

// NFT Contracts - Tier System
import ConvexoPassportABI from '@/abis/Convexo_Passport.json';
import LPIndividualsABI from '@/abis/Limited_Partners_Individuals.json';
import LPBusinessABI from '@/abis/Limited_Partners_Business.json';
import EcreditscoringABI from '@/abis/Ecreditscoring.json';

// Core Protocol Contracts
import ReputationManagerABI from '@/abis/ReputationManager.json';
import VaultFactoryABI from '@/abis/VaultFactory.json';
import TokenizedBondVaultABI from '@/abis/TokenizedBondVault.json';
// @deprecated v3.18: TreasuryFactory and TreasuryVault removed — JSON artifacts deleted
const TreasuryFactoryABI: never[] = [];
const TreasuryVaultABI: never[] = [];

// Verification & Compliance
import VeriffVerifierABI from '@/abis/VeriffVerifier.json';
import SumsubVerifierABI from '@/abis/SumsubVerifier.json';
import ContractSignerABI from '@/abis/ContractSigner.json';

// Pool & Hook Contracts
import PoolRegistryABI from '@/abis/PoolRegistry.json';
import PriceFeedManagerABI from '@/abis/PriceFeedManager.json';
import PassportGatedHookABI from '@/abis/PassportGatedHook.json';
import HookDeployerABI from '@/abis/HookDeployer.json';

// Legacy aliases for backwards compatibility
const ConvexoLPsABI = LPIndividualsABI;
const ConvexoVaultsABI = LPBusinessABI;
const CompliantLPHookABI = PassportGatedHookABI;

// Export all ABIs
export {
  // NFT Contracts - Tier System
  ConvexoPassportABI,        // Tier 1 - ZKPassport verified
  LPIndividualsABI,          // Tier 2 - Veriff verified individuals
  LPBusinessABI,             // Tier 2 - Sumsub verified businesses
  EcreditscoringABI,         // Tier 3 - AI Credit Scored
  
  // Legacy NFT Contracts (backwards compatibility - aliases)
  ConvexoLPsABI,             // → LPIndividualsABI
  ConvexoVaultsABI,          // → LPBusinessABI
  
  // Core Protocol Contracts
  ReputationManagerABI,
  VaultFactoryABI,
  TokenizedBondVaultABI,
  // @deprecated v3.17 — TreasuryFactory and TreasuryVault removed from protocol
  TreasuryFactoryABI,
  TreasuryVaultABI,
  
  // Verification & Compliance
  VeriffVerifierABI,
  SumsubVerifierABI,
  ContractSignerABI,
  
  // Pool & Hook Contracts
  PoolRegistryABI,
  PriceFeedManagerABI,
  PassportGatedHookABI,
  CompliantLPHookABI,        // → PassportGatedHookABI (alias)
  HookDeployerABI,
};

// Type definitions for contract function returns
export interface VaultInfo {
  vaultId: bigint;
  borrower: `0x${string}`;
  contractHash: `0x${string}`;
  principalAmount: bigint;
  interestRate: bigint;
  protocolFeeRate: bigint;
  maturityDate: bigint;
  state: number;
  totalRaised: bigint;
  totalRepaid: bigint;
  createdAt: bigint;
  fundedAt: bigint;
  contractAttachedAt: bigint;
  fundsWithdrawnAt: bigint;
}

export interface VaultMetrics {
  totalShares: bigint;
  sharePrice: bigint;
  totalValueLocked: bigint;
  targetAmount: bigint;
  fundingProgress: bigint;
  currentAPY: bigint;
}

export interface InvestorReturn {
  invested: bigint;
  currentValue: bigint;
  profit: bigint;
  apy: bigint;
}

export interface RepaymentStatus {
  totalDue: bigint;
  totalPaid: bigint;
  remaining: bigint;
  protocolFee: bigint;
}

export interface AccruedInterest {
  accruedInterest: bigint;
  remainingInterest: bigint;
}

// Updated ReputationDetails for v3.0 tier system
export interface ReputationDetails {
  tier: ReputationTier;
  passportBalance: bigint;        // Tier 1
  lpIndividualsBalance: bigint;   // Tier 2
  lpBusinessBalance: bigint;      // Tier 2
  ecreditscoringBalance: bigint;  // Tier 3
}

export interface VerifiedIdentity {
  uniqueIdentifier: `0x${string}`;
  personhoodProof: `0x${string}`;
  verifiedAt: bigint;
  zkPassportTimestamp: bigint;
  isActive: boolean;
  kycVerified: boolean;
  sanctionsPassed: boolean;
  isOver18: boolean;
}

export interface VerificationRecord {
  user: `0x${string}`;
  veriffSessionId: string;
  status: number;
  submittedAt: bigint;
  processedAt: bigint;
  processor: `0x${string}`;
  rejectionReason: string;
  nftTokenId: bigint;
}

export interface ContractDocument {
  documentHash: `0x${string}`;
  agreementType: number;
  initiator: `0x${string}`;
  createdAt: bigint;
  expiresAt: bigint;
  isExecuted: boolean;
  isCancelled: boolean;
  ipfsHash: string;
  nftReputationTier: bigint;
  vaultId: bigint;
}

export interface Signature {
  signer: `0x${string}`;
  signature: `0x${string}`;
  timestamp: bigint;
  isValid: boolean;
}

// Vault State enum
export enum VaultState {
  Created = 0,
  Funding = 1,
  Funded = 2,
  Active = 3,
  Repaying = 4,
  Completed = 5,
  Defaulted = 6,
}

/**
 * Reputation Tier enum - v3.0
 * 
 * | Tier | NFT              | Verification    | Access                              |
 * |------|------------------|-----------------|-------------------------------------|
 * | 0    | None             | -               | No access                           |
 * | 1    | Convexo_Passport | ZKPassport      | Treasury + Vault investments        |
 * | 2    | LP_Individuals   | Veriff          | LP pools + Vault investments        |
 * | 2    | LP_Business      | Sumsub          | LP pools + Vault investments        |
 * | 3    | Ecreditscoring   | AI Credit Score | All above + Vault creation          |
 */
export enum ReputationTier {
  None = 0,           // No NFTs - No access
  Passport = 1,       // Convexo_Passport - ZKPassport verified individuals
  LimitedPartner = 2, // LP_Individuals OR LP_Business - Full LP access
  VaultCreator = 3,   // Ecreditscoring - Can create vaults
}

// Verification Status enum
export enum VerificationStatus {
  None = 0,
  Pending = 1,
  Approved = 2,
  Rejected = 3,
}

// Agreement Type enum
export enum AgreementType {
  Investment = 0,
  Loan = 1,
  Partnership = 2,
  Other = 3,
}

// Tier names for UI display
export const TIER_NAMES: Record<ReputationTier, string> = {
  [ReputationTier.None]: 'Unverified',
  [ReputationTier.Passport]: 'Passport Holder',
  [ReputationTier.LimitedPartner]: 'Limited Partner',
  [ReputationTier.VaultCreator]: 'Vault Creator',
};

// Tier colors for UI badges
export const TIER_COLORS: Record<ReputationTier, string> = {
  [ReputationTier.None]: '#6B7280',     // gray
  [ReputationTier.Passport]: '#3B82F6', // blue
  [ReputationTier.LimitedPartner]: '#8B5CF6', // purple
  [ReputationTier.VaultCreator]: '#F59E0B', // gold/amber
};

// Tier icons for UI
export const TIER_ICONS: Record<ReputationTier, string> = {
  [ReputationTier.None]: '⚪',
  [ReputationTier.Passport]: '🛂',
  [ReputationTier.LimitedPartner]: '💼',
  [ReputationTier.VaultCreator]: '🏆',
};

// Helper to get vault state label
export function getVaultStateLabel(state: number): string {
  const labels: Record<number, string> = {
    0: 'Created',
    1: 'Funding',
    2: 'Funded',
    3: 'Active',
    4: 'Repaying',
    5: 'Completed',
    6: 'Defaulted',
  };
  return labels[state] ?? 'Unknown';
}

// Helper to get reputation tier label
export function getReputationTierLabel(tier: number): string {
  return TIER_NAMES[tier as ReputationTier] ?? 'Unknown';
}

// Helper to get verification status label
export function getVerificationStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    0: 'Not Started',
    1: 'Pending',
    2: 'Approved',
    3: 'Rejected',
  };
  return labels[status] ?? 'Unknown';
}

// Access control helpers based on tier
export function canAccessTreasury(tier: ReputationTier): boolean {
  return tier >= ReputationTier.Passport;
}

export function canInvestInVaults(tier: ReputationTier): boolean {
  return tier >= ReputationTier.Passport;
}

export function canAccessLPPools(tier: ReputationTier): boolean {
  return tier >= ReputationTier.LimitedPartner;
}

export function canRequestCreditScore(tier: ReputationTier): boolean {
  return tier >= ReputationTier.LimitedPartner;
}

export function canCreateVaults(tier: ReputationTier): boolean {
  return tier >= ReputationTier.VaultCreator;
}
