import {gzip} from 'node:zlib';
import {promisify} from 'node:util';
const zip=promisify(gzip);
/** Compress large authenticated JSON payloads using only Node's built-in zlib.
 * Clients (fetch) decode HTTP gzip automatically; contents remain private and uncached. */
export async function encodeJson(value,acceptEncoding=''){
 const raw=Buffer.from(JSON.stringify(value),'utf8');
 if(raw.length<4096||!/(^|[, ])gzip([,; ]|$)/i.test(acceptEncoding)||/gzip\s*;\s*q=0(?:\.0+)?([, ]|$)/i.test(acceptEncoding))return {body:raw,compressed:false,rawBytes:raw.length};
 const body=await zip(raw,{level:5});
 return {body,compressed:true,rawBytes:raw.length};
}
export async function sendJson(req,res,value){
 const payload=await encodeJson(value,req.headers['accept-encoding']||'');
 res.setHeader('Cache-Control','private, no-store');
 if(payload.compressed){res.setHeader('Content-Encoding','gzip');res.setHeader('Vary','Accept-Encoding');}
 res.type('json').send(payload.body);
}
