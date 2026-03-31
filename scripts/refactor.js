const fs = require('fs');
const path = require('path');

const targetDir = 'c:\\Users\\gaurav\\OneDrive\\Desktop\\chainvefiy';

const replacements = [
    { from: /ngoPublicKey/g, to: 'supplierPublicKey' },
    { from: /ngoName/g, to: 'supplierName' },
    { from: /getNgoEscrows/g, to: 'getSupplierEscrows' },
    { from: /ngoAuth/g, to: 'supplierAuth' },
    { from: /ngo_profile/g, to: 'supplier_profile' },
    { from: /\/ngo\//g, to: '/supplier/' },
    { from: /\/ngo`/g, to: '/supplier`' },
    { from: /NGOProfile/g, to: 'SupplierProfile' },
    { from: /NGOSendPaymentModal/g, to: 'SupplierSendPaymentModal' },
    { from: /ngoWalletPayment/g, to: 'supplierWalletPayment' },
    { from: /clearNGOData/g, to: 'clearSupplierData' },
    { from: /mockNGOs/g, to: 'mockSuppliers' },
    { from: /loginNGO/g, to: 'loginSupplier' },
    { from: /signupNGO/g, to: 'signupSupplier' },
    { from: /clearNGOError/g, to: 'clearSupplierError' },
    { from: /checkNGOCookie/g, to: 'checkSupplierCookie' },
    { from: /registerNGO/g, to: 'registerSupplier' },
    { from: /getNGO/g, to: 'getSupplier' },
    { from: /findNGOByEmail/g, to: 'findSupplierByEmail' },
    { from: /userNgo.controler.js/g, to: 'userSupplier.controler.js' },
    { from: /ngoPubKey/g, to: 'supplierPubKey' }
];

const filesToUpdate = [
    'server\\src\\controler\\contracts\\escrow.controller.ts',
    'server\\src\\services\\stellar\\escrow.service.ts',
    'server\\src\\routes\\contracts\\escrow.routes.ts',
    'server\\src\\controler\\userSupplier.controler.ts', // Make sure this exists before replacing
    'server\\src\\routes\\user.routes.ts',
    'server\\src\\schemas\\user.schema.ts',
    'server\\src\\dbQueries\\supplier.Queries.ts',
    'server\\test_escrow_gen.ts',
    'frontend\\lib\\services\\contracts\\escrow.service.ts',
    'frontend\\components\\upload-proof-modal.tsx',
    'frontend\\lib\\api-client.ts',
    'frontend\\lib\\constants.ts',
    'frontend\\components\\supplier-payment-modal.tsx',
    'frontend\\lib\\logout-utils.ts',
    'frontend\\lib\\mock-data.ts',
    'frontend\\lib\\redux\\store.ts',
    'frontend\\lib\\redux\\slices\\order-slice.ts',
    'frontend\\lib\\redux\\slices\\supplier-auth-slice.ts',
    'frontend\\lib\\stellar-utils.ts',
    'frontend\\lib\\types.ts',
    'frontend\\lib\\services\\stellar.service.ts'
];

// First rename the file
const oldPath = path.join(targetDir, 'server\\src\\controler\\userNgo.controler.ts');
const newPath = path.join(targetDir, 'server\\src\\controler\\userSupplier.controler.ts');
if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log("Renamed userNgo.controler.ts to userSupplier.controler.ts");
}

filesToUpdate.forEach(file => {
    const filePath = path.join(targetDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    replacements.forEach(rep => {
        content = content.replace(rep.from, rep.to);
    });

    // Also arbitrary "ngo" references in comments or keys 
    // Need to avoid matching things like "mongodb" or words containing ngo
    content = content.replace(/\bngo\b/g, 'supplier');
    content = content.replace(/\bNGO\b/g, 'Supplier');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${file}`);
    }
});
