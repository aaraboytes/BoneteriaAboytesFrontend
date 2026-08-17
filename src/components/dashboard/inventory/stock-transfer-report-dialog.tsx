'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  X as CloseIcon,
  FileArrowDown as FileArrowDownIcon,
  User as UserIcon,
  Storefront as StoreIcon,
  Calendar as CalendarIcon,
  ArrowsLeftRight as TransferIcon,
} from '@phosphor-icons/react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface TransferReportItem {
  productVariantId?: string;
  productId?: number | string;
  sku?: string;
  description?: string;
  model?: string;
  size?: string;
  color?: string;
  quantityTransferred: number;
  originStockBefore: number;
  originStockAfter: number;
  destStockBefore?: number;
  destStockAfter?: number;
}

export interface TransferReportData {
  id: number;
  date: string;
  userName: string;
  fromStoreId: number;
  fromStoreName: string;
  toStoreId: number;
  toStoreName: string;
  totalItems: number;
  totalUnits: number;
  detailsJson?: string;
  items: TransferReportItem[];
}

interface StockTransferReportDialogProps {
  open: boolean;
  onClose: () => void;
  report: TransferReportData | null;
}

export function StockTransferReportDialog({
  open,
  onClose,
  report,
}: StockTransferReportDialogProps): React.JSX.Element | null {
  if (!report) return null;

  const formattedDate = report.date
    ? new Date(report.date).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : new Date().toLocaleString('es-MX');

  const handleExportXLSX = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Reporte_Transferencia_${report.id}`);

      worksheet.addRow([`REPORTE DE TRANSFERENCIA DE INVENTARIO #${report.id}`]);
      worksheet.addRow([`Fecha:`, formattedDate]);
      worksheet.addRow([`Usuario:`, report.userName || 'Administrador']);
      worksheet.addRow([`Origen (Ubicación A):`, report.fromStoreName || `Sucursal ${report.fromStoreId}`]);
      worksheet.addRow([`Destino (Ubicación B):`, report.toStoreName || `Sucursal ${report.toStoreId}`]);
      worksheet.addRow([`Total Productos:`, report.totalItems]);
      worksheet.addRow([`Total Unidades:`, report.totalUnits]);
      worksheet.addRow([]);

      const tableHeaderRow = worksheet.addRow([
        'ID Producto',
        'SKU',
        'Descripción',
        'Modelo',
        'Talla',
        'Color',
        'Cantidad Enviada',
        'Stock Final en Ubicación A',
      ]);

      tableHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      tableHeaderRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '15B79E' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      report.items.forEach((item) => {
        const row = worksheet.addRow([
          item.productId || item.productVariantId || '',
          item.sku || 'N/A',
          item.description || 'Sin Descripción',
          item.model || 'N/A',
          item.size || 'N/A',
          item.color || 'N/A',
          item.quantityTransferred || 0,
          item.originStockAfter || 0,
        ]);

        row.getCell(7).alignment = { horizontal: 'right' };
        row.getCell(8).alignment = { horizontal: 'right' };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      saveAs(blob, `Reporte_Transferencia_Folio_${report.id}.xlsx`);
    } catch (err) {
      console.error('Failed to export transfer report XLSX:', err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2.5, pb: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'primary.alpha12',
                color: 'primary.main',
                display: 'flex',
              }}
            >
              <TransferIcon size={26} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Reporte de Transferencia de Inventario
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Folio / Reporte ID: <strong>#{report.id}</strong>
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon size={20} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 2.5 }}>
        <Stack spacing={2.5}>
          {/* Metadata Cards Header */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.neutral' }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarIcon size={20} color="var(--mui-palette-text-secondary)" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                      Fecha y Hora
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {formattedDate}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <UserIcon size={20} color="var(--mui-palette-text-secondary)" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                      Usuario Responsable
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {report.userName || 'Administrador'}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <StoreIcon size={20} color="var(--mui-palette-text-secondary)" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                      Ubicación Origen → Destino
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      🏢 {report.fromStoreName} → 🏢 {report.toStoreName}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>

            <Divider sx={{ my: 1.5 }} />

            <Stack direction="row" spacing={2} justifyContent="space-around" textAlign="center">
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                  Productos Distintos
                </Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  {report.totalItems}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                  Total Unidades Transferidas
                </Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  {report.totalUnits} unid.
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Details Table */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Detalle de Productos Transferidos ({report.items.length})
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 320, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.neutral' } }}>
                    <TableCell>ID</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Modelo</TableCell>
                    <TableCell>Talla</TableCell>
                    <TableCell>Color</TableCell>
                    <TableCell align="right">Cantidad Enviada</TableCell>
                    <TableCell align="right">Stock Final en Ubicación A</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.items.map((item, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{item.productId || item.productVariantId}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {item.description}
                        </Typography>
                        {item.sku && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            SKU: {item.sku}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{item.model || 'N/A'}</TableCell>
                      <TableCell>{item.size || 'N/A'}</TableCell>
                      <TableCell>{item.color || 'N/A'}</TableCell>
                      <TableCell align="right">
                        <Chip label={`-${item.quantityTransferred}`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: item.originStockAfter <= 0 ? 'warning.main' : 'text.primary' }}>
                        {item.originStockAfter}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleExportXLSX}
          startIcon={<FileArrowDownIcon size={18} />}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          Exportar Reporte (.xlsx)
        </Button>

        <Button
          variant="contained"
          color="primary"
          onClick={onClose}
          sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
        >
          Aceptar y Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
