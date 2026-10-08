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

// Looks a scanned barcode up at this store; null when nothing matches.
export async function findVariantByBarcode(storeId: number, barcode: string): Promise<VariantOption | null> {
  const res = await apiClient.get<SearchResult[]>('/Inventory/search', { params: { storeId, barcode } });
  return res.data.length > 0 ? toOption(res.data[0]) : null;
}

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
  const [message, setMessage] = React.useState<string | null>(null);
  const highlighted = React.useRef<VariantOption | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // The cashier should be able to scan the next item without touching the mouse.
  React.useEffect(() => {
    if (storeId) inputRef.current?.focus();
  }, [storeId]);

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

  const add = (option: VariantOption): void => {
    onSelect(option);
    setInputValue('');
    setOptions([]);
    setMessage(null);
    inputRef.current?.focus();
  };

  // Enter on text that isn't a highlighted suggestion is treated as a barcode (scanners type then press Enter).
  const handleEnter = async (): Promise<void> => {
    const code = inputValue.trim();
    if (!code || !storeId) return;
    try {
      const res = await apiClient.get<SearchResult[]>('/Inventory/search', { params: { storeId, barcode: code } });
      if (res.data.length === 0) {
        setMessage(`No se encontró ningún producto con el código "${code}".`);
        return;
      }
      add(toOption(res.data[0]));
    } catch (err) {
      console.error('Barcode lookup failed', err);
      setMessage('No se pudo buscar el código. Revisa la conexión e inténtalo de nuevo.');
    }
  };

  return (
    <Autocomplete
      options={options}
      loading={loading}
      // The server already filtered; show its results as they are.
      filterOptions={(x) => x}
      value={null}
      inputValue={inputValue}
      onInputChange={(_, value, reason) => {
        if (reason !== 'reset') {
          setInputValue(value);
          setMessage(null);
        }
      }}
      onHighlightChange={(_, option) => {
        highlighted.current = option;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !highlighted.current) {
          event.preventDefault();
          (event as unknown as { defaultMuiPrevented: boolean }).defaultMuiPrevented = true;
          void handleEnter();
        }
      }}
      getOptionLabel={(option) => variantLabel(option)}
      isOptionEqualToValue={(option, value) => option.productVariantId === value.productVariantId}
      noOptionsText={inputValue.trim().length < 2 ? 'Escribe al menos 2 letras' : 'Sin resultados'}
      onChange={(_, value) => {
        if (value) add(value);
      }}
      renderOption={(props, option) => {
        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
        const out = option.stockQuantity <= 0;
        return (
          <Box component="li" key={key} {...rest}>
            <Stack direction="row" justifyContent="space-between" sx={{ width: '100%' }} spacing={2}>
              <Stack>
                <Typography variant="body2" fontWeight={600}>
                  {variantLabel(option)}
                </Typography>
                <Typography variant="caption" color={out ? 'error' : 'text.secondary'}>
                  {out ? 'Sin existencia' : `Existencia: ${option.stockQuantity}`}
                </Typography>
              </Stack>
              <Typography variant="body2" fontWeight={700}>
                ${option.unitPrice.toFixed(2)}
              </Typography>
            </Stack>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          autoFocus
          label="Escanea o busca un producto"
          placeholder="Código de barras, nombre o SKU"
          error={Boolean(message)}
          helperText={message ?? 'Escanea el código y se agrega solo, o escribe para buscar.'}
          disabled={!storeId}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
