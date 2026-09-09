import axios from 'axios';
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api'});
api.interceptors.request.use(config=>{const token=localStorage.getItem('opsflow_token'); if(token) config.headers.Authorization=`Bearer ${token}`; return config;});
api.interceptors.response.use(r=>r,e=>{if(e.response?.status===401){localStorage.removeItem('opsflow_token');localStorage.removeItem('opsflow_user'); window.location.href='/login';} return Promise.reject(e);});
export const money=(value:number|string)=>`₹${Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
export const formatDate=(value?:string)=>value?new Date(value).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
export const formatDateTime=(value?:string)=>value?new Date(value).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—';

export async function openPdf(path:string){const pending=window.open('about:blank','_blank'); try{const r=await api.get(path,{responseType:'blob'});const url=URL.createObjectURL(r.data); if(pending) pending.location.href=url; else window.open(url,'_blank'); setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(error){pending?.close();throw error;}}
