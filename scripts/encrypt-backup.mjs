import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
try{await fs.access('artifacts/backups');}catch{console.log('No backup to encrypt.');process.exit(0);}
await fs.mkdir('artifacts/backup-encrypted',{recursive:true});
const archive='artifacts/backup-encrypted/backup.tar.gz';
await execute('tar',['-czf',archive,'-C','artifacts','backups']);
const key=crypto.randomBytes(32),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
const ciphertext=Buffer.concat([cipher.update(await fs.readFile(archive)),cipher.final()]);
const encryptedKey=crypto.publicEncrypt({key:await fs.readFile('data/backup-public-key.pem'),oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},key);
await fs.writeFile('artifacts/backup-encrypted/backup.enc',JSON.stringify({algorithm:'RSA-OAEP-SHA256+AES-256-GCM',key:encryptedKey.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:ciphertext.toString('base64')}));
key.fill(0);await fs.unlink(archive);
console.log('Deployment backup encrypted for the local restore key. Only the encrypted archive is uploaded to Actions artifacts.');
