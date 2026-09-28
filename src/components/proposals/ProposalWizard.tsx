import React, { useReducer, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ProposalData, ProposalTheme, ProposalBlock, WizardAction, WizardState } from '../proposal/types';
import { DEFAULT_THEME } from '../proposal/types';
import ProposalStepper from './ui/ProposalStepper';
import StepClientData from './steps/StepClientData';
import StepTechConfig from './steps/StepTechConfig';
import StepPricing from './steps/StepPricing';
import StepPreview from './steps/StepPreview';
import StepExport from './steps/StepExport';
import { buildInitialBlocks } from '../proposal/catalog';

interface ProposalWizardProps {
  initialData?: ProposalData;
  onClose: () => void;
  onSave: (data: ProposalData) => Promise<void>;
}


const loadSavedTheme = () => {
  try {
    const saved = localStorage.getItem('@quark:savedTheme');
    if (saved) return { ...DEFAULT_THEME, ...JSON.parse(saved) };
  } catch(e) {}
  return DEFAULT_THEME;
};

const initialState: WizardState = {
  proposalData: { status: 'draft' },
  theme: loadSavedTheme(),
  blocks: [],
  currentStep: 0,
  isEditing: false,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_CLIENT_DATA': 
      return { ...state, proposalData: { ...state.proposalData, ...action.payload } };
    case 'SET_TECH_CONFIG': 
      return { ...state, proposalData: { ...state.proposalData, ...action.payload } };
    case 'SET_PRICING':     
      return { ...state, proposalData: { ...state.proposalData, ...action.payload } };
    case 'SET_THEME': {
      const newTheme = { ...state.theme, ...action.payload };
      try { localStorage.setItem('@quark:savedTheme', JSON.stringify(newTheme)); } catch(e) {}
      return { ...state, theme: newTheme };
    }
    case 'SET_BLOCKS':      
      return { ...state, blocks: action.payload };
    case 'SET_STATUS':      
      return { ...state, proposalData: { ...state.proposalData, status: action.payload } };
    case 'LOAD_PROPOSAL':   
      return { 
        ...state, 
        proposalData: action.payload, 
        theme: action.payload.theme || DEFAULT_THEME, 
        blocks: action.payload.blocks || [], 
        isEditing: true 
      };
    case 'RESET':           
      return initialState;
    default: 
      return state;
  }
}

export default function ProposalWizard({ initialData, onClose, onSave }: ProposalWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (initialData) {
      dispatch({ type: 'LOAD_PROPOSAL', payload: initialData });
      // Assume all previous steps are completed if we're editing
      setCompletedSteps([0, 1, 2, 3, 4]);
    }
  }, [initialData]);

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps((prev) => [...prev, currentStep]);
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#09090b]/95 backdrop-blur overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto min-h-screen flex flex-col py-8 px-4 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white bg-zinc-900/60 rounded-full border border-white/5 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-6 border-b border-white/5">
          <ProposalStepper currentStep={currentStep} completedSteps={completedSteps} onStepClick={(step) => {
            if (completedSteps.includes(step) || step === currentStep) {
              dispatch({ type: 'GOTO_STEP', payload: step } as any);
              setCurrentStep(step);
            }
          }} />
        </div>

        <div className="flex-1 w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {currentStep === 0 && (
                <StepClientData
                  data={state.proposalData}
                  onUpdate={(data) => dispatch({ type: 'SET_CLIENT_DATA', payload: data })}
                  onNext={handleNext}
                />
              )}
              {currentStep === 1 && (
                <StepTechConfig
                  data={state.proposalData}
                  onUpdate={(data) => dispatch({ type: 'SET_TECH_CONFIG', payload: data })}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}
              {currentStep === 2 && (
                <StepPricing
                  data={state.proposalData}
                  onUpdate={(data) => dispatch({ type: 'SET_PRICING', payload: data })}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}
              {currentStep === 3 && (
                <StepPreview
                  data={state.proposalData}
                  theme={state.theme}
                  blocks={state.blocks}
                  onUpdateTheme={(theme) => dispatch({ type: 'SET_THEME', payload: theme })}
                  onUpdateBlocks={(blocks) => dispatch({ type: 'SET_BLOCKS', payload: blocks })}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}
              {currentStep === 4 && (
                <StepExport
                  data={state.proposalData}
                  theme={state.theme}
                  blocks={state.blocks}
                  onSave={async (finalData) => {
                    await onSave({ ...state.proposalData, ...finalData, blocks: state.blocks, theme: state.theme } as ProposalData);
                  }}
                  onBack={handleBack}
                  onClose={onClose}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
