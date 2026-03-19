import {
    StellarWalletsKit,
    WalletNetwork,
    allowAllModules,
} from '@creit.tech/stellar-wallets-kit';

const getNetwork = () => {
    const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toUpperCase();
    if (network === 'PUBLIC') return WalletNetwork.PUBLIC;
    if (network === 'FUTURENET') return WalletNetwork.FUTURENET;
    return WalletNetwork.TESTNET;
};

let kitInstance: StellarWalletsKit | null = null;

export const getKit = () => {
    if (typeof window === 'undefined') return null;

    if (!kitInstance) {
        kitInstance = new StellarWalletsKit({
            network: getNetwork(),
            modules: allowAllModules(),
        });
    }
    return kitInstance;
};

// For backward compatibility while we refactor usages
export const kit = typeof window !== 'undefined' ? new StellarWalletsKit({
    network: getNetwork(),
    modules: allowAllModules(),
}) : null as unknown as StellarWalletsKit;
