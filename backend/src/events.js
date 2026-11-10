import {EventEmitter} from 'node:events';
const bus=new EventEmitter();
bus.setMaxListeners(500);
/** Deliberately transmit only cache invalidation signals, never private DB records. */
export function extractCarId(route){
 const matched=route.match(/^\/api\/(?:cars|inspection\/cars|maintenance\/cars|documents\/cars|deposits\/cars|sales\/cars|reports\/cars)\/([^/?]+)/);
 return matched && matched[1]!=='lookup' ? decodeURIComponent(matched[1]) : null;
}
export function broadcastMutation(route){
 const scope=route.startsWith('/api/operations/expenses')?'expenses':route.startsWith('/api/users')?'users':route.startsWith('/api/operations/warranty')?'warranty':route.startsWith('/api/documents')?'cars':route.startsWith('/api/reports')?'reports':'cars';
 const carId=extractCarId(route);
 bus.emit('change',{scope,carId,at:Date.now()});
}
export function eventsHandler(req,res){
 res.setHeader('Content-Type','text/event-stream; charset=utf-8');
 res.setHeader('Cache-Control','no-cache, no-transform');
 res.setHeader('Connection','keep-alive');
 res.setHeader('X-Accel-Buffering','no');
 res.flushHeaders?.();
 res.write('event: connected\ndata: {}\n\n');
 const notify=msg=>{if(!res.destroyed){const safe=req.user?.role==='ADMIN'?msg:{...msg,carId:null};res.write(`event: changed\ndata: ${JSON.stringify(safe)}\n\n`)}};
 bus.on('change',notify);
 const heartbeat=setInterval(()=>{if(!res.destroyed)res.write(': ping\n\n')},25000);
 res.on('close',()=>{clearInterval(heartbeat);bus.off('change',notify)});
}
