import {Navigate,Route,Routes} from 'react-router-dom';
import {useAuth} from './auth';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Challans from './pages/Challans';
import ChallanDetail from './pages/ChallanDetail';
import ChallanCreate from './pages/ChallanCreate';
import Users from './pages/Users';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import Invoices from './pages/Invoices';
import {ReactNode} from 'react';

function Guard({children}:{children:ReactNode}){const {user}=useAuth();return user?<AppShell>{children}</AppShell>:<Navigate to="/login" replace/>}
function RoleGuard({roles,children}:{roles:string[];children:ReactNode}){const {user}=useAuth(); if(!user)return <Navigate to="/login" replace/>; return roles.includes(user.role)?<>{children}</>:<Navigate to="/" replace/>;}
export default function App(){return <Routes><Route path="/login" element={<Login/>}/><Route path="/" element={<Guard><Dashboard/></Guard>}/><Route path="/customers" element={<Guard><RoleGuard roles={['ADMIN','SALES']}><Customers/></RoleGuard></Guard>}/><Route path="/customers/:id" element={<Guard><RoleGuard roles={['ADMIN','SALES']}><CustomerDetail/></RoleGuard></Guard>}/><Route path="/products" element={<Guard><RoleGuard roles={['ADMIN','WAREHOUSE']}><Products/></RoleGuard></Guard>}/><Route path="/inventory" element={<Guard><RoleGuard roles={['ADMIN','WAREHOUSE']}><Inventory/></RoleGuard></Guard>}/><Route path="/challans" element={<Guard><RoleGuard roles={['ADMIN','SALES','ACCOUNTS']}><Challans/></RoleGuard></Guard>}/><Route path="/challans/:id" element={<Guard><RoleGuard roles={['ADMIN','SALES','ACCOUNTS']}><ChallanDetail/></RoleGuard></Guard>}/><Route path="/challans/new" element={<Guard><RoleGuard roles={['ADMIN','SALES']}><ChallanCreate/></RoleGuard></Guard>}/><Route path="/invoices" element={<Guard><RoleGuard roles={['ADMIN','ACCOUNTS']}><Invoices/></RoleGuard></Guard>}/><Route path="/audit" element={<Guard><RoleGuard roles={['ADMIN']}><Audit/></RoleGuard></Guard>}/><Route path="/users" element={<Guard><RoleGuard roles={['ADMIN']}><Users/></RoleGuard></Guard>}/><Route path="/settings" element={<Guard><Settings/></Guard>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>}
