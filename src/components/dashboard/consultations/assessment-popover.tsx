import * as React from 'react';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

export interface Assessment {
  id: number;
  area: string;
  pain: number;
  edema: string;
  romS: string;
  movement: string;
  temperature: string;
  muscleTone: string;
  muscularForce: string;
  sensitivityAndReflexes: string;
  recovery: number;
  observations: string;
}

interface AssessmentPopoverProps {
  assessment: Assessment | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export function AssessmentPopover({ assessment, anchorEl, onClose }: AssessmentPopoverProps): React.JSX.Element {
  const open = Boolean(anchorEl);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      slotProps={{
        paper: {
          sx: { width: '320px', p: 2, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }
        }
      }}
    >
      {assessment ? (
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
            Assessment: {assessment.area}
          </Typography>
          <Divider />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Pain (1-10)</Typography>
              <Typography variant="body2" fontWeight="medium">{assessment.pain}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Recovery (%)</Typography>
              <Typography variant="body2" fontWeight="medium">{assessment.recovery}%</Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Edema</Typography>
            <Typography variant="body2">{assessment.edema || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">ROM S</Typography>
            <Typography variant="body2">{assessment.romS || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Movement</Typography>
            <Typography variant="body2">{assessment.movement || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Temperature</Typography>
            <Typography variant="body2">{assessment.temperature || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Muscle Tone</Typography>
            <Typography variant="body2">{assessment.muscleTone || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Muscular Force</Typography>
            <Typography variant="body2">{assessment.muscularForce || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Sensitivity & Reflexes</Typography>
            <Typography variant="body2">{assessment.sensitivityAndReflexes || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Observations</Typography>
            <Typography variant="body2" sx={{ fontStyle: assessment.observations ? 'normal' : 'italic' }}>
              {assessment.observations || 'None'}
            </Typography>
          </Box>
        </Stack>
      ) : (
        <Typography variant="body2">No assessment selected</Typography>
      )}
    </Popover>
  );
}
