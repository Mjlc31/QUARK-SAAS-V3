import React from 'react';
import { FileText, TrendingUp, CheckCircle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProposalMetricsProps {
  proposals: Array<{
    finalPrice: number;
    status?: string;
    createdAt?: string;
  }>;
}

export default function ProposalMetrics({ proposals }: ProposalMetricsProps) {
  const total = proposals.length;
  
  const approvedProposals = proposals.filter(p => p.status === 'approved');
  const totalValue = approvedProposals.reduce((acc, curr) => acc + curr.finalPrice, 0);
  
  const conversionRate = total > 0 ? (approvedProposals.length / total) * 100 : 0;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthProposals = proposals.filter(p => {
    if (!p.createdAt) return false;
    const date = new Date(p.createdAt);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const metrics = [
    {
      id: 'total',
      label: 'Total de Propostas',
      value: total.toString(),
      icon: FileText,
    },
    {
      id: 'value',
      label: 'Valor Fechado',
      value: formatCurrency(totalValue),
      icon: TrendingUp,
    },
    {
      id: 'conversion',
      label: 'Taxa de Conversão',
      value: `${conversionRate.toFixed(1)}%`,
      icon: CheckCircle,
    },
    {
      id: 'month',
      label: 'No Mês',
      value: thisMonthProposals.length.toString(),
      icon: Calendar,
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <motion.div
            key={metric.id}
            variants={item}
            className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-xl p-5 flex items-center gap-4 hover:border-white/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-lime-400/10 flex items-center justify-center text-lime-400 shrink-0">
              <Icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">{metric.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{metric.value}</p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
