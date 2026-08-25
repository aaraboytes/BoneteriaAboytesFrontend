'use client';

import * as React from 'react';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
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

function mapInventoryItems(items: any[]): VariantOption[] {
  return items.map((item) => ({
    productVariantId: item.productVariantId ?? item.id,
    productId: item.productId,
    description: item.description ?? 'Sin descripción',
    sku: item.sku || 'N/A',
    size: item.size && item.size !== 'N/A' ? item.size : null,
    color: item.color && item.color !== 'N/A' ? item.color : null,
    unitPrice: item.price ?? 0,
    stockQuantity: item.stockQuantity ?? 0,
    barcodes: Array.isArray(item.barcodes) ? item.barcodes : [],
  }));
}

function variantLabel(option: VariantOption): string {
  const parts = [option.description, option.sku];
  if (option.size) parts.push(option.size);
  if (option.color) parts.push(option.color);
  return parts.join(' - ');
}

// Same data source and matching fields (description, SKU, barcodes) as the working
// Inventory search (src/components/dashboard/inventory/inventory-table.tsx), filtered
// entirely client-side over the full per-store list - no debounce, no server round trip
// per keystroke, and no dependence on ProductVariant.Inventory (a one-to-one nav property
// on a table whose real key is (ProductVariantId, StoreId), which silently returns
// store-inconsistent stock - this is why /api/inventory?storeId= is the correct source).
const filterOptions = createFilterOptions<VariantOption>({
  stringify: (option) => `${option.description} ${option.sku} ${option.barcodes.join(' ')}`,
  limit: 50,
});

export interface ProductSearchFieldProps {
  storeId: number | '';
  onSelect: (option: VariantOption) => void;
}

export function ProductSearchField({ storeId, onSelect }: ProductSearchFieldProps): React.JSX.Element {
  const [inputValue, setInputValue] = React.useState('');
  const [options, setOptions] = React.useState<VariantOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [barcode, setBarcode] = React.useState('');
  const [barcodeError, setBarcodeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!storeId) {
      setOptions([]);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiClient.get(`/Inventory?storeId=${storeId}`);
        if (active && Array.isArray(res.data)) {
          setOptions(mapInventoryItems(res.data));
        }
      } catch (err) {
        console.error('Failed to load inventory for product search', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [storeId]);

  const handleBarcodeScan = (): void => {
    const code = barcode.trim();
    if (!code) return;
    setBarcodeError(null);
    const match = options.find((option) => option.barcodes.includes(code));
    if (!match) {
      setBarcodeError('Código de barras no encontrado en esta sucursal');
      return;
    }
    onSelect(match);
    setBarcode('');
  };

  return (
    <Stack spacing={1}>
      <Autocomplete
        options={options}
        loading={loading}
        filterOptions={filterOptions}
        value={null}
        inputValue={inputValue}
        onInputChange={(_, value, reason) => {
          if (reason !== 'reset') setInputValue(value);
        }}
        getOptionLabel={(option) => variantLabel(option)}
        isOptionEqualToValue={(option, value) => option.productVariantId === value.productVariantId}
        onChange={(_, value) => {
          if (value) {
            onSelect(value);
            setInputValue('');
          }
        }}
        renderOption={(props, option) => (
          <Box component="li" {...props} key={option.productVariantId}>
            <Stack>
              <Typography variant="body2" fontWeight={600}>{variantLabel(option)}</Typography>
              <Typography variant="caption" color="text.secondary">
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
