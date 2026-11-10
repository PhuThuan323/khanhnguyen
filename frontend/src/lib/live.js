import {API_BASE} from './api';
/** Authenticated SSE via fetch streaming; supports Authorization: Bearer rather than URL tokens.
 * In a multi-replica deployment, each API node has its own event bus. Refresh on focus
 * and 60s fallback polling provide eventual consistency without opening DB to clients. */
export function startLiveSync(getToken,onChange){
 let stopped=false,controller=null,reconnectId=null,backoff=1500;
 async function connect(){
  if(stopped)return;
  controller=new AbortController();
  try{
   const response=await fetch(`${API_BASE}/events`,{headers:{Authorization:`Bearer ${getToken()}`,Accept:'text/event-stream'},signal:controller.signal,cache:'no-store'});
   if(response.status===401){window.dispatchEvent(new Event('garage-unauthorized'));return;}
   if(!response.ok||!response.body)throw Error(`Realtime ${response.status}`);
   backoff=1500;
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
   while(!stopped){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');let pos;while((pos=buffer.indexOf('\n\n'))>=0){const message=buffer.slice(0,pos);buffer=buffer.slice(pos+2);if(message.includes('event: changed')){const line=message.split('\n').find(x=>x.startsWith('data: '));if(line){try{const data=JSON.parse(line.slice(6));onChange(data)}catch{}}}}}
  }catch(e){if(!stopped&&!controller?.signal.aborted)console.warn('LiveSync reconnect:',e.message)}
  if(!stopped){reconnectId=setTimeout(connect,backoff);backoff=Math.min(30000,backoff*2)}
 }
 connect();
 return()=>{stopped=true;controller?.abort();clearTimeout(reconnectId)};
}
