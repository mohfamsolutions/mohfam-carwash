import fs from 'node:fs/promises';
import {connectFtps} from './ftps.mjs';
await fs.mkdir('artifacts/hosting',{recursive:true});
const {client,config}=await connectFtps();
try{
 const pwd=await client.pwd(),entries=await client.list();
 const report={host:config.host,connectAddress:config.dedicatedIp,explicitFtps:true,port:config.port,certificateValidated:true,accountLoginVerified:true,remoteWorkingDirectory:pwd,entries:entries.map(f=>({name:f.name,isDirectory:f.isDirectory,isFile:f.isFile,size:f.size})),websiteUploadsPerformed:false,recordedDestinationMappingVerified:config.candidateOriginVerified===true,mappingRecheckedByThisReadOnlyCommand:false};
 await fs.writeFile('artifacts/hosting/inspection.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{client.close();}
