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
import { auth } from './middleware/auth.js';

export const app=express();
app.disable('x-powered-by');
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
app.use(cors({origin:(process.env.FRONTEND_URL||'http://localhost:5173').split(',').map(s=>s.trim()),credentials:false}));
app.use(express.json({limit:'1mb'}));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:40,standardHeaders:'draft-8',legacyHeaders:false}),authRoutes);
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'garage-os-api'}));
app.use('/api',auth);
app.use('/api/cars',carRoutes);
app.use('/api/inspection',inspectionRoutes);
app.use('/api/maintenance',maintenanceRoutes);
app.use('/api/media',mediaRoutes);
app.use('/api/users',userRoutes);
app.use('/api/operations',operationsRoutes);
app.use('/api/sales',salesRoutes);
app.use('/api/reports',reportsRoutes);
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
  app.listen(port,()=>console.log(`Garage OS API listening on http://localhost:${port}`));
}
