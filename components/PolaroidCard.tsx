/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { ChangeEvent } from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

type StepStatus = 'idle' | 'uploaded' | 'processing' | 'done' | 'error';
interface StepState {
    status: StepStatus;
    originalImage: string | null;
    processedImage: string | null;
    error: string | null;
    approved: boolean;
}

interface WorkflowCardProps {
    stepNumber: number;
    title: string;
    description: string;
    state: StepState;
    isStepActive: boolean;
    onImageUpload?: (e: ChangeEvent<HTMLInputElement>) => void;
    onProcess: () => void;
    onRetry: () => void;
    onApprove: () => void;
    onDownload: () => void;
    uploadButtonText?: string;
    processButtonText: string;
    approveButtonText?: string;
}

const LoadingSpinner = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
        <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const ErrorDisplay = ({ message, onRetry }: { message: string, onRetry: () => void }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/50 backdrop-blur-sm z-10 p-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-white text-sm mb-4">Error: {message}</p>
        <button onClick={onRetry} className="font-permanent-marker text-sm text-center text-white bg-white/10 backdrop-blur-sm border border-white/50 py-2 px-4 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-white hover:text-black">
            Reintentar
        </button>
    </div>
);

const UploadPlaceholder = ({ onImageUpload, uploadButtonText, stepNumber }: { onImageUpload?: (e: ChangeEvent<HTMLInputElement>) => void, uploadButtonText?: string, stepNumber: number }) => (
    <label htmlFor={`file-upload-${stepNumber}`} className="cursor-pointer flex flex-col items-center justify-center h-full text-neutral-500 hover:text-neutral-300 transition-colors duration-300 border-2 border-dashed border-neutral-700 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4m0 0l4-4m-4 4L8 8" />
        </svg>
        <span className="font-permanent-marker text-xl">{uploadButtonText}</span>
        {onImageUpload && <input id={`file-upload-${stepNumber}`} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={onImageUpload} />}
    </label>
);

const ActionButton = ({ onClick, children, className, disabled = false }: { onClick: () => void, children: React.ReactNode, className: string, disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} className={cn(className, "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none")}>
        {children}
    </button>
);


const WorkflowCard: React.FC<WorkflowCardProps> = ({
    stepNumber, title, description, state, isStepActive,
    onImageUpload, onProcess, onRetry, onApprove, onDownload,
    uploadButtonText, processButtonText, approveButtonText = "Aprobar"
}) => {
    const { status, originalImage, processedImage, error, approved } = state;

    const showOriginal = status === 'uploaded' && originalImage;
    const showProcessed = (status === 'done' || status === 'error' || approved) && processedImage;
    const showPlaceholder = !originalImage && !processedImage;

    const primaryButtonClasses = "font-permanent-marker text-base text-center text-black bg-yellow-400 py-2 px-5 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-yellow-300 shadow-[2px_2px_0px_1px_rgba(0,0,0,0.2)]";
    const secondaryButtonClasses = "font-permanent-marker text-base text-center text-white bg-white/10 backdrop-blur-sm border border-white/50 py-2 px-5 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-white hover:text-black";

    return (
        <div className={cn(
            "bg-neutral-900/50 border border-neutral-800 rounded-lg p-5 flex flex-col h-[550px] transition-all duration-300", 
            !isStepActive && "opacity-50 grayscale pointer-events-none",
            approved && "border-green-500/50"
        )}>
            <div className="text-center mb-4 relative">
                <h2 className="font-permanent-marker text-2xl text-yellow-400">Paso {stepNumber}</h2>
                <h3 className="font-bold text-xl text-neutral-100 mt-1">{title}</h3>
                <p className="text-sm text-neutral-400 mt-2 h-10">{description}</p>
                {approved && (
                    <div className="absolute top-0 right-0 text-green-400 flex items-center gap-1" title="Aprobado">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>

            <div className="flex-grow bg-black rounded-md relative overflow-hidden shadow-inner">
                {status === 'processing' && <LoadingSpinner />}
                {status === 'error' && error && <ErrorDisplay message={error} onRetry={onRetry} />}

                {showPlaceholder && <UploadPlaceholder onImageUpload={onImageUpload} uploadButtonText={uploadButtonText} stepNumber={stepNumber} />}
                {showOriginal && <img src={originalImage} alt="Original" className="w-full h-full object-contain" />}
                {showProcessed && <img src={processedImage} alt="Processed" className="w-full h-full object-contain" />}
            </div>

            <div className="mt-4 flex flex-col gap-3 h-[100px] justify-center">
                {status === 'idle' && !onImageUpload && (
                     <ActionButton onClick={onProcess} className={primaryButtonClasses}>
                        {processButtonText}
                    </ActionButton>
                )}
                {status === 'uploaded' && (
                    <ActionButton onClick={onProcess} className={primaryButtonClasses}>
                        {processButtonText}
                    </ActionButton>
                )}
                {status === 'done' && (
                    <motion.div initial={{ opacity: 0}} animate={{ opacity: 1}} className="flex flex-wrap justify-center gap-3">
                         <ActionButton onClick={onRetry} className={secondaryButtonClasses}>
                            Reintentar
                        </ActionButton>
                        <ActionButton onClick={onDownload} className={secondaryButtonClasses}>
                            Descargar
                        </ActionButton>
                        {!approved && (
                             <ActionButton onClick={onApprove} className={primaryButtonClasses}>
                                {approveButtonText}
                            </ActionButton>
                        )}
                    </motion.div>
                )}
                 {status !== 'done' && status !== 'uploaded' && status !== 'idle' && (
                     <p className="text-center text-neutral-500 text-sm">
                        {status === 'processing' ? 'Procesando...' : 'Completa el paso anterior para continuar.'}
                     </p>
                )}
            </div>
        </div>
    );
};

export default WorkflowCard;
