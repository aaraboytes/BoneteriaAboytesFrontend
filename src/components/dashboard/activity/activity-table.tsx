'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';

import {
  MagnifyingGlass as SearchIcon,
  ArrowsClockwise as RefreshIcon,
  Package as IntakeIcon,
  Trash as WithdrawalIcon,
  ArrowsLeftRight as TransferIcon,
  CurrencyDollar as CashOpenIcon,
  Receipt as CashCloseIcon,
  SignIn as LoginIcon,
  SignOut as LogoutIcon,
  Clock as ClockIcon,
  User as UserIcon,
  Storefront as StoreIcon,
  Door as DoorClosedIcon,
  DoorOpen as DoorOpenIcon,
} from '@phosphor-icons/react';

import apiClient from '@/lib/api-client';
import { StockIntakeReportDialog } from '@/components/dashboard/inventory/stock-intake-report-dialog';
import { StockWithdrawalReportDialog } from '@/components/dashboard/inventory/stock-withdrawal-report-dialog';
import { StockTransferReportDialog } from '@/components/dashboard/inventory/stock-transfer-report-dialog';
import { DoorEventDialog } from './door-event-dialog';
import {
  CashOpeningDetailsDialog,
  CashClosingDetailsDialog,
  UserSessionDetailsDialog,
} from './activity-dialogs';

export interface ActivityItem {
  id: string;
  type: 'STOCK_INTAKE' | 'STOCK_WITHDRAWAL' | 'STOCK_TRANSFER' | 'CASH_OPEN' | 'CASH_CLOSE' | 'USER_LOGIN' | 'USER_LOGOUT' | 'DOOR_OPENED' | 'DOOR_CLOSED';
  timestamp: string;
  user: string;
  location: string;
  description: string;
  details: any;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'info' | 'primary' | 'secondary' | 'default'; icon: React.ReactNode }> = {
  STOCK_INTAKE: { label: 'Ingreso Inventario', color: 'success', icon: <IntakeIcon size={18} weight="bold" /> },
  STOCK_WITHDRAWAL: { label: 'Baja Inventario', color: 'error', icon: <WithdrawalIcon size={18} weight="bold" /> },
  STOCK_TRANSFER: { label: 'Transferencia', color: 'info', icon: <TransferIcon size={18} weight="bold" /> },
  CASH_OPEN: { label: 'Apertura Caja', color: 'success', icon: <CashOpenIcon size={18} weight="bold" /> },
  CASH_CLOSE: { label: 'Corte Caja', color: 'warning', icon: <CashCloseIcon size={18} weight="bold" /> },
  USER_LOGIN: { label: 'Inicio Sesión', color: 'primary', icon: <LoginIcon size={18} weight="bold" /> },
  USER_LOGOUT: { label: 'Cierre Sesión', color: 'secondary', icon: <LogoutIcon size={18} weight="bold" /> },
  DOOR_OPENED: { label: 'Puerta abierta', color: 'warning', icon: <DoorOpenIcon size={18} weight="bold" /> },
  DOOR_CLOSED: { label: 'Puerta cerrada', color: 'success', icon: <DoorClosedIcon size={18} weight="bold" /> },
};

function formatEventTime(dateStr: string): { timeStr: string; dateStr: string } {
  if (!dateStr) return { timeStr: '--:--', dateStr: '--' };
  const d = new Date(dateStr);
  const timeStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStrFormatted = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  return { timeStr, dateStr: dateStrFormatted };
}

export function ActivityTable(): React.JSX.Element {
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<string>('ALL');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(15);

  // Selected item for dialog
  const [selectedItem, setSelectedItem] = React.useState<ActivityItem | null>(null);

  const fetchActivities = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (selectedType !== 'ALL') params.type = selectedType;

      const res = await apiClient.get<ActivityItem[]>('/Activity', { params });
      setActivities(res.data || []);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedType]);

  React.useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (item: ActivityItem) => {
    setSelectedItem(item);
  };

  const handleCloseDialog = () => {
    setSelectedItem(null);
  };

  // Helper to construct report object for StockIntakeReportDialog
  const getIntakeReport = React.useMemo(() => {
    if (!selectedItem || selectedItem.type !== 'STOCK_INTAKE') return null;
    const d = selectedItem.details || {};
    let items = d.items || [];
    if (!items.length && d.detailsJson) {
      try {
        items = JSON.parse(d.detailsJson);
      } catch (e) {
        items = [];
      }
    }
    return {
      id: d.id || 0,
      date: d.date || selectedItem.timestamp,
      userName: d.userName || selectedItem.user,
      storeId: d.storeId || 1,
      storeName: d.storeName || selectedItem.location,
      totalItems: d.totalItems || items.length,
      totalUnits: d.totalUnits || 0,
      detailsJson: d.detailsJson,
      items,
    };
  }, [selectedItem]);

  // Helper to construct report object for StockWithdrawalReportDialog
  const getWithdrawalReport = React.useMemo(() => {
    if (!selectedItem || selectedItem.type !== 'STOCK_WITHDRAWAL') return null;
    const d = selectedItem.details || {};
    let items = d.items || [];
    if (!items.length && d.detailsJson) {
      try {
        items = JSON.parse(d.detailsJson);
      } catch (e) {
        items = [];
      }
    }
    return {
      id: d.id || 0,
      date: d.date || selectedItem.timestamp,
      userName: d.userName || selectedItem.user,
      storeId: d.storeId || 1,
      storeName: d.storeName || selectedItem.location,
      totalItems: d.totalItems || items.length,
      totalUnits: d.totalUnits || 0,
      detailsJson: d.detailsJson,
      items,
    };
  }, [selectedItem]);

  // Helper to construct report object for StockTransferReportDialog
  const getTransferReport = React.useMemo(() => {
    if (!selectedItem || selectedItem.type !== 'STOCK_TRANSFER') return null;
    const d = selectedItem.details || {};
    let items = d.items || [];
    if (!items.length && d.detailsJson) {
      try {
        items = JSON.parse(d.detailsJson);
      } catch (e) {
        items = [];
      }
    }
    return {
      id: d.id || 0,
      date: d.date || selectedItem.timestamp,
      userName: d.userName || selectedItem.user,
      fromStoreId: d.fromStoreId || 1,
      fromStoreName: d.fromStoreName || 'Sucursal Origen',
      toStoreId: d.toStoreId || 2,
      toStoreName: d.toStoreName || 'Sucursal Destino',
      totalItems: d.totalItems || items.length,
      totalUnits: d.totalUnits || 0,
      detailsJson: d.detailsJson,
      items,
    };
  }, [selectedItem]);

  const paginatedActivities = React.useMemo(() => {
    return activities.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [activities, page, rowsPerPage]);

  return (
    <Stack spacing={3}>
      {/* Filters bar */}
      <Card sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ width: '100%' }}>
            <TextField
              size="small"
              placeholder="Buscar por usuario, evento o ubicación..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size={20} />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: { sm: 360 }, width: '100%' }}
            />

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Tipo de Evento</InputLabel>
              <Select
                value={selectedType}
                label="Tipo de Evento"
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">Todos los eventos</MenuItem>
                <MenuItem value="STOCK_INTAKE">Ingresos al Inventario</MenuItem>
                <MenuItem value="STOCK_WITHDRAWAL">Eliminaciones del Inventario</MenuItem>
                <MenuItem value="STOCK_TRANSFER">Transferencias de Inventario</MenuItem>
                <MenuItem value="CASH_OPEN">Aperturas de Caja</MenuItem>
                <MenuItem value="CASH_CLOSE">Cortes de Caja</MenuItem>
                <MenuItem value="USER_LOGIN">Inicios de Sesión</MenuItem>
                <MenuItem value="USER_LOGOUT">Cierres de Sesión</MenuItem>
                <MenuItem value="DOOR_OPENED">Puertas abiertas</MenuItem>
                <MenuItem value="DOOR_CLOSED">Puertas cerradas</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Tooltip title="Actualizar lista">
            <IconButton onClick={fetchActivities} disabled={loading} color="primary">
              <RefreshIcon size={22} className={loading ? 'spin' : ''} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Card>

      {/* Main Table */}
      <Card sx={{ overflow: 'hidden', boxShadow: 3 }}>
        {loading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Cargando historial de actividad...
            </Typography>
          </Box>
        ) : activities.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <ClockIcon size={48} color="var(--mui-palette-text-secondary)" />
            <Typography variant="h6" sx={{ mt: 2 }}>
              No se encontraron registro de actividades
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Prueba cambiando el filtro de búsqueda o el tipo de evento seleccionado.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 700 }}>
              <TableHead sx={{ bgcolor: 'background.neutral' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: '180px' }}>Hora y Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Evento</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '200px' }}>Ubicación</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '180px' }}>Usuario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedActivities.map((item) => {
                  const { timeStr, dateStr } = formatEventTime(item.timestamp);
                  const cfg = EVENT_TYPE_CONFIG[item.type] || { label: item.type, color: 'default', icon: <ClockIcon size={18} /> };

                  return (
                    <TableRow
                      key={item.id}
                      hover
                      onClick={() => handleRowClick(item)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      {/* Time & Date Column */}
                      <TableCell>
                        <Stack spacing={0.2}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {timeStr}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dateStr}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* Event Column (Showing time then the event) */}
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: `${cfg.color}.main`,
                              color: `${cfg.color}.contrastText`,
                              boxShadow: 1,
                            }}
                          >
                            {cfg.icon}
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {item.description}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* Location Column */}
                      <TableCell>
                        {item.location ? (
                          <Chip
                            icon={<StoreIcon size={14} />}
                            label={item.location}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600, borderRadius: 1.5 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            --
                          </Typography>
                        )}
                      </TableCell>

                      {/* User Column */}
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <UserIcon size={16} color="var(--mui-palette-text-secondary)" />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item.user}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 15, 25, 50]}
              component="div"
              count={activities.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </Box>
        )}
      </Card>

      {/* DIALOGS UPON ROW CLICK */}
      {selectedItem?.type === 'STOCK_INTAKE' && (
        <StockIntakeReportDialog open={Boolean(selectedItem)} report={getIntakeReport} onClose={handleCloseDialog} />
      )}

      {selectedItem?.type === 'STOCK_WITHDRAWAL' && (
        <StockWithdrawalReportDialog open={Boolean(selectedItem)} report={getWithdrawalReport} onClose={handleCloseDialog} />
      )}

      {selectedItem?.type === 'STOCK_TRANSFER' && (
        <StockTransferReportDialog open={Boolean(selectedItem)} report={getTransferReport} onClose={handleCloseDialog} />
      )}

      {selectedItem?.type === 'CASH_OPEN' && (
        <CashOpeningDetailsDialog open={Boolean(selectedItem)} data={selectedItem.details} onClose={handleCloseDialog} />
      )}

      {selectedItem?.type === 'CASH_CLOSE' && (
        <CashClosingDetailsDialog open={Boolean(selectedItem)} data={selectedItem.details} onClose={handleCloseDialog} />
      )}

      {(selectedItem?.type === 'USER_LOGIN' || selectedItem?.type === 'USER_LOGOUT') && (
        <UserSessionDetailsDialog
          open={Boolean(selectedItem)}
          type={selectedItem.type}
          data={selectedItem.details}
          onClose={handleCloseDialog}
        />
      )}

      {(selectedItem?.type === 'DOOR_OPENED' || selectedItem?.type === 'DOOR_CLOSED') && (
        <DoorEventDialog
          open={Boolean(selectedItem)}
          opened={selectedItem.type === 'DOOR_OPENED'}
          data={selectedItem.details}
          onClose={handleCloseDialog}
        />
      )}
    </Stack>
  );
}
