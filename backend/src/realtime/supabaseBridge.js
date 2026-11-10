import {createClient} from '@supabase/supabase-js';
import {broadcastMutation} from '../events.js';
/** Optional cross-instance invalidation. Only the Node backend holds the service key.
 * Database rows never go into user-facing SSE messages; clients re-fetch through
 * Garage OS's own JWT-protected REST endpoints. */
const TABLE_SCOPE={
 Car:'/api/cars',CarDeal:'/api/cars',CarDeposit:'/api/cars',CarDepositPayment:'/api/cars',CarDepositRefund:'/api/cars',
 MaintenanceRecord:'/api/cars',InspectionBlock:'/api/cars',InspectionComment:'/api/cars',InspectionPhoto:'/api/cars',
 SalesLead:'/api/cars',SaleCommission:'/api/cars',VehicleDocument:'/api/documents',
 Expense:'/api/operations/expenses',WarrantyRecord:'/api/operations/warranty',User:'/api/users',
};
export function startSupabaseBridge(){
 const url=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret){console.log('Supabase Realtime bridge disabled (SUPABASE_URL / SERVICE_ROLE_KEY not set). Local SSE + periodic refresh remain active.');return null;}
 const supabase=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:20}}});
 let channel=supabase.channel('garageos-private-server-invalidation');
 for(const [table,path] of Object.entries(TABLE_SCOPE)){
   channel=channel.on('postgres_changes',{event:'*',schema:'public',table},()=>broadcastMutation(path));
 }
 channel.subscribe(status=>{
  if(status==='SUBSCRIBED')console.log('Garage OS realtime bridge connected to Supabase');
  else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('Garage OS realtime bridge:',status);
 });
 return()=>supabase.removeChannel(channel);
}
