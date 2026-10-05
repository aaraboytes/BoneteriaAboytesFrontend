'use client';

import * as React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import apiClient from '@/lib/api-client';

export interface CustomerOption {
  id: number;
  name: string;
  taxId: string | null;
  points: number;
  loyaltyTier: { name: string; discountPercentage: number } | null;
}

export interface CustomerPickerProps {
  value: CustomerOption | null;
  onChange: (customer: CustomerOption | null) => void;
}

// Optional customer for the sale (loyalty points and tier discount), searched by name, RFC or number.
export function CustomerPicker({ value, onChange }: CustomerPickerProps): React.JSX.Element {
  const [inputValue, setInputValue] = React.useState('');
  const [options, setOptions] = React.useState<CustomerOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const search = inputValue.trim();
    if (search.length < 2 || (value && inputValue === value.name)) {
      setOptions(value ? [value] : []);
      return;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get<CustomerOption[]>('/Customers', { params: { search, take: 20 } });
        if (active) setOptions(res.data);
      } catch (err) {
        console.error('Customer search failed', err);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [inputValue, value]);

  return (
    <Autocomplete
      sx={{ width: 300 }}
      options={options}
      loading={loading}
      filterOptions={(x) => x}
      value={value}
      inputValue={inputValue}
      onInputChange={(_, v) => setInputValue(v)}
      onChange={(_, v) => onChange(v)}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      noOptionsText={inputValue.trim().length < 2 ? 'Escribe al menos 2 letras' : 'Sin resultados'}
      renderOption={(props, o) => (
        <Box component="li" {...props} key={o.id}>
          <Stack>
            <Typography variant="body2">{o.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              #{o.id}
              {o.taxId ? ` · ${o.taxId}` : ''} · {o.points} puntos
              {o.loyaltyTier ? ` · ${o.loyaltyTier.name} (${o.loyaltyTier.discountPercentage}%)` : ''}
            </Typography>
          </Stack>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Cliente (opcional)"
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
