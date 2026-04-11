/**
 * Admin-side useConvexoWrite — EOA-only wrapper around wagmi useWriteContract.
 * No Account Kit / smart account path needed in admin.
 */
export { useWriteContract as useConvexoWrite } from 'wagmi';
