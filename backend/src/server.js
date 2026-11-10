import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import carRoutes from './routes/cars.js';
import inspectionRoutes from './routes/inspection.js';
import maintenanceRoutes from './routes/maintenance.js';
import mediaRoutes from './routes/media.js';
import userRoutes from './routes/users.js';
import operationsRoutes from './routes/operations.js';
import salesRoutes from './routes/sales.js';
import reportsRoutes from './routes/reports.js';
import depositRoutes from './routes/deposits.js';
import documentRoutes from './routes/documents.js';
import { auth } from './middleware/auth.js';
import {broadcastMutation,eventsHandler} from './events.js';
import {startSupabaseBridge} from './realtime/supabaseBridge.js';

export const app=express();
app.disable('x-powered-by');
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
app.use(cors({origin:(process.env.FRONTEND_URL||'http://localhost:5173').split(',').map(s=>s.trim()),credentials:false}));
app.use(express.json({limit:'1mb'}));
// Measure application processing time separately from client/network time.
app.use((req,res,next)=>{
 const start=performance.now(),writeHead=res.writeHead;
 res.writeHead=function(...args){if(!res.headersSent)res.setHeader('Server-Timing',`app;dur=${(performance.now()-start).toFixed(1)}`);return writeHead.apply(this,args)};
 res.on('finish',()=>{const elapsed=performance.now()-start;if(elapsed>700)console.warn('[SLOW_API]',req.method,req.path,Math.round(elapsed)+'ms')});
 next();
});
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:40,standardHeaders:'draft-8',legacyHeaders:false}),authRoutes);
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'garage-os-api'}));
app.use('/api',auth);
// Protected SSE: Bearer token stays in Authorization header (not in URL query strings).
app.get('/api/events',eventsHandler);
app.use('/api',(req,res,next)=>{
 if(['POST','PUT','PATCH','DELETE'].includes(req.method))res.once('finish',()=>{
  if(res.statusCode>=200&&res.statusCode<300)broadcastMutation(req.originalUrl.split('?')[0]);
 });
 next();
});
app.use('/api/cars',carRoutes);
app.use('/api/inspection',inspectionRoutes);
app.use('/api/maintenance',maintenanceRoutes);
app.use('/api/media',mediaRoutes);
app.use('/api/users',userRoutes);
app.use('/api/operations',operationsRoutes);
app.use('/api/sales',salesRoutes);
app.use('/api/deposits',depositRoutes);
app.use('/api/reports',reportsRoutes);
app.use('/api/documents',documentRoutes);
app.use((_req,res)=>res.status(404).json({message:'API không tồn tại.'}));
app.use((err,req,res,next)=>{
  console.error('[API ERROR]',err);
  if(err.name==='ZodError')return res.status(400).json({message:'Dữ liệu không hợp lệ.',errors:err.issues});
  if(err.code==='P2002')return res.status(409).json({message:'Dữ liệu trùng (biển số hoặc email).'});
  if(err.code==='P2025')return res.status(404).json({message:'Không tìm thấy dữ liệu.'});
  if(err.code==='LIMIT_FILE_SIZE')return res.status(413).json({message:'File vượt quá dung lượng cho phép.'});
  if(err.code==='LIMIT_UNEXPECTED_FILE')return res.status(400).json({message:'Định dạng tải lên không hợp lệ.'});
  res.status(500).json({message:process.env.NODE_ENV==='production'?'Có lỗi máy chủ.':String(err.message)});
});
if(process.env.NODE_ENV!=='test') {
  const port=Number(process.env.PORT||8080);
  app.listen(port,()=>{console.log(`Garage OS API listening on http://localhost:${port}`);startSupabaseBridge();});
}
