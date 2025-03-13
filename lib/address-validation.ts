import { ChainId } from '@/constants/ChainToken';

export enum ChainType {
    Ethereum = 'ethereum',
    Solana = 'solana',
    Bitcoin = 'bitcoin'
}

export function chainIdToChainType(chainId: ChainId): ChainType {
    switch (chainId) {
        case ChainId.ETHEREUM:
        case ChainId.BASE:
        case ChainId.OPTIMISM:
        case ChainId.ARBITRUM:
        case ChainId.AVALANCHE:
        case ChainId.POLYGON:
            return ChainType.Ethereum;
        // case ChainId.SOLANA:
        //     return ChainType.Solana;
        // case ChainId.BITCOIN:
        //     return ChainType.Bitcoin;
        default:
            return ChainType.Ethereum; // Default to Ethereum for EVM chains
    }
}

export function isValidAddress(address: string, chain: ChainType): boolean {
    switch (chain) {
        case ChainType.Ethereum:
            return /^0x[a-fA-F0-9]{40}$/.test(address);
        case ChainType.Solana:
            return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
        case ChainType.Bitcoin:
            return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
        default:
            return false;
    }
}