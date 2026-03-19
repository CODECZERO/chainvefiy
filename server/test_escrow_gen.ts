
import { EscrowService } from './src/services/stellar/escrow.service.js';
import { Transaction, Networks, xdr } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
    const service = new EscrowService();
    const donorPubKey = 'GB5GF6YMRVW43J7HYLFBDNM4J6ODLB4I74RBB3FV3AVFDZ36FN7JGKRF';
    const ngoPubKey = 'GB5CLXT47BNHNXLR67QSNB5FBM5NTSFSO6IUJCMSO6BY6ZYBTYJGY566';

    console.log('Generating XDR for donor:', donorPubKey);

    try {
        const xdrString = await service.buildCreateEscrowTx(
            donorPubKey,
            ngoPubKey,
            100, // total
            50,  // locked
            'test-task',
            Math.floor(Date.now() / 1000) + 86400
        );

        console.log('XDR Generated Successfully');

        const tx = new Transaction(xdrString, Networks.TESTNET);
        console.log('--- Transaction Inspection ---');
        console.log('Fee:', tx.fee);

        const envelope = xdr.TransactionEnvelope.fromXDR(xdrString, 'base64');
        const v1 = envelope.v1();
        const txV1 = v1.tx();

        console.log('V1 Ext Switch:', txV1.ext().switch().name);

        if (txV1.ext().switch().name === 'transactionExtSoroban') {
            console.log('✅ Soroban data present');
            const sorobanData = txV1.ext().sorobanData();
            console.log('Resource Fee:', sorobanData.resourceFee().toString());
            console.log('Footprint Read Bytes:', sorobanData.resources().footprint().readOnly().length);
            console.log('Footprint Write Bytes:', sorobanData.resources().footprint().readWrite().length);
        } else {
            console.log('❌ NO Soroban data in V1 extension');
            console.log('Full Ext object:', JSON.stringify(txV1.ext(), null, 2));
        }

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

test();
