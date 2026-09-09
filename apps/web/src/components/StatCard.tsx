import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type Props = {
  label: string;
  value: string | number;
  meta: string;
  icon: LucideIcon;
  tone?: string;
};

export default function StatCard({ label, value, meta, icon: Icon, tone = 'default' }: Props) {
  return (
    <motion.div
      className={`stat-card tone-${tone}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon"><Icon size={18} /></div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-meta">{meta}</div>
    </motion.div>
  );
}
