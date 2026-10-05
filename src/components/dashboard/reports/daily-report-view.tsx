'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { ApexOptions } from 'apexcharts';

import apiClient from '@/lib/api-client';
import { exportDailyReport } from '@/lib/pos/export-daily-report';
import { Chart } from '@/components/core/chart';
import { inventoryTypeLabels, type AmountRow, type DailyReport } from '@/types/daily-report';

interface StoreOption {
  id: number;
  name: string;
}

const money = (v: number | null | undefined): string =>
  v == null ? '—' : v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const time = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }): React.JSX.Element {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5">{value}</Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

// Amounts with a thin share bar (one color: the bar shows magnitude, the label carries identity).
function ShareTable({ rows, countLabel }: { rows: AmountRow[]; countLabel: string }): React.JSX.Element {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin datos.
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell />
          <TableCell align="right">{countLabel}</TableCell>
          <TableCell align="right">Monto</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.name}>
            <TableCell sx={{ width: '45%' }}>
              <Typography variant="body2">{r.name}</Typography>
              <LinearProgress
                variant="determinate"
                value={total > 0 ? (r.amount / total) * 100 : 0}
                sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
              />
            </TableCell>
            <TableCell align="right">{r.count}</TableCell>
            <TableCell align="right">{money(r.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DailyReportView(): React.JSX.Element {
  const theme = useTheme();
  const [stores, setStores] = React.useState<StoreOption[]>([]);
  const [storeId, setStoreId] = React.useState<number | ''>('');
  const [date, setDate] = React.useState('');
  const [report, setReport] = React.useState<DailyReport | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    apiClient
      .get<StoreOption[]>('/Stores')
      .then((res) => setStores(res.data))
      .catch((err) => console.error('Failed to fetch stores', err));
  }, []);

  const load = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DailyReport>('/Reports/daily', {
        params: { date: date || undefined, storeId: storeId || undefined },
      });
      setReport(res.data);
      // Without a date the server picks today's business day; show it in the picker.
      if (!date) setDate(res.data.date);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo cargar el reporte.');
    } finally {
      setLoading(false);
    }
  }, [date, storeId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleExport = async (): Promise<void> => {
    if (!report) return;
    setExporting(true);
    try {
      await exportDailyReport(report);
    } finally {
      setExporting(false);
    }
  };

  const s = report?.summary;
  const hourOptions: ApexOptions = {
    chart: { toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: false } },
    colors: [theme.palette.primary.main],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4, borderRadiusApplication: 'end' } },
    dataLabels: { enabled: false },
    grid: { borderColor: theme.palette.divider, strokeDashArray: 2, xaxis: { lines: { show: false } } },
    xaxis: {
      categories: report?.byHour.map((h) => `${String(h.hour).padStart(2, '0')}:00`) ?? [],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: theme.palette.text.secondary } },
    },
    yaxis: { labels: { formatter: (v) => money(v), style: { colors: theme.palette.text.secondary } } },
    tooltip: {
      theme: theme.palette.mode,
      y: { formatter: (v, opts) => `${money(v)} · ${report?.byHour[opts.dataPointIndex]?.count ?? 0} ventas` },
    },
  };

  return (
    <Stack spacing={3}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #daily-report-printable, #daily-report-printable * { visibility: visible; }
          #daily-report-printable { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} className="no-print">
        <TextField
          label="Día"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 180 }}
        />
        <TextField select label="Sucursal" value={storeId} onChange={(e) => setStoreId(e.target.value === '' ? '' : Number(e.target.value))} sx={{ width: 260 }}>
          <MenuItem value="">Todas las sucursales</MenuItem>
          {stores.map((st) => (
            <MenuItem key={st.id} value={st.id}>
              {st.name}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" onClick={() => window.print()} disabled={!report}>
          Imprimir
        </Button>
        <Button variant="contained" onClick={handleExport} disabled={!report || exporting}>
          {exporting ? 'Exportando...' : 'Exportar a Excel'}
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading && !report ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {report && s ? (
        <Stack spacing={3} id="daily-report-printable" sx={{ opacity: loading ? 0.6 : 1 }}>
          <Box>
            <Typography variant="h5">
              Reporte del día {report.date} · {report.storeName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Del {new Date(report.fromLocal).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })} al{' '}
              {new Date(report.toLocal).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })} · Las cajas cuentan
              para el día en que se abrieron
            </Typography>
          </Box>

          {report.openSessions > 0 ? (
            <Alert severity="warning">
              {report.openSessions} caja(s) de este día siguen abiertas: las cifras de efectivo pueden cambiar hasta el cierre.
            </Alert>
          ) : null}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Kpi label="Ventas netas" value={money(s.netSales)} hint={`${s.salesCount} ventas · ${s.units} artículos`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Kpi label="Ticket promedio" value={money(s.averageTicket)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Kpi label="Devoluciones" value={money(s.refunds)} hint={`${s.returnsCount} · neto ${money(s.netAfterReturns)}`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Kpi
                label="Utilidad bruta"
                value={money(s.grossMargin)}
                hint={s.costCoverage < 1 ? `Costo conocido en ${Math.round(s.costCoverage * 100)}% de los artículos` : `Costo ${money(s.cost)}`}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader title="Resumen" />
                <CardContent sx={{ pt: 0 }}>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Ventas brutas</TableCell>
                        <TableCell align="right">{money(s.grossSales)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Descuentos</TableCell>
                        <TableCell align="right">-{money(s.discounts)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Impuestos</TableCell>
                        <TableCell align="right">{money(s.tax)}</TableCell>
                      </TableRow>
                      <TableRow sx={{ '& td': { fontWeight: 700 } }}>
                        <TableCell>Ventas netas</TableCell>
                        <TableCell align="right">{money(s.netSales)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Devoluciones</TableCell>
                        <TableCell align="right">-{money(s.refunds)}</TableCell>
                      </TableRow>
                      <TableRow sx={{ '& td': { fontWeight: 700 } }}>
                        <TableCell>Neto después de devoluciones</TableCell>
                        <TableCell align="right">{money(s.netAfterReturns)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Ventas canceladas ({s.voidedCount})</TableCell>
                        <TableCell align="right">{money(s.voidedTotal)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader title="Formas de pago" />
                <CardContent sx={{ pt: 0 }}>
                  <ShareTable rows={report.byPaymentMethod} countLabel="Pagos" />
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader title="Por cajero" />
                <CardContent sx={{ pt: 0 }}>
                  <ShareTable rows={report.byCashier} countLabel="Ventas" />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardHeader title="Cortes de caja" />
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Caja</TableCell>
                    <TableCell>Abrió / Cerró</TableCell>
                    <TableCell align="right">Fondo</TableCell>
                    <TableCell align="right">Ventas efectivo</TableCell>
                    <TableCell align="right">Ingresos</TableCell>
                    <TableCell align="right">Retiros</TableCell>
                    <TableCell align="right">Reembolsos</TableCell>
                    <TableCell align="right">Esperado</TableCell>
                    <TableCell align="right">Contado</TableCell>
                    <TableCell align="right">Diferencia</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.cashSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} sx={{ color: 'text.secondary' }}>
                        No se abrieron cajas este día.
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.cashSessions.map((c) => (
                      <React.Fragment key={c.id}>
                        <TableRow>
                          <TableCell>
                            <Typography variant="body2">{c.cashRegisterName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {c.storeName}
                            </Typography>
                            {c.status === 'Open' ? <Chip label="Abierta" size="small" color="warning" sx={{ ml: 1 }} /> : null}
                          </TableCell>
                          <TableCell>
                            {c.openedBy ?? '—'} {time(c.openedAt)}
                            <br />
                            {c.closedAt ? `${c.closedBy ?? '—'} ${time(c.closedAt)}` : '—'}
                          </TableCell>
                          <TableCell align="right">{money(c.summary.openingAmount)}</TableCell>
                          <TableCell align="right">{money(c.summary.cashSales)}</TableCell>
                          <TableCell align="right">{money(c.summary.totalIncomes)}</TableCell>
                          <TableCell align="right">-{money(c.summary.totalWithdrawals)}</TableCell>
                          <TableCell align="right">-{money(c.summary.cashRefunds)}</TableCell>
                          <TableCell align="right">{money(c.summary.expectedCash)}</TableCell>
                          <TableCell align="right">{money(c.countedCash)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {c.difference == null ? '—' : `${c.difference > 0 ? '+' : ''}${money(c.difference)}`}
                          </TableCell>
                        </TableRow>
                        {c.movements.map((m, i) => (
                          <TableRow key={`${c.id}-${i}`} sx={{ '& td': { color: 'text.secondary', borderBottom: 0 } }}>
                            <TableCell />
                            <TableCell colSpan={8}>
                              {time(m.createdAt)} · {m.type === 'Withdrawal' ? 'Retiro' : 'Ingreso'}: {m.reason}
                              {m.employeeName ? ` · registró ${m.employeeName}` : ''}
                              {m.approvedByName ? ` · autorizó ${m.approvedByName}` : ''}
                            </TableCell>
                            <TableCell align="right">
                              {m.type === 'Withdrawal' ? '-' : '+'}
                              {money(m.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          </Card>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader title="Ventas por hora" />
                <CardContent sx={{ pt: 0 }}>
                  {report.byHour.length > 0 ? (
                    <Chart type="bar" height={260} options={hourOptions} series={[{ name: 'Ventas', data: report.byHour.map((h) => h.amount) }]} />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Sin ventas.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader title="Por departamento" />
                <CardContent sx={{ pt: 0 }}>
                  <ShareTable rows={report.byDepartment} countLabel="Artículos" />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            {[
              { title: 'Más vendidos (unidades)', rows: report.topProductsByUnits },
              { title: 'Más vendidos (monto)', rows: report.topProductsByAmount },
            ].map((block) => (
              <Grid key={block.title} size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader title={block.title} />
                  <CardContent sx={{ pt: 0 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Producto</TableCell>
                          <TableCell align="right">Unidades</TableCell>
                          <TableCell align="right">Monto</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {block.rows.map((p) => (
                          <TableRow key={p.productVariantId}>
                            <TableCell>
                              <Typography variant="body2">{p.description}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {p.sku}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{p.units}</TableCell>
                            <TableCell align="right">{money(p.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader title="Devoluciones y cancelaciones" />
                <CardContent sx={{ pt: 0 }}>
                  <Table size="small">
                    <TableBody>
                      {report.returns.map((r) => (
                        <TableRow key={`r-${r.id}`}>
                          <TableCell>Devolución · {r.saleFolio ?? `#${r.saleId}`}</TableCell>
                          <TableCell>
                            {time(r.date)} · {r.employeeName ?? '—'}
                            {r.reason ? ` · ${r.reason}` : ''}
                          </TableCell>
                          <TableCell align="right">-{money(r.amount)}</TableCell>
                        </TableRow>
                      ))}
                      {report.voids.map((v) => (
                        <TableRow key={`v-${v.saleId}`}>
                          <TableCell>Cancelación · {v.folio ?? `#${v.saleId}`}</TableCell>
                          <TableCell>
                            {time(v.voidedAt)} · {v.cashierName ?? '—'}
                            {v.approvedByName ? ` · autorizó ${v.approvedByName}` : ''}
                            {v.reason ? ` · ${v.reason}` : ''}
                          </TableCell>
                          <TableCell align="right">{money(v.total)}</TableCell>
                        </TableRow>
                      ))}
                      {report.returns.length === 0 && report.voids.length === 0 ? (
                        <TableRow>
                          <TableCell sx={{ color: 'text.secondary' }}>Sin devoluciones ni cancelaciones.</TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader title="Movimientos de inventario" />
                <CardContent sx={{ pt: 0 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tipo</TableCell>
                        <TableCell align="right">Movimientos</TableCell>
                        <TableCell align="right">Unidades</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.inventory.map((r) => (
                        <TableRow key={r.type}>
                          <TableCell>{inventoryTypeLabels[r.type] ?? r.type}</TableCell>
                          <TableCell align="right">{r.movements}</TableCell>
                          <TableCell align="right">
                            {r.units > 0 ? '+' : ''}
                            {r.units}
                          </TableCell>
                        </TableRow>
                      ))}
                      {report.inventory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} sx={{ color: 'text.secondary' }}>
                            Sin movimientos.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      ) : null}
    </Stack>
  );
}
