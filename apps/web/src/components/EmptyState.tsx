import {ReactNode} from 'react'; import {Inbox} from 'lucide-react';
export default function EmptyState({title,subtitle,action}:{title:string;subtitle:string;action?:ReactNode}){return <div className="empty"><div className="empty-icon"><Inbox size={26}/></div><h4>{title}</h4><p>{subtitle}</p>{action}</div>}
