import {CircleCheck, CircleX, Info} from 'lucide-react';
import {motion} from 'framer-motion';
export default function Toast({message,type='success',onClose}:{message:string;type?:'success'|'error'|'info';onClose:()=>void}){
 const Icon=type==='success'?CircleCheck:type==='error'?CircleX:Info;
 return <motion.div initial={{opacity:0,y:-12,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8}} className={`toast toast-${type}`} onClick={onClose}><Icon size={18}/><span>{message}</span></motion.div>
}
