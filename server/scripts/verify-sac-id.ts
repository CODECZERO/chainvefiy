import { Asset, Networks } from '@stellar/stellar-sdk';

const asset = new Asset('REI', 'GB5CLXT47BNHNXLR67QSNB5FBM5NTSFSO6IUJCMSO6BY6ZYBTYJGY566');
const contractId = asset.contractId(Networks.TESTNET);
console.log(`Asset: REI`);
console.log(`Issuer: GB5CLXT47BNHNXLR67QSNB5FBM5NTSFSO6IUJCMSO6BY6ZYBTYJGY566`);
console.log(`Contract ID: ${contractId}`);
