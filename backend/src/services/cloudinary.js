import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';
cloudinary.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET,secure:true});
export function uploadBuffer(buffer,{folder,resource_type='image'}) {
  return new Promise((resolve,reject) => {
    const stream=cloudinary.uploader.upload_stream({folder,resource_type,type:'authenticated',overwrite:false},(err,result)=>err?reject(err):resolve(result));
    Readable.from([buffer]).pipe(stream);
  });
}
export const deleteCloudAsset = (publicId, resource_type='image') => cloudinary.uploader.destroy(publicId,{resource_type,type:'authenticated',invalidate:true});
export function signedMediaUrl(publicId, resourceType, format) {
  return cloudinary.url(publicId,{secure:true,resource_type:resourceType,type:'authenticated',format:resourceType==='raw'?undefined:(format || undefined),sign_url:true});
}
