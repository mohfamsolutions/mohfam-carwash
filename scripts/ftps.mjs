import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Client} from 'basic-ftp';
const execute=promisify(execFile);
export async function loadFtpsPassword(){
 let password=process.env.CARWASH_FTPS_PASSWORD;
 if(!password&&process.platform==='win32'){
  const {stdout}=await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; $secure = Get-Content -LiteralPath '.local/ftps-password.dpapi' | ConvertTo-SecureString; [Console]::Out.Write(([System.Net.NetworkCredential]::new('', $secure)).Password)"],{windowsHide:true});
  password=stdout;
 }
 if(!password)throw new Error('Dedicated FTPS credential missing. Use the encrypted local setup or a dedicated runtime secret.');
 return password;
}
export async function connectFtps(){
 const config=JSON.parse(await fs.readFile('data/hosting.json','utf8'));
 let password=await loadFtpsPassword();
 const client=new Client(20000);
 client.ftp.verbose=false;
 try{await client.access({host:config.dedicatedIp||config.host,port:config.port,user:config.user,password,secure:true,secureOptions:{servername:config.host,rejectUnauthorized:true,minVersion:'TLSv1.2'}});return {client,config};}
 catch(error){client.close();const code=String(error.code||'UNKNOWN');throw new Error(`FTPS connection failed (${/^[A-Z0-9_]+$/.test(code)?code:'SERVER_REJECTED'}). Check the dedicated credential, host and trusted TLS certificate. No credential was logged.`);}
 finally{password=undefined;}
}
