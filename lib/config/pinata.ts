export const PINATA_CONFIG = {
  gateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'lime-famous-condor-7.mypinata.cloud',
  apiUrl: 'https://api.pinata.cloud',

  images: {
    passport: 'bafybeiekwlyujx32cr5u3ixt5esfxhusalt5ljtrmsng74q7k45tilugh4',
    lpIndividuals: 'bafkreib7mkjzpdm3id6st6d5vsxpn7v5h6sxeiswejjmrbcb5yoagaf4em',
    lpBusiness: 'bafkreiejesvgsvohwvv7q5twszrbu5z6dnpke6sg5cdiwgn2rq7dilu33m',
    creditScore: 'bafkreignxas6gqi7it5ng6muoykujxlgxxc4g7rr6sqvwgdfwveqf2zw3e',
  },
} as const;

export const buildIPFSUrl = (hash: string): string =>
  `https://${PINATA_CONFIG.gateway}/ipfs/${hash}`;

export const buildIPFSUri = (hash: string): string => `ipfs://${hash}`;

export interface PassportMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{ trait_type: string; value: string }>;
}

export const uploadMetadataToPinata = async (metadata: PassportMetadata): Promise<string> => {
  const response = await fetch('/api/upload-pinata/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    const errorMessage =
      typeof responseData.error === 'object'
        ? JSON.stringify(responseData.error)
        : responseData.error;
    throw new Error(errorMessage || `Upload failed with status ${response.status}`);
  }

  return responseData.ipfsHash;
};

export const createLPIndividualMetadata = (tokenId: number, verificationLevel = 'Enhanced') => ({
  name: `Convexo LP Individual #${tokenId}`,
  description:
    'Soulbound Individual Limited Partner NFT for Personas verified through Veriff KYC verification in the Convexo Protocol. Provides Tier 2 access to Credit Score requests, monetization to trade local stablecoins to FIAT, and compliant protocol features.',
  image: buildIPFSUrl(PINATA_CONFIG.images.lpIndividuals),
  external_url: 'https://convexo.io',
  attributes: [
    { trait_type: 'Tier', value: '2' },
    { trait_type: 'Type', value: 'Individual LP' },
    { trait_type: 'Entity Type', value: 'Individual' },
    { trait_type: 'Verification Level', value: verificationLevel },
    { trait_type: 'Vault Creation', value: 'Enabled' },
    { trait_type: 'Network Access', value: 'Full Protocol' },
    { trait_type: 'Accredited Status', value: 'Verified' },
  ],
});

export const createLPBusinessMetadata = (tokenId: number, verificationLevel = 'Enhanced') => ({
  name: `Convexo LP Business #${tokenId}`,
  description:
    'Soulbound Business Limited Partner NFT for institutional verified through Sumsub KYB verification in the Convexo Protocol. Provides Tier 2 access to Credit Score requests, monetization to trade local stablecoins to FIAT, and compliant protocol features.',
  image: buildIPFSUrl(PINATA_CONFIG.images.lpBusiness),
  external_url: 'https://convexo.io',
  attributes: [
    { trait_type: 'Tier', value: '2' },
    { trait_type: 'Type', value: 'Business LP' },
    { trait_type: 'Entity Type', value: 'Business' },
    { trait_type: 'Verification Level', value: verificationLevel },
    { trait_type: 'Vault Creation', value: 'Enabled' },
    { trait_type: 'Network Access', value: 'Full Protocol' },
    { trait_type: 'Credit Scoring', value: 'Eligible' },
  ],
});
