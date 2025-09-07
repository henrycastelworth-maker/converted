/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { removeAccessories, isolateOutfit, dressModel } from './services/geminiService';
import { createAlbumPage } from './lib/albumUtils';
import WorkflowCard from './components/PolaroidCard';
import Footer from './components/Footer';

type StepStatus = 'idle' | 'uploaded' | 'processing' | 'done' | 'error';

interface StepState {
    status: StepStatus;
    originalImage: string | null;
    processedImage: string | null;
    error: string | null;
    approved: boolean;
}

const initialStepState: StepState = {
    status: 'idle',
    originalImage: null,
    processedImage: null,
    error: null,
    approved: false,
};

function App() {
    const [step1, setStep1] = useState<StepState>(initialStepState); // Model Prep
    const [step2, setStep2] = useState<StepState>(initialStepState); // Outfit Prep
    const [step3, setStep3] = useState<StepState>(initialStepState); // Fusion
    const [album, setAlbum] = useState<string[]>([]);
    const [isDownloadingAlbum, setIsDownloadingAlbum] = useState(false);

    const handleImageUpload = (
        e: ChangeEvent<HTMLInputElement>,
        step: number
    ) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const imageUrl = reader.result as string;
                if (step === 1) {
                    setStep1({ ...initialStepState, status: 'uploaded', originalImage: imageUrl });
                    setStep2(initialStepState);
                    setStep3(initialStepState);
                } else if (step === 2) {
                    setStep2({ ...initialStepState, status: 'uploaded', originalImage: imageUrl });
                    setStep3(initialStepState);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProcess = async (step: number) => {
        let updater: React.Dispatch<React.SetStateAction<StepState>>;
        let apiCall: () => Promise<string>;

        if (step === 1 && step1.originalImage) {
            updater = setStep1;
            apiCall = () => removeAccessories(step1.originalImage!);
        } else if (step === 2 && step2.originalImage) {
            updater = setStep2;
            apiCall = () => isolateOutfit(step2.originalImage!);
        } else if (step === 3 && step1.processedImage && step2.processedImage) {
            updater = setStep3;
            apiCall = () => dressModel(step1.processedImage!, step2.processedImage!);
        } else {
            return;
        }

        updater(prev => ({ ...prev, status: 'processing', error: null }));

        try {
            const resultUrl = await apiCall();
            updater(prev => ({ ...prev, status: 'done', processedImage: resultUrl }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            console.error(`Failed to process step ${step}:`, err);
            updater(prev => ({ ...prev, status: 'error', error: errorMessage }));
        }
    };
    
    const handleRetry = (step: number) => {
        if (step === 1) {
            // Full reset
            setStep1({ ...initialStepState, status: 'uploaded', originalImage: step1.originalImage });
            setStep2(initialStepState);
            setStep3(initialStepState);
        } else if (step === 2) {
            setStep2(prev => ({ ...initialStepState, status: 'uploaded', originalImage: prev.originalImage }));
            setStep3(initialStepState);
        } else if (step === 3) {
            // Only retry step 3 process
            handleProcess(3);
        }
    }

    const handleApprove = (step: number) => {
       if (step === 1) setStep1(prev => ({ ...prev, approved: true }));
       if (step === 2) setStep2(prev => ({ ...prev, approved: true }));
    };

    const handleSaveToAlbum = () => {
        if (!step3.processedImage) return;
        setAlbum(prev => [...prev, step3.processedImage!]);
        // Reset for next outfit
        setStep2(initialStepState);
        setStep3(initialStepState);
    }

    const handleDownload = (imageUrl: string | null, fileName: string) => {
        if (!imageUrl) return;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAlbum = async () => {
        if (album.length === 0) return;
        setIsDownloadingAlbum(true);
        try {
            const albumImageUrl = await createAlbumPage(album);
            handleDownload(albumImageUrl, 'mi_album_virtual.jpeg');
        } catch (error) {
            console.error("Failed to create album page:", error);
            // Optionally, show an error to the user
        } finally {
            setIsDownloadingAlbum(false);
        }
    };


    return (
        <main className="bg-black text-neutral-200 min-h-screen w-full flex flex-col items-center justify-start p-4 pt-10 sm:pt-16 pb-24 overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.05]"></div>
            
            <div className="z-10 flex flex-col items-center justify-center w-full h-full">
                <div className="text-center mb-10">
                    <h1 className="text-6xl md:text-8xl font-caveat font-bold text-neutral-100">Probador Virtual</h1>
                    <p className="font-permanent-marker text-neutral-300 mt-2 text-xl tracking-wide">Vístete con la ayuda de IA.</p>
                </div>

                <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
                    {/* Step 1: Model Prep */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                        <WorkflowCard
                            stepNumber={1}
                            title="Prepara tu foto"
                            description="Sube una foto tuya (de las rodillas para arriba). La IA eliminará accesorios."
                            state={step1}
                            isStepActive={true}
                            onImageUpload={(e) => handleImageUpload(e, 1)}
                            onProcess={() => handleProcess(1)}
                            onRetry={() => handleRetry(1)}
                            onApprove={() => handleApprove(1)}
                            onDownload={() => handleDownload(step1.processedImage, 'paso1_modelo_preparado.png')}
                            uploadButtonText="Subir Foto de Modelo"
                            processButtonText="Quitar Accesorios"
                        />
                    </motion.div>

                    {/* Step 2: Outfit Prep */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                        <WorkflowCard
                            stepNumber={2}
                            title="Prepara el atuendo"
                            description="Sube una foto de la ropa. La IA aislará el atuendo del modelo y el fondo."
                            state={step2}
                            isStepActive={step1.approved}
                            onImageUpload={(e) => handleImageUpload(e, 2)}
                            onProcess={() => handleProcess(2)}
                            onRetry={() => handleRetry(2)}
                            onApprove={() => handleApprove(2)}
                            onDownload={() => handleDownload(step2.processedImage, 'paso2_atuendo_aislado.png')}
                            uploadButtonText="Subir Foto de Atuendo"
                            processButtonText="Aislar Atuendo"
                        />
                    </motion.div>

                    {/* Step 3: Fusion */}
                     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                        <WorkflowCard
                            stepNumber={3}
                            title="Fusión final"
                            description="Combina tu foto preparada con el atuendo aislado para el resultado final."
                            state={step3}
                            isStepActive={step1.approved && step2.approved}
                            onProcess={() => handleProcess(3)}
                            onRetry={() => handleRetry(3)}
                            onApprove={handleSaveToAlbum} // Repurposed for "Save to Album"
                            onDownload={() => handleDownload(step3.processedImage, 'paso3_resultado_final.png')}
                            processButtonText="Crear Fusión"
                            approveButtonText="Guardar en Álbum"
                        />
                    </motion.div>
                </div>

                {/* Album Section */}
                <AnimatePresence>
                    {album.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: 50 }}
                            transition={{ duration: 0.5 }}
                            className="w-full max-w-7xl mt-16 px-4"
                        >
                            <div className="text-center mb-8 border-t border-neutral-800 pt-8">
                                <h2 className="text-4xl md:text-5xl font-caveat font-bold text-neutral-100">Tu Álbum Virtual</h2>
                                <p className="font-permanent-marker text-neutral-400 mt-1 text-lg">Tus creaciones guardadas.</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {album.map((image, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                        className="aspect-square bg-black rounded-lg overflow-hidden shadow-lg border border-neutral-800"
                                    >
                                        <img src={image} alt={`Album item ${index + 1}`} className="w-full h-full object-cover" />
                                    </motion.div>
                                ))}
                            </div>
                             <div className="text-center mt-8">
                                <button 
                                    onClick={handleDownloadAlbum}
                                    disabled={isDownloadingAlbum}
                                    className="font-permanent-marker text-lg text-center text-black bg-yellow-400 py-3 px-6 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:-rotate-1 hover:bg-yellow-300 shadow-[2px_2px_0px_1px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {isDownloadingAlbum ? 'Creando álbum...' : 'Descargar Álbum'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <Footer />
        </main>
    );
}

export default App;
