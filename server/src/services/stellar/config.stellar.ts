import { Keypair, Networks, Horizon, rpc } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.BLOCKCHAIN_NETWORK) {
  throw new Error('BLOCKCHAIN_NETWORK is not defined in environment variables');
}

export const STELLAR_CONFIG = {
  server: new Horizon.Server(process.env.BLOCKCHAIN_NETWORK),
  networkPassphrase: Networks.TESTNET,
};

export const createKeypair = () => Keypair.random();
