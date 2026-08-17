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
  Printer as PrinterIcon,
  User as UserIcon,
  Storefront as StoreIcon,
  Calendar as CalendarIcon,
} from '@phosphor-icons/react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface IntakeReportItem {
  productVariantId?: string;
  productId?: number | string;
  sku?: string;
  description?: string;
  size?: string;
  color?: string;
  quantityAdded: number;
  previousStock: number;
  newStock: number;
}

export interface IntakeReportData {
  id: number;
  date: string;
  userName: string;
  storeId: number;
  storeName: string;
  totalItems: number;
  totalUnits: number;
  detailsJson?: string;
  items: IntakeReportItem[];
}

interface StockIntakeReportDialogProps {
  open: boolean;
  onClose: () => void;
  report: IntakeReportData | null;
}

export function StockIntakeReportDialog({
  open,
  onClose,
  report,
}: StockIntakeReportDialogProps): React.JSX.Element | null {
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
      const worksheet = workbook.addWorksheet(`Reporte_Ingreso_${report.id}`);

      // Header summary rows
      worksheet.addRow([`REPORTE DE INGRESO DE INVENTARIO #${report.id}`]);
      worksheet.addRow([`Fecha:`, formattedDate]);
      worksheet.addRow([`Usuario:`, report.userName || 'Administrador']);
      worksheet.addRow([`Sucursal:`, report.storeName || `Sucursal ${report.storeId}`]);
      worksheet.addRow([`Total Productos:`, report.totalItems]);
      worksheet.addRow([`Total Unidades:`, report.totalUnits]);
      worksheet.addRow([]); // Blank line

      // Table columns
      const tableHeaderRow = worksheet.addRow([
        'ID Producto',
        'SKU',
        'Descripción',
        'Talla',
        'Color',
        'Stock Anterior',
        'Cantidad Ingresada',
        'Stock Nuevo',
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
          item.size || 'N/A',
          item.color || 'N/A',
          item.previousStock || 0,
          item.quantityAdded || 0,
          item.newStock || 0,
        ]);

        row.getCell(6).alignment = { horizontal: 'right' };
        row.getCell(7).alignment = { horizontal: 'right' };
        row.getCell(8).alignment = { horizontal: 'right' };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      saveAs(blob, `Reporte_Ingreso_Inventario_Folio_${report.id}.xlsx`);
    } catch (err) {
      console.error('Failed to export report XLSX:', err);
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
                bgcolor: 'success.alpha12',
                color: 'success.main',
                display: 'flex',
              }}
            >
              <CheckIcon size={26} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Reporte de Ingreso de Inventario
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
                      Sucursal Destino
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      🏢 {report.storeName || `Sucursal ${report.storeId}`}
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
                  Total Unidades Ingresadas
                </Typography>
                <Typography variant="h6" fontWeight={800} color="success.main">
                  +{report.totalUnits} unid.
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Details Table */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Detalle de Productos Ingresados ({report.items.length})
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 320, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.neutral' } }}>
                    <TableCell>Id</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Talla</TableCell>
                    <TableCell>Color</TableCell>
                    <TableCell align="right">Stock Anterior</TableCell>
                    <TableCell align="right">Cantidad Ingresada</TableCell>
                    <TableCell align="right">Stock Nuevo</TableCell>
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
                      <TableCell>{item.size || 'N/A'}</TableCell>
                      <TableCell>{item.color || 'N/A'}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>
                        {item.previousStock}
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={`+${item.quantityAdded}`} color="success" size="small" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'success.dark' }}>
                        {item.newStock}
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
