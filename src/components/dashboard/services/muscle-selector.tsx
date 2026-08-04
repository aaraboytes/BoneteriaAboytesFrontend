'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import { ArrowsLeftRight as FlipIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { CustomBodyModel, INDEPENDENT_MUSCLES } from './custom-body-model';

export interface MuscleSelectorProps {
    selectedMuscles: string[]; // e.g. ["chest-left", "biceps-right"]
    onChange: (muscles: string[]) => void;
    gender?: 'male' | 'female';
    readonly?: boolean;
}

export function MuscleSelector({ selectedMuscles, onChange, gender = 'male', readonly = false }: MuscleSelectorProps): React.JSX.Element {

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Select Target Muscle Groups
                </Typography>
            </Stack>

            <Box sx={{
                border: '1px solid var(--mui-palette-divider)',
                borderRadius: 2,
                p: 2,
                bgcolor: 'background.paper',
                width: '100%',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
                minHeight: 350
            }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>Front (Anterior)</Typography>
                    <CustomBodyModel
                        data={selectedMuscles}
                        type="anterior"
                        gender={gender}
                        onClick={(muscleId) => {
                            if (readonly) return;
                            onChange(
                                selectedMuscles.includes(muscleId)
                                    ? selectedMuscles.filter((m) => m !== muscleId)
                                    : [...selectedMuscles, muscleId]
                            );
                        }}
                        highlightedColors={['var(--mui-palette-primary-main)', 'var(--mui-palette-primary-light)']}
                        style={{ width: '12rem', cursor: readonly ? 'default' : 'pointer' }}
                    />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>Back (Posterior)</Typography>
                    <CustomBodyModel
                        data={selectedMuscles}
                        type="posterior"
                        gender={gender}
                        onClick={(muscleId) => {
                            if (readonly) return;
                            onChange(
                                selectedMuscles.includes(muscleId)
                                    ? selectedMuscles.filter((m) => m !== muscleId)
                                    : [...selectedMuscles, muscleId]
                            );
                        }}
                        highlightedColors={['var(--mui-palette-primary-main)', 'var(--mui-palette-primary-light)']}
                        style={{ width: '12rem', cursor: readonly ? 'default' : 'pointer' }}
                    />
                </Box>
            </Box>

            <Box sx={{ width: '100%', minHeight: 40 }}>
                {selectedMuscles.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {selectedMuscles.map(m => (
                            <Chip
                                key={m}
                                label={m.replace(/-/g, ' ')}
                                onDelete={readonly ? undefined : () => onChange(selectedMuscles.filter(sm => sm !== m))}
                                color="primary"
                                variant="outlined"
                                size="small"
                                sx={{ textTransform: 'capitalize' }}
                            />
                        ))}
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.disabled" align="center">
                        No muscles selected. Click map to select.
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
