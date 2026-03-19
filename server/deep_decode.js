
const { Transaction, Networks, xdr } = require('@stellar/stellar-sdk');

const xdrString = 'AAAAAgAAAAB6YvsMjW3Np+fCyhG1nE+cNYeI/yIQ7LXYKlHnfit+kwAAAGQAD6+6AAAAAwAAAAEAAAAAAAAAAAAAAABplfsNAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAAB/k2sv4US+moE5Wtc6YAbNsuROukuVQ+Iyw9iCnioUXkAAAANY3JlYXRlX2VzY3JvdwAAAAAAAAYAAAASAAAAAAAAAAB6YvsMjW3Np+fCyhG1nE+cNYeI/yIQ7LXYKlHnfit+kwAAABIAAAAAAAAAACn3pgL08JANHtiuzIhp+c/APhvmaFRIk+tvGOkkrdn0AAAACgAAAAAAAAAAAAAAAAAAACIAAAAKAAAAAAAAAAAAAAAAAAAAEQAAAA4AAAAVYno2RXVZMi1taGxTMmtoa1p3Vi1nAAAAAAAABQAAAABpvYftAAAAAAAAAAAAAAAA';

try {
    const tx = new Transaction(xdrString, Networks.TESTNET);
    console.log('--- Transaction Details ---');
    console.log('Source:', tx.source);
    console.log('Fee:', tx.fee);
    console.log('Operations:', tx.operations.length);

    const envelope = xdr.TransactionEnvelope.fromXDR(xdrString, 'base64');
    const v1 = envelope.v1();
    const txV1 = v1.tx();

    console.log('V1 Source:', txV1.sourceAccount().value());
    console.log('V1 Fee:', txV1.fee());
    console.log('V1 Ext Switch:', txV1.ext().switch().name);

    if (txV1.ext().switch().name === 'transactionExtSoroban') {
        console.log('✅ Soroban data found');
        const sorobanData = txV1.ext().sorobanData();
        console.log('Resource Fee:', sorobanData.resourceFee().toString());
    } else {
        console.log('❌ No Soroban data in V1 extension');
    }
} catch (e) {
    console.error('Failed to decode:', e);
}
