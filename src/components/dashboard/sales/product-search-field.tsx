'use client';

import * as React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import apiClient from '@/lib/api-client';

export interface VariantOption {
  productVariantId: string;
  productId: number;
  description: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  unitPrice: number;
  stockQuantity: number;
  barcodes: string[];
}

interface SearchResult {
  productVariantId: string;
  productId: number;
  description: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number;
  stockQuantity: number;
  barcodes: string[];
}

const toOption = (r: SearchResult): VariantOption => ({ ...r, unitPrice: r.price });

function variantLabel(option: VariantOption): string {
  const parts = [option.description, option.sku];
  if (option.size) parts.push(option.size);
  if (option.color) parts.push(option.color);
  return parts.join(' - ');
}

export interface ProductSearchFieldProps {
  storeId: number | '';
  onSelect: (option: VariantOption) => void;
}

// Searches the server as the cashier types (description, SKU or barcode at this store), so the
// stock shown is current and the page doesn't load the whole catalog.
export function ProductSearchField({ storeId, onSelect }: ProductSearchFieldProps): React.JSX.Element {
  const [inputValue, setInputValue] = React.useState('');
  const [options, setOptions] = React.useState<VariantOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [barcode, setBarcode] = React.useState('');
  const [barcodeError, setBarcodeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = inputValue.trim();
    if (!storeId || q.length < 2) {
      setOptions([]);
      return;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get<SearchResult[]>('/Inventory/search', { params: { storeId, q } });
        if (active) setOptions(res.data.map(toOption));
      } catch (err) {
        console.error('Product search failed', err);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [inputValue, storeId]);

  const handleBarcodeScan = async (): Promise<void> => {
    const code = barcode.trim();
    if (!code || !storeId) return;
    setBarcodeError(null);
    try {
      const res = await apiClient.get<SearchResult[]>('/Inventory/search', { params: { storeId, barcode: code } });
      if (res.data.length === 0) {
        setBarcodeError('Código de barras no encontrado');
        return;
      }
      onSelect(toOption(res.data[0]));
      setBarcode('');
    } catch (err) {
      console.error('Barcode lookup failed', err);
      setBarcodeError('No se pudo buscar el código');
    }
  };

  return (
    <Stack spacing={1}>
      <Autocomplete
        options={options}
        loading={loading}
        // The server already filtered; show its results as they are.
        filterOptions={(x) => x}
        value={null}
        inputValue={inputValue}
        onInputChange={(_, value, reason) => {
          if (reason !== 'reset') setInputValue(value);
        }}
        getOptionLabel={(option) => variantLabel(option)}
        isOptionEqualToValue={(option, value) => option.productVariantId === value.productVariantId}
        noOptionsText={inputValue.trim().length < 2 ? 'Escribe al menos 2 letras' : 'Sin resultados'}
        onChange={(_, value) => {
          if (value) {
            onSelect(value);
            setInputValue('');
          }
        }}
        renderOption={(props, option) => (
          <Box component="li" {...props} key={option.productVariantId}>
            <Stack>
              <Typography variant="body2" fontWeight={600}>
                {variantLabel(option)}
              </Typography>
              <Typography variant="caption" color={option.stockQuantity > 0 ? 'text.secondary' : 'error'}>
                Stock: {option.stockQuantity} · ${option.unitPrice.toFixed(2)}
              </Typography>
            </Stack>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Buscar producto por nombre, SKU o código de barras"
            disabled={!storeId}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <TextField
        label="Escanear código de barras"
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleBarcodeScan();
          }
        }}
        error={Boolean(barcodeError)}
        helperText={barcodeError ?? 'Escanee o escriba el código y presione Enter'}
        size="small"
        disabled={!storeId}
      />
    </Stack>
  );
}
