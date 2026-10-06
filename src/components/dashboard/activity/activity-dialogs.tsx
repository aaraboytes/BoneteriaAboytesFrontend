'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import { CurrencyDollar, Clock, User, Storefront, SignIn, SignOut, Receipt } from '@phosphor-icons/react';

function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatCurrency(amount?: number | null): string {
  if (amount == null) return '$0.00';
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 1. CASH OPENING DIALOG
export interface CashOpeningDetailsData {
  id: number;
  storeId: number;
  storeName: string;
  openedAt: string;
  openedByEmployeeName: string;
  openingAmount: number;
  status: string;
}

interface CashOpeningDetailsDialogProps {
  open: boolean;
  data: CashOpeningDetailsData | null;
  onClose: () => void;
}

export function CashOpeningDetailsDialog({ open, data, onClose }: CashOpeningDetailsDialogProps): React.JSX.Element | null {
  if (!data) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box sx={{ p: 1, borderRadius: '50%', backgroundColor: 'success.light', color: 'success.contrastText', display: 'flex' }}>
          <CurrencyDollar size={24} weight="bold" />
        </Box>
        <Typography variant="h6">Apertura de Caja</Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.neutral', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Monto Inicial Registrado
            </Typography>
            <Typography variant="h4" color="success.main" sx={{ fontWeight: 700, mt: 0.5 }}>
              {formatCurrency(data.openingAmount)}
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <User size={14} /> Usuario
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {data.openedByEmployeeName}
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Storefront size={14} /> Ubicación
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {data.storeName}
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock size={14} /> Fecha y Hora de Apertura
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatDate(data.openedAt)}
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Estado
                </Typography>
                <Box>
                  <Chip
                    label={data.status === 'Open' ? 'Caja Abierta' : 'Cierre Completado'}
                    color={data.status === 'Open' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// 2. CASH CLOSING DIALOG
export interface CashClosingDetailsData {
  id: number;
  storeId: number;
  storeName: string;
  openedAt: string;
  closedAt: string;
  openedByEmployeeName: string;
  closedByEmployeeName: string;
  openingAmount: number;
  expectedCashAmount: number;
  countedCashAmount: number;
  cashDifference: number;
  status: string;
}

interface CashClosingDetailsDialogProps {
  open: boolean;
  data: CashClosingDetailsData | null;
  onClose: () => void;
}

export function CashClosingDetailsDialog({ open, data, onClose }: CashClosingDetailsDialogProps): React.JSX.Element | null {
  if (!data) return null;

  const diffColor = data.cashDifference === 0 ? 'text.secondary' : data.cashDifference > 0 ? 'success.main' : 'error.main';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box sx={{ p: 1, borderRadius: '50%', backgroundColor: 'warning.light', color: 'warning.contrastText', display: 'flex' }}>
          <Receipt size={24} weight="bold" />
        </Box>
        <Box>
          <Typography variant="h6">Corte de Caja</Typography>
          <Typography variant="caption" color="text.secondary">
            Resumen de Cierre de Sesión #{data.id} - {data.storeName}
          </Typography>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 4 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.neutral', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Fondo Inicial
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {formatCurrency(data.openingAmount)}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.neutral', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Efectivo Contado
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {formatCurrency(data.countedCashAmount)}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.neutral', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Diferencia
                </Typography>
                <Typography variant="subtitle1" color={diffColor} sx={{ fontWeight: 700 }}>
                  {formatCurrency(data.cashDifference)}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider />

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <User size={14} /> Abierta Por
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {data.openedByEmployeeName}
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <User size={14} /> Cerrada Por
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {data.closedByEmployeeName}
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock size={14} /> Fecha de Apertura
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatDate(data.openedAt)}
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock size={14} /> Fecha de Cierre
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatDate(data.closedAt)}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// 3. USER SESSION DIALOG (LOGIN / LOGOUT)
export interface UserSessionDetailsData {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeRole: string;
  loginAt: string;
  logoutAt?: string;
  deviceInfo?: string;
}

interface UserSessionDetailsDialogProps {
  open: boolean;
  data: UserSessionDetailsData | null;
  type: 'USER_LOGIN' | 'USER_LOGOUT';
  onClose: () => void;
}

export function UserSessionDetailsDialog({ open, data, type, onClose }: UserSessionDetailsDialogProps): React.JSX.Element | null {
  if (!data) return null;

  const isLogin = type === 'USER_LOGIN';

  let durationText = 'N/A';
  if (data.loginAt && data.logoutAt) {
    const start = new Date(data.loginAt).getTime();
    const end = new Date(data.logoutAt).getTime();
    const diffMins = Math.round((end - start) / (1000 * 60));
    if (diffMins < 60) {
      durationText = `${diffMins} min`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      durationText = `${hours}h ${mins}m`;
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box sx={{ p: 1, borderRadius: '50%', backgroundColor: isLogin ? 'info.light' : 'action.selected', color: isLogin ? 'info.contrastText' : 'text.primary', display: 'flex' }}>
          {isLogin ? <SignIn size={24} weight="bold" /> : <SignOut size={24} weight="bold" />}
        </Box>
        <Typography variant="h6">{isLogin ? 'Inicio de Sesión' : 'Cierre de Sesión'}</Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.neutral', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Usuario
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {data.employeeName}
            </Typography>
            <Chip label={data.employeeRole} size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock size={14} /> Hora de Inicio de Sesión
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatDate(data.loginAt)}
                </Typography>
              </Stack>
            </Grid>

            {!isLogin && data.logoutAt ? (
              <>
                <Grid size={{ xs: 6 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Clock size={14} /> Hora de Cierre
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatDate(data.logoutAt)}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Duración de Sesión
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {durationText}
                    </Typography>
                  </Stack>
                </Grid>
              </>
            ) : null}
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
