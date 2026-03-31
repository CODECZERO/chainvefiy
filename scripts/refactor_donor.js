const fs = require('fs');
const path = require('path');

const targetDir = 'c:\\Users\\gaurav\\OneDrive\\Desktop\\chainvefiy';

const replacements = [
    { from: /donorPublicKey/g, to: 'buyerPublicKey' },
    { from: /getDonorEscrows/g, to: 'getBuyerEscrows' },
    { from: /\/donor\//g, to: '/buyer/' },
    { from: /donorId:/g, to: 'buyerId:' }
];

const filesToUpdate = [
    'server\\src\\controler\\contracts\\escrow.controller.ts',
    'server\\src\\services\\stellar\\escrow.service.ts',
    'server\\src\\routes\\contracts\\escrow.routes.ts',
    'frontend\\lib\\services\\contracts\\escrow.service.ts',
    'frontend\\lib\\stellar-utils.ts',
    'frontend\\lib\\redux\\slices\\order-slice.ts'
];

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

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${file}`);
    }
});
