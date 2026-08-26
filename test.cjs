const fs = require('fs');
const crypto = require('crypto');
const _AES_PASSWORD = "58Zk72Mf2Xo60Dh4Gi87Xs45Yu20Yn0Td48Bq98Ya20Rd28Si27Ie29Wj97Ly32Aq55De37Qd8Ul";
const CIPHER_KEY = crypto.createHash('sha256').update(_AES_PASSWORD).digest();
function decryptString(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', CIPHER_KEY, iv);
    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
console.log(decryptString(fs.readFileSync('data/users.json', 'utf8')));
