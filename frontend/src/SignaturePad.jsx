import React, { useRef, useEffect, useState } from 'react';
import { SignatureCore } from './SignatureCore';
import { RotateCcw } from 'lucide-react';

const SignaturePad = ({ onConfirm, onCancel }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const signatureCore = useRef(null);
    const [aspectRatio, setAspectRatio] = useState(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');

    useEffect(() => {
        const handleResize = () => {
            setAspectRatio(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
            if (signatureCore.current) {
                signatureCore.current.setupCanvas();
            }
        };

        window.addEventListener('resize', handleResize);

        // Initialize core
        if (canvasRef.current) {
            signatureCore.current = new SignatureCore(canvasRef.current);
        }

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleConfirm = () => {
        if (signatureCore.current) {
            onConfirm(signatureCore.current.getDataURL());
        }
    };

    const handleClear = () => {
        if (signatureCore.current) {
            signatureCore.current.clear();
        }
    };

    return (
        <div ref={containerRef} style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'var(--bg-system, #f4f7f6)', zIndex: 9999,
            display: 'flex', flexDirection: aspectRatio === 'landscape' ? 'row' : 'column',
            overflow: 'hidden'
        }}>
            {/* Canvas Area */}
            <div style={{
                flex: 1, position: 'relative',
                backgroundColor: '#ffffff',
                margin: '10px', borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden'
            }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={(e) => signatureCore.current?.start(e)}
                    onMouseMove={(e) => signatureCore.current?.draw(e)}
                    onMouseUp={() => signatureCore.current?.stop()}
                    onMouseLeave={() => signatureCore.current?.stop()}
                    onTouchStart={(e) => signatureCore.current?.start(e)}
                    onTouchMove={(e) => signatureCore.current?.draw(e)}
                    onTouchEnd={() => signatureCore.current?.stop()}
                    style={{
                        width: '100%', height: '100%',
                        touchAction: 'none', cursor: 'crosshair',
                        display: 'block'
                    }}
                />

                <div style={{
                    position: 'absolute', top: '15px', left: '15px',
                    color: 'var(--text-muted, #666)', fontSize: '0.8rem', pointerEvents: 'none',
                    fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px'
                }}>
                    Espaço para Assinatura
                </div>

                <button
                    onClick={handleClear}
                    style={{
                        position: 'absolute', top: '10px', right: '10px',
                        padding: '10px', borderRadius: '50%', border: 'none',
                        backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-main)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title="Limpar"
                >
                    <RotateCcw size={18} />
                </button>
            </div>

            {/* Action Buttons Area */}
            <div style={{
                width: aspectRatio === 'landscape' ? '100px' : '100%',
                height: aspectRatio === 'landscape' ? '100%' : '100px',
                display: 'flex',
                flexDirection: aspectRatio === 'landscape' ? 'column' : 'row',
                justifyContent: 'center',
                padding: '10px 20px',
                gap: '10px'
            }}>
                <button
                    onClick={onCancel}
                    className="btn-primary"
                    style={{
                        flex: 1,
                        maxWidth: aspectRatio === 'landscape' ? 'none' : '150px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        height: aspectRatio === 'landscape' ? 'auto' : '50px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        writingMode: aspectRatio === 'landscape' ? 'vertical-rl' : 'horizontal-tb',
                        transform: aspectRatio === 'landscape' ? 'rotate(180deg)' : 'none',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
                    }}
                >
                    CANCELAR
                </button>

                <button
                    onClick={handleClear}
                    className="btn-primary"
                    style={{
                        flex: 1,
                        maxWidth: aspectRatio === 'landscape' ? 'none' : '150px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        height: aspectRatio === 'landscape' ? 'auto' : '50px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        writingMode: aspectRatio === 'landscape' ? 'vertical-rl' : 'horizontal-tb',
                        transform: aspectRatio === 'landscape' ? 'rotate(180deg)' : 'none',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(107, 114, 128, 0.15)'
                    }}
                >
                    LIMPAR
                </button>

                <button
                    onClick={handleConfirm}
                    className="btn-primary"
                    style={{
                        flex: 1,
                        maxWidth: aspectRatio === 'landscape' ? 'none' : '150px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        height: aspectRatio === 'landscape' ? 'auto' : '50px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        writingMode: aspectRatio === 'landscape' ? 'vertical-rl' : 'horizontal-tb',
                        transform: aspectRatio === 'landscape' ? 'rotate(180deg)' : 'none',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
                    }}
                >
                    CONFIRMAR
                </button>
            </div>
        </div>
    );
};

export default SignaturePad;
