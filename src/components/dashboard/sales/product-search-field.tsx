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
}

function flattenProducts(products: any[]): VariantOption[] {
  const options: VariantOption[] = [];
  for (const product of products) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    for (const variant of variants) {
      const sizeLabel = typeof variant.size === 'object' ? variant.size?.name : variant.size;
      const colorLabel = typeof variant.color === 'object' ? variant.color?.name : variant.color;
      options.push({
        productVariantId: variant.id,
        productId: product.id,
        description: product.description,
        sku: variant.sku || 'N/A',
        size: sizeLabel ?? null,
        color: colorLabel ?? null,
        unitPrice: variant.price && variant.price > 0 ? variant.price : product.price,
        stockQuantity: variant.inventory?.stockQuantity ?? 0,
      });
    }
  }
  return options;
}

function variantLabel(option: VariantOption): string {
  const parts = [option.description, option.sku];
  if (option.size) parts.push(option.size);
  if (option.color) parts.push(option.color);
  return parts.join(' - ');
}

export interface ProductSearchFieldProps {
  onSelect: (option: VariantOption) => void;
}

export function ProductSearchField({ onSelect }: ProductSearchFieldProps): React.JSX.Element {
  const [inputValue, setInputValue] = React.useState('');
  const [options, setOptions] = React.useState<VariantOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [barcode, setBarcode] = React.useState('');
  const [barcodeError, setBarcodeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    if (inputValue.trim().length < 2) {
      setOptions([]);
      return undefined;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/Products?search=${encodeURIComponent(inputValue)}`);
        if (active && Array.isArray(res.data)) {
          setOptions(flattenProducts(res.data));
        }
      } catch (err) {
        console.error('Failed to search products', err);
      } finally {
        if (active) setLoading(false);
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [inputValue]);

  const handleBarcodeScan = async (): Promise<void> => {
    const code = barcode.trim();
    if (!code) return;
    setBarcodeError(null);
    try {
      const res = await apiClient.get(`/Products/scan/${encodeURIComponent(code)}`);
      const variant = res.data;
      const sizeLabel = typeof variant.size === 'object' ? variant.size?.name : variant.size;
      const colorLabel = typeof variant.color === 'object' ? variant.color?.name : variant.color;
      onSelect({
        productVariantId: variant.id,
        productId: variant.product?.id,
        description: variant.product?.description ?? 'Sin descripción',
        sku: variant.sku || 'N/A',
        size: sizeLabel ?? null,
        color: colorLabel ?? null,
        unitPrice: variant.price && variant.price > 0 ? variant.price : variant.product?.price ?? 0,
        stockQuantity: variant.inventory?.stockQuantity ?? 0,
      });
      setBarcode('');
    } catch (err) {
      console.error('Barcode scan failed', err);
      setBarcodeError('Código de barras no encontrado');
    }
  };

  return (
    <Stack spacing={1}>
      <Autocomplete
        options={options}
        loading={loading}
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
            label="Buscar producto por nombre o SKU"
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
      />
    </Stack>
  );
}
