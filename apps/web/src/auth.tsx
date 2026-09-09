import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { User } from './types';
import { api } from './api';

type AuthContextType={user:User|null; login:(email:string,password:string)=>Promise<void>; logout:()=>void};
const AuthContext=createContext<AuthContextType>({user:null,login:async()=>{},logout:()=>{}});
export function AuthProvider({children}:{children:ReactNode}){
  const [user,setUser]=useState<User|null>(()=>{try{return JSON.parse(localStorage.getItem('opsflow_user')||'null')}catch{return null}});
  const login=async(email:string,password:string)=>{const r=await api.post('/auth/login',{email,password}); setUser(r.data.user); localStorage.setItem('opsflow_token',r.data.token); localStorage.setItem('opsflow_user',JSON.stringify(r.data.user));};
  const logout=()=>{setUser(null);localStorage.removeItem('opsflow_token');localStorage.removeItem('opsflow_user');};
  const value=useMemo(()=>({user,login,logout}),[user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
