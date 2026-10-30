import fs from 'node:fs/promises';
export function checkDeployment(c){
 if(c.publicationAuthorized!==true||c.uploadsEnabled!==true||!c.domainIndependentlyVerified||!c.dedicatedAccountVerified||!c.httpsFtpsMarkerVerified||!c.tlsVerified||!c.dedicatedHostingFolder||!c.domain||/example|localhost/i.test(c.domain))throw new Error('Deployment locked: explicit authorization and independent dedicated destination verification are required.');
}
if(process.argv[1]?.endsWith('deployment-guard.mjs')){checkDeployment(JSON.parse(await fs.readFile('deployment.json','utf8')));console.log('Publication authorization and dedicated destination verification gates passed.');}
