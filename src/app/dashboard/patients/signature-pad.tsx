'use client';

import * as React from 'react';
import { Box, Button, Typography, Stack } from '@mui/material';
import { Eraser as EraserIcon } from '@phosphor-icons/react';
import SignaturePadBase from 'signature_pad';

interface SignaturePadProps {
    value?: string;
    onChange: (signature: string) => void;
}

export function SignaturePad({ value, onChange }: SignaturePadProps): React.JSX.Element {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const signaturePadRef = React.useRef<SignaturePadBase | null>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const signaturePad = new SignaturePadBase(canvas, {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            penColor: 'rgb(0, 0, 0)',
        });

        signaturePadRef.current = signaturePad;

        signaturePad.addEventListener('endStroke', () => {
            onChange(signaturePad.toDataURL('image/png'));
        });

        if (value) {
            signaturePad.fromDataURL(value);
        }

        // Handle resizing
        const resizeCanvas = () => {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext('2d')?.scale(ratio, ratio);
            signaturePad.clear();
            if (value) signaturePad.fromDataURL(value);
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            signaturePad.off();
            signaturePadRef.current = null;
        };
    }, []);

    const clear = () => {
        signaturePadRef.current?.clear();
        onChange('');
    };

    return (
        <Stack spacing={1}>
            <Box 
                sx={{ 
                    border: '1px solid', 
                    borderColor: 'divider', 
                    borderRadius: 1, 
                    bgcolor: '#fff',
                    lineHeight: 0,
                    overflow: 'hidden',
                    '& canvas': {
                        width: '100%',
                        height: '200px',
                        touchAction: 'none'
                    }
                }}
            >
                <canvas ref={canvasRef} />
            </Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">
                    Sign inside the box above
                </Typography>
                <Button 
                    size="small" 
                    startIcon={<EraserIcon />} 
                    onClick={clear}
                    color="error"
                >
                    Clear Signature
                </Button>
            </Stack>
        </Stack>
    );
}
