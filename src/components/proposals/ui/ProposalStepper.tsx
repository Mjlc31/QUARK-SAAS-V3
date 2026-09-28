import React from 'react';
import { User, Settings, DollarSign, Eye, Download, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProposalStepperProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

const steps = [
  { id: 0, label: 'Cliente', icon: User },
  { id: 1, label: 'Técnico', icon: Settings },
  { id: 2, label: 'Precificação', icon: DollarSign },
  { id: 3, label: 'Preview', icon: Eye },
  { id: 4, label: 'Exportar', icon: Download },
];

export default function ProposalStepper({ currentStep, completedSteps, onStepClick }: ProposalStepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Conectores */}
        <div className="absolute left-0 top-4 w-full h-[2px] -z-10 flex">
          {steps.map((step, idx) => {
            if (idx === steps.length - 1) return null;
            const isCompleted = completedSteps.includes(idx) && (completedSteps.includes(idx + 1) || currentStep > idx);
            return (
              <div 
                key={idx} 
                className={`h-full flex-1 transition-colors duration-300 ${isCompleted ? 'bg-lime-400' : 'bg-zinc-700'}`} 
              />
            );
          })}
        </div>

        {/* Etapas */}
        {steps.map((step, idx) => {
          const isCompleted = completedSteps.includes(idx);
          const isActive = currentStep === idx;
          const Icon = isCompleted && !isActive ? Check : step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <button
                onClick={() => (isCompleted || isActive) && onStepClick(idx)}
                disabled={!isCompleted && !isActive}
                className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 z-10
                  ${isCompleted && !isActive ? 'bg-lime-400 text-zinc-900 cursor-pointer' : ''}
                  ${isActive ? 'bg-zinc-900 text-lime-400 ring-2 ring-lime-400 cursor-pointer' : ''}
                  ${!isCompleted && !isActive ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : ''}
                `}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border border-lime-400"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <Icon size={16} />
              </button>
              
              <span className={`text-xs font-medium hidden md:block transition-colors duration-300
                ${isActive ? 'text-lime-400' : isCompleted ? 'text-zinc-100' : 'text-zinc-500'}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
