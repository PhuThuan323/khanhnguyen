import multer from 'multer';
import {detectedFormat} from '../services/filetypes.js';
// Kiểm tra magic bytes phía server (không chỉ tin Content-Type do trình duyệt gửi).
const limit = Math.max(1,Math.min(25,Number(process.env.MAX_UPLOAD_MB||10))) * 1024 * 1024;
export const uploadSingle = multer({storage:multer.memoryStorage(),limits:{fileSize:limit,files:1}}).single('file');
export function requireUpload(req,res,next) {
  const format=req.file && detectedFormat(req.file.buffer);
  if (!format || (req.mediaKind==='image' && format==='pdf')) return res.status(400).json({message:'Chỉ hỗ trợ JPG, PNG, WEBP'+(req.mediaKind==='image'?'':', PDF')+'.'});
  req.file.detectedFormat=format;
  next();
}
export const imageOnly=(req,res,next)=>{req.mediaKind='image';next()};
