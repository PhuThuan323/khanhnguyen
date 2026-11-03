export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/,'');
let currentToken = sessionStorage.getItem('garage_token') || '';
export function setToken(token) { currentToken = token || ''; if(token)sessionStorage.setItem('garage_token',token);else sessionStorage.removeItem('garage_token'); }
export function hasToken(){return Boolean(currentToken)}
export async function api(path,{method='GET',body,signal}={}) {
  const headers = {};
  if(currentToken)headers.Authorization=`Bearer ${currentToken}`;
  if(body !== undefined && !(body instanceof FormData))headers['Content-Type']='application/json';
  let response;
  try {response=await fetch(`${API_BASE}${path}`,{method,headers,body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body),signal});}
  catch(e){throw new Error('Không thể kết nối backend. Hãy kiểm tra máy chủ và cấu hình VITE_API_URL.');}
  if(response.status===204)return null;
  if(!response.ok){const err=await response.json().catch(()=>({}));if(response.status===401)window.dispatchEvent(new Event('garage-unauthorized'));throw new Error(err.message||`API báo lỗi ${response.status}`);}
  return response.json();
}
export async function getProtectedFile(path,signal){
  let response;
  try {response=await fetch(`${API_BASE}${path}`,{headers:{Authorization:`Bearer ${currentToken}`},signal});}
  catch {throw new Error('Không tải được chứng từ/ảnh.');}
  if(!response.ok)throw new Error('Không tải được chứng từ/ảnh (kiểm tra quyền truy cập).');
  return URL.createObjectURL(await response.blob());
}
export async function uploadFile(path,file,method='POST') {
  const body=new FormData();body.append('file',file);
  return api(path,{method,body});
}
