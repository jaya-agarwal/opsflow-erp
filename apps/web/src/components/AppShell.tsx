import {ReactNode,useEffect,useState} from 'react';
import {NavLink,useNavigate,useLocation} from 'react-router-dom';
import {LayoutDashboard,Users,Package,Boxes,FileText,Settings,LogOut,Menu,Search,Command,ShieldCheck, ScrollText, FileSpreadsheet} from 'lucide-react';
import {motion,AnimatePresence} from 'framer-motion';
import {useAuth} from '../auth';

const links=[
 {to:'/',label:'Command Center',icon:LayoutDashboard,roles:['ADMIN','SALES','WAREHOUSE','ACCOUNTS']},
 {to:'/customers',label:'Customers',icon:Users,roles:['ADMIN','SALES']},
 {to:'/products',label:'Products',icon:Package,roles:['ADMIN','WAREHOUSE']},
 {to:'/inventory',label:'Inventory',icon:Boxes,roles:['ADMIN','WAREHOUSE']},
 {to:'/challans',label:'Sales Challans',icon:FileText,roles:['ADMIN','SALES','ACCOUNTS']},
 {to:'/invoices',label:'Invoice Center',icon:FileSpreadsheet,roles:['ADMIN','ACCOUNTS']},
 {to:'/users',label:'Users & Roles',icon:ShieldCheck,roles:['ADMIN']},
 {to:'/audit',label:'Audit Trail',icon:ScrollText,roles:['ADMIN']},
];

export default function AppShell({children}:{children:ReactNode}){
 const {user,logout}=useAuth(); const navigate=useNavigate(); const location=useLocation(); const [mobileOpen,setMobileOpen]=useState(false); const [cmd,setCmd]=useState(false); const [cmdQuery,setCmdQuery]=useState('');
 useEffect(()=>{const h=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCmd(true);setCmdQuery('')}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[]);
 const allowed=links.filter(x=>x.roles.includes(user?.role as string));
 const doLogout=()=>{logout();navigate('/login')};
 return <div className="app-shell">
   <AnimatePresence>{mobileOpen&&<motion.div className="mobile-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setMobileOpen(false)}/>}</AnimatePresence>
   <aside className={`sidebar ${mobileOpen?'sidebar-mobile-open':''}`}>
     <div className="brand"><div className="brand-mark">O</div><div><strong>OpsFlow</strong><span>ERP & CRM</span></div></div>
     <div className="workspace-chip"><span className="online-dot"/>Operations workspace</div>
     <nav>{allowed.map(({to,label,icon:Icon})=><NavLink key={to} to={to} onClick={()=>setMobileOpen(false)} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
     <div className="sidebar-bottom"><button className="nav-link" onClick={()=>navigate('/settings')}><Settings size={18}/><span>Settings</span></button><button className="nav-link" onClick={doLogout}><LogOut size={18}/><span>Sign out</span></button></div>
   </aside>
   <main className="main-shell">
    <div className="ambient-grid" aria-hidden="true"/>
    <header className="topbar"><button className="mobile-menu icon-btn" onClick={()=>setMobileOpen(true)}><Menu size={20}/></button><div className="topbar-search" onClick={()=>{setCmd(true);setCmdQuery('')}}><Search size={17}/><span>Search anything</span><kbd><Command size={11}/>K</kbd></div><div className="topbar-right"><div className="secure-pill"><ShieldCheck size={15}/> Role: {user?.role}</div><div className="avatar">{user?.fullName?.slice(0,1)}</div><div className="top-user"><strong>{user?.fullName}</strong><span>{user?.email}</span></div></div></header>
    <div className="page-container"><AnimatePresence mode="wait"><motion.div key={location.pathname} className="page-motion" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.22,ease:'easeOut'}}>{children}</motion.div></AnimatePresence></div>
   </main>
   <AnimatePresence>{cmd&&<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setCmd(false)}><motion.div className="command-modal" initial={{y:-20,opacity:0}} animate={{y:0,opacity:1}} onClick={e=>e.stopPropagation()}><div className="command-search"><Search/><input autoFocus value={cmdQuery} onChange={e=>setCmdQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setCmd(false)}} placeholder="Jump to a module or action..."/></div><div className="command-items">{allowed.filter(x=>x.label.toLowerCase().includes(cmdQuery.toLowerCase())).slice(0,7).map(({to,label,icon:Icon})=><button key={to} onClick={()=>{navigate(to);setCmd(false)}}><Icon size={18}/><span>{label}</span><kbd>↵</kbd></button>)}{['ADMIN','SALES'].includes(user?.role||'')&&<button onClick={()=>{navigate('/challans/new');setCmd(false)}}><FileText size={18}/><span>Create sales challan</span><kbd>↵</kbd></button>}</div></motion.div></motion.div>}</AnimatePresence>
 </div>
}
