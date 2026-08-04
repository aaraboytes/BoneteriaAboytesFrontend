'use client';

import * as React from 'react';
import {
    Avatar,
    Box,
    Card,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    Chip,
} from '@mui/material';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

export interface Product {
    id: number;
    name: string;
    description?: string;
    price: number;
    quantity?: number;
    imageBase64?: string;
    isDefault: boolean;
}

interface ProductsTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (id: number) => void;
}

export function ProductsTable({ products, onEdit, onDelete }: ProductsTableProps): React.JSX.Element {
    return (
        <Card variant="outlined">
            <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: '800px' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Price</TableCell>
                            <TableCell>Stock</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {products.map((product) => {
                            const displayName = product.name || product.description || 'Producto';
                            const firstLetter = displayName.length > 0 ? displayName.charAt(0).toUpperCase() : 'P';

                            return (
                                <TableRow hover key={product.id}>
                                    <TableCell>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Avatar 
                                                src={product.imageBase64 ? product.imageBase64 : undefined} 
                                                variant="rounded"
                                                sx={{ width: 48, height: 48, bgcolor: 'background.neutral' }}
                                            >
                                                {firstLetter}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2">{displayName}</Typography>
                                                {product.isDefault && (
                                                    <Chip label="Default" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 10, mt: 0.5 }} />
                                                )}
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {product.description || 'Sin descripción'}
                                        </Typography>
                                    </TableCell>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        ${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {product.quantity !== null && product.quantity !== undefined ? (
                                        <Chip 
                                            label={`${product.quantity} units`} 
                                            size="small" 
                                            color={product.quantity > 5 ? 'success' : product.quantity > 0 ? 'warning' : 'error'}
                                            variant="outlined"
                                        />
                                    ) : (
                                        <Typography variant="caption" color="text.disabled">N/A</Typography>
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                        <IconButton size="small" onClick={() => onEdit(product)}>
                                            <PencilIcon fontSize="var(--icon-fontSize-md)" />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => onDelete(product.id)}>
                                            <TrashIcon fontSize="var(--icon-fontSize-md)" />
                                        </IconButton>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                            );
                        })}
                        {products.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                    <Typography variant="body2" color="text.secondary">No products found. Add your first product!</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Box>
        </Card>
    );
}
