'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Shuffle as ShuffleIcon } from '@phosphor-icons/react/dist/ssr/Shuffle';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import dayjs from 'dayjs';

import { useSelection } from '@/hooks/use-selection';

function Sentinel({ onVisible }: { onVisible: () => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const onVisibleRef = React.useRef(onVisible);
  
  React.useEffect(() => {
    onVisibleRef.current = onVisible;
  }, [onVisible]);

  React.useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onVisibleRef.current();
      }
    }, { rootMargin: '400px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} style={{ height: 1 }} />;
}

function stringToColor(string: string) {
  let hash = 0;
  let i;

  for (i = 0; i < string.length; i += 1) {
    hash = (string.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }

  const h = Math.abs(hash) % 360;
  const s = 65;
  const l = 45;
  const lPercent = l / 100;
  const a = (s * Math.min(lPercent, 1 - lPercent)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lPercent - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function getInitials(name: string): string {
  const words = name.trim().split(' ');
  if (words.length === 0 || words[0] === '') return 'N/A';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getComments(notes?: string): Array<{ text: string; color: string; time: string }> {
  if (!notes) return [];
  try {
    const parsed = JSON.parse(notes);
    if (Array.isArray(parsed)) return parsed;
    return [{ text: notes, color: '#546e7a', time: new Date().toISOString() }];
  } catch {
    return [{ text: notes, color: '#546e7a', time: new Date().toISOString() }];
  }
}

const statusMap: Record<string, { label: string; color: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'default'; hex?: string }> = {
  scheduled: { label: 'Scheduled', color: 'info' },
  waiting: { label: 'Waiting', color: 'warning' },
  in_progress: { label: 'In Progress', color: 'primary' },
  done: { label: 'Done', color: 'success' },
  canceled: { label: 'Canceled', color: 'error' },
  absent: { label: 'Absent', color: 'error' },
  ghost: { label: 'Rescheduled', color: 'default' },
  delayed: { label: 'Delayed', color: 'default', hex: '#4877c2' }
};

export interface AppointmentCustomer {
  id: string;
  date: string;
  hour: string;
  occurrence: number;
  patientId: string;
  patient: { name: string; avatar: string };
  service: string;
  serviceColor?: string;
  serviceId?: number | null;
  gym: string;
  staff: string;
  status: string;
  serviceWork?: {
    id: number;
    notes?: string;
    serviceWorkItems?: {
      id: number;
      serviceId: number;
      attendantId?: number | null;
      attendant?: { id: number; fullName: string };
    }[];
  };
  recurrenceLabel?: string;
  isRehab?: boolean;
  isGhost?: boolean;
  rescheduledTo?: string;
  services?: { id: number; name: string; color?: string }[];
  phone?: string;
}

interface CustomersTableProps {
  count?: number;
  page?: number;
  rows?: AppointmentCustomer[];
  rowsPerPage?: number;
  onStatusChange?: (id: string, newStatus: string) => void;
  onEdit?: (id: string) => void;
  onReschedule?: (id: string) => void;
  onTransformInterconsultation?: (id: string) => void;
  onViewNotes?: (notes: string) => void;
  onEditInterconsultationNotes?: (appointmentId: string, notes: string, patientId: string) => void;
  onPatientClick?: (patientId: string) => void;
  isSearching?: boolean;
  onLoadMore?: () => void;
}

export function CustomersTable({
  count = 0,
  rows = [],
  page = 0,
  rowsPerPage = 0,
  onStatusChange,
  onEdit,
  onReschedule,
  onTransformInterconsultation,
  onViewNotes,
  onEditInterconsultationNotes,
  onPatientClick,
  isSearching = false,
  onLoadMore,
}: CustomersTableProps): React.JSX.Element {
  const rowIds = React.useMemo(() => {
    return rows.map((customer) => customer.id);
  }, [rows]);

  const { selectAll, deselectAll, selectOne, deselectOne, selected } = useSelection(rowIds);
  const [now, setNow] = React.useState(dayjs());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(timer);
  }, []);

  const selectedSome = (selected?.size ?? 0) > 0 && (selected?.size ?? 0) < rows.length;
  const selectedAll = rows.length > 0 && selected?.size === rows.length;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const get30MinSlot = (hourStr: string) => {
    const [h, m] = hourStr.split(':').map(Number);
    return h * 60 + (Math.floor(m / 30) * 30);
  };

  return (
    <Card>
      {isMobile ? (
        <Box sx={{ p: 2 }}>
          <Stack spacing={2}>
            {rows.map((row, index) => {
              const currentSlot = get30MinSlot(row.hour);
              const prevSlot = index > 0 ? get30MinSlot(rows[index - 1].hour) : currentSlot;
              const isNewSlot = index > 0 && currentSlot !== prevSlot;

              let displayStatus = String(row.status || '').toLowerCase();
              if (displayStatus === 'scheduled' && now.isAfter(dayjs(row.date).add(15, 'minute'))) {
                displayStatus = 'delayed';
              }

              return (
                <Card
                  key={row.id}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 'none',
                    position: 'relative',
                    ...(isNewSlot ? { borderTop: '4px solid #848484ff !important' } : {}),
                    ...(row.isGhost ? { bgcolor: 'action.hover', opacity: 0.6 } : {}),
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '6px',
                      background: (() => {
                        const colors = row.services?.map(s => s.color).filter(Boolean) || [];
                        if (colors.length === 0) return '#ccc';
                        if (colors.length === 1) return colors[0];
                        return `linear-gradient(180deg, ${colors.join(', ')})`;
                      })(),
                      zIndex: 1
                    }
                  }}
                >
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          sx={{
                            bgcolor: stringToColor(row.patient.name),
                            width: 40,
                            height: 40,
                            fontSize: '0.875rem'
                          }}
                        >
                          {getInitials(row.patient.name)}
                        </Avatar>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              cursor: (onPatientClick && !row.isGhost) ? 'pointer' : 'default',
                              '&:hover': {
                                textDecoration: (onPatientClick && !row.isGhost) ? 'underline' : 'none',
                                color: (onPatientClick && !row.isGhost) ? 'primary.main' : 'inherit'
                              }
                            }}
                            onClick={() => !row.isGhost && onPatientClick?.(row.patientId)}
                          >
                            {row.patient.name}
                          </Typography>
                          {row.isGhost && row.rescheduledTo ? (
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block' }}>
                              Moved to {new Date(row.rescheduledTo).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {isSearching && <Chip label={dayjs(row.date).format('MMM DD (ddd)')} size="small" sx={{ mr: 1, height: '20px', fontSize: '0.7rem' }} />}
                              {row.hour} {row.occurrence > 0 ? `(#${row.occurrence})` : ''}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.5}>
                        {onReschedule && !row.isGhost && (
                          <IconButton size="small" onClick={() => onReschedule(row.id)}>
                            <ClockIcon size={16} />
                          </IconButton>
                        )}
                        {(() => {
                          const isInterconsultation = row.services?.some(s => s.name?.toLowerCase() === 'interconsulta');
                          return (
                            <>
                              {onTransformInterconsultation && !row.isGhost && !isInterconsultation && (
                                <IconButton size="small" onClick={() => onTransformInterconsultation(row.id)} title="Transform into interconsultation">
                                  <ShuffleIcon size={16} />
                                </IconButton>
                              )}
                              {onEditInterconsultationNotes && !row.isGhost && isInterconsultation && (
                                <IconButton size="small" sx={{ color: row.services?.find(s => s.name?.toLowerCase() === 'interconsulta')?.color }} onClick={() => onEditInterconsultationNotes(row.id, row.serviceWork?.notes || '', row.patientId)} title="See interconsultation notes">
                                  <FileTextIcon size={16} />
                                </IconButton>
                              )}
                            </>
                          );
                        })()}
                        {onEdit && !row.isGhost && (
                          <IconButton size="small" onClick={() => onEdit?.(row.id)}>
                            <PencilSimpleIcon size={16} />
                          </IconButton>
                        )}
                      </Stack>
                    </Stack>

                    <Divider />

                    <Stack spacing={1}>
                      {row.recurrenceLabel && (
                        <Chip size="small" label={row.recurrenceLabel} color="primary" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
                      )}
                      {row.isRehab && (
                        <Chip size="small" label="Rehabilitation" color="secondary" variant="filled" sx={{ alignSelf: 'flex-start' }} />
                      )}
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {row.services && row.services.length > 0 ? (
                          row.services.map((s) => {
                            const swItem = row.serviceWork?.serviceWorkItems?.find(item => item.serviceId === s.id);
                            const staffName = swItem?.attendant?.fullName || '';
                            return (
                              <Stack key={s.id} spacing={0.5}>
                                <Chip
                                  label={s.name}
                                  size="small"
                                  sx={{
                                    bgcolor: s.color || 'default',
                                    color: s.color ? '#fff' : 'inherit',
                                    fontWeight: 500,
                                    alignSelf: 'flex-start'
                                  }}
                                />
                                {staffName && (
                                  <Typography variant="caption" color="text.secondary" sx={{ pl: 1, display: 'block' }}>
                                    {staffName}
                                  </Typography>
                                )}
                              </Stack>
                            );
                          })
                        ) : row.service ? (
                          <Chip
                            label={row.service}
                            size="small"
                            sx={{
                              bgcolor: row.serviceColor || 'default',
                              color: row.serviceColor ? '#fff' : 'inherit',
                              fontWeight: 500,
                            }}
                          />
                        ) : null}
                      </Stack>
                      {getComments(row.serviceWork?.notes).length > 0 && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: '8px', border: '1px dashed', borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                            NOTES
                          </Typography>
                          <Stack spacing={0.75}>
                            {getComments(row.serviceWork?.notes).map((c, i) => (
                              <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.color, mt: 0.7, flexShrink: 0 }} />
                                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                  {c.text}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {row.staff}
                      </Typography>
                      <Box>
                        {onStatusChange ? (
                          <Select
                            value={statusMap[displayStatus] ? displayStatus : 'scheduled'}
                            onChange={(e) => onStatusChange(row.id, e.target.value)}
                            size="small"
                            disabled={row.isGhost}
                            sx={{
                              boxShadow: 'none',
                              '.MuiOutlinedInput-notchedOutline': { border: 0 },
                              '& .MuiSelect-select': { padding: 0 }
                            }}
                            renderValue={(selected) => (
                              <Chip
                                sx={{
                                  bgcolor: statusMap[selected]?.hex || undefined,
                                  color: statusMap[selected]?.hex ? '#fff' : 'inherit',
                                  cursor: row.isGhost ? 'default' : 'pointer'
                                }}
                                color={statusMap[selected]?.hex ? undefined : (statusMap[selected]?.color ?? 'default')}
                                label={statusMap[selected]?.label ?? selected}
                                size="small"
                              />
                            )}
                          >
                            {Object.entries(statusMap).map(([key, value]) => (
                              <MenuItem key={key} value={key}>
                                <Box sx={{ pointerEvents: 'none' }}>
                                  <Chip
                                    sx={{
                                      bgcolor: value.hex || undefined,
                                      color: value.hex ? '#fff' : 'inherit'
                                    }}
                                    color={value.hex ? undefined : (value.color ?? 'default')}
                                    label={value.label}
                                    size="small"
                                    clickable={false}
                                  />
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        ) : (
                          <Chip
                            sx={{
                              bgcolor: statusMap[displayStatus]?.hex || undefined,
                              color: statusMap[displayStatus]?.hex ? '#fff' : 'inherit'
                            }}
                            color={statusMap[displayStatus]?.hex ? undefined : (statusMap[displayStatus]?.color ?? 'default')}
                            label={statusMap[displayStatus]?.label ?? displayStatus}
                            size="small"
                          />
                        )}
                        {displayStatus === 'delayed' && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#4877c2', fontWeight: 600, textAlign: 'right' }}>
                            {Math.max(0, now.diff(dayjs(row.date), 'minute'))}m delay
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: '800px' }}>
            <TableHead>
              <TableRow>
                {isSearching && <TableCell>Day</TableCell>}
                <TableCell>Hour</TableCell>
                <TableCell>#</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell colSpan={2}>Service & Staff Assignments</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => {
                const isSelected = selected?.has(row.id);

                const currentSlot = get30MinSlot(row.hour);
                const prevSlot = index > 0 ? get30MinSlot(rows[index - 1].hour) : currentSlot;
                const isNewSlot = index > 0 && currentSlot !== prevSlot;

                let displayStatus = String(row.status || '').toLowerCase();
                if (displayStatus === 'scheduled' && now.isAfter(dayjs(row.date).add(15, 'minute'))) {
                  displayStatus = 'delayed';
                }

                return (
                  <TableRow
                    hover={!row.isGhost}
                    key={row.id}
                    selected={row.isGhost ? false : isSelected}
                    sx={{
                      ...(isNewSlot ? { '& td': { borderTop: '3px solid #848484ff !important' } } : {}),
                      ...(row.isGhost ? { bgcolor: 'action.hover', opacity: 0.6 } : {})
                    }}
                  >
                    {isSearching && (
                      <TableCell>
                        <Stack spacing={0}>
                          <Typography variant="body2" fontWeight="bold">
                            {dayjs(row.date).format('MMM DD')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(row.date).format('dddd')}
                          </Typography>
                        </Stack>
                      </TableCell>
                    )}
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">{row.hour}</Typography>
                        {row.recurrenceLabel && (
                          <Chip size="small" label={row.recurrenceLabel} color="primary" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} />
                        )}
                        {row.isRehab && (
                          <Chip size="small" label="Rehabilitation" color="secondary" variant="filled" sx={{ fontSize: '0.65rem', height: '20px' }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{row.occurrence > 0 ? row.occurrence : '-'}</TableCell>
                    <TableCell>
                      <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
                        <Avatar
                          sx={{
                            bgcolor: stringToColor(row.patient.name),
                            fontSize: '0.875rem'
                          }}
                        >
                          {getInitials(row.patient.name)}
                        </Avatar>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              cursor: (onPatientClick && !row.isGhost) ? 'pointer' : 'default',
                              '&:hover': {
                                textDecoration: (onPatientClick && !row.isGhost) ? 'underline' : 'none',
                                color: (onPatientClick && !row.isGhost) ? 'primary.main' : 'inherit'
                              }
                            }}
                            onClick={() => !row.isGhost && onPatientClick?.(row.patientId)}
                          >
                            {row.patient.name}
                          </Typography>
                          {row.isGhost && row.rescheduledTo && (
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                              Moved to {new Date(row.rescheduledTo).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell colSpan={2}>
                      <Stack spacing={1}>
                        {row.services && row.services.length > 0 ? (
                          row.services.map((srv) => {
                            const swItem = row.serviceWork?.serviceWorkItems?.find(item => item.serviceId === srv.id);
                            const staffName = swItem?.attendant?.fullName || 'Not assigned';
                            return (
                              <Box key={srv.id} sx={{
                                display: 'flex',
                                alignItems: 'center',
                                bgcolor: srv.color || 'primary.main',
                                color: '#fff',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: '24px',
                                pl: 2,
                                pr: 3,
                                py: 0.5,
                                gap: 2,
                                width: 'fit-content',
                                minWidth: '280px',
                              }}>
                                <Typography variant="body2" sx={{ fontWeight: 800, minWidth: '100px', borderRight: '1px solid rgba(255,255,255,0.3)', pr: 2 }}>
                                  {srv.name}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {staffName}
                                </Typography>
                              </Box>
                            );
                          })
                        ) : (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={row.service || 'No Service'} size="small" sx={{ bgcolor: row.serviceColor }} />
                            <Typography variant="body2">{row.staff}</Typography>
                          </Stack>
                        )}
                        {getComments(row.serviceWork?.notes).length > 0 && (
                          <Box sx={{ mt: 1.5, p: 1, bgcolor: 'action.hover', borderRadius: '8px', border: '1px dashed', borderColor: 'divider', maxWidth: '400px' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                              NOTES
                            </Typography>
                            <Stack spacing={0.75}>
                              {getComments(row.serviceWork?.notes).map((c, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.color, mt: 0.7, flexShrink: 0 }} />
                                  <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {c.text}
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {onStatusChange ? (
                        <Select
                          value={statusMap[displayStatus] ? displayStatus : 'scheduled'}
                          onChange={(e) => onStatusChange(row.id, e.target.value)}
                          size="small"
                          disabled={row.isGhost}
                          sx={{
                            boxShadow: 'none',
                            '.MuiOutlinedInput-notchedOutline': { border: 0 },
                            '& .MuiSelect-select': { padding: 0 }
                          }}
                          renderValue={(selected) => (
                            <Chip
                              sx={{
                                bgcolor: statusMap[selected]?.hex || undefined,
                                color: statusMap[selected]?.hex ? '#fff' : 'inherit',
                                cursor: row.isGhost ? 'default' : 'pointer'
                              }}
                              color={statusMap[selected]?.hex ? undefined : (statusMap[selected]?.color ?? 'default')}
                              label={statusMap[selected]?.label ?? selected}
                              size="small"
                            />
                          )}
                        >
                          {Object.entries(statusMap).map(([key, value]) => (
                            <MenuItem key={key} value={key}>
                              <Box sx={{ pointerEvents: 'none' }}>
                                <Chip
                                  sx={{
                                    bgcolor: value.hex || undefined,
                                    color: value.hex ? '#fff' : 'inherit'
                                  }}
                                  color={value.hex ? undefined : (value.color ?? 'default')}
                                  label={value.label}
                                  size="small"
                                  clickable={false}
                                />
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      ) : (
                        <Chip
                          sx={{
                            bgcolor: statusMap[displayStatus]?.hex || undefined,
                            color: statusMap[displayStatus]?.hex ? '#fff' : 'inherit'
                          }}
                          color={statusMap[displayStatus]?.hex ? undefined : (statusMap[displayStatus]?.color ?? 'default')}
                          label={statusMap[displayStatus]?.label ?? displayStatus}
                          size="small"
                        />
                      )}
                      {displayStatus === 'delayed' && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#4877c2', fontWeight: 600 }}>
                          {Math.max(0, now.diff(dayjs(row.date), 'minute'))} min delay
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {onReschedule && !row.isGhost && (
                          <IconButton size="small" onClick={() => onReschedule(row.id)}>
                            <ClockIcon size={16} />
                          </IconButton>
                        )}
                        {(() => {
                          const isInterconsultation = row.services?.some(s => s.name?.toLowerCase() === 'interconsulta');
                          return (
                            <>
                              {onTransformInterconsultation && !row.isGhost && !isInterconsultation && (
                                <IconButton size="small" onClick={() => onTransformInterconsultation(row.id)} title="Transform into interconsultation">
                                  <ShuffleIcon size={16} />
                                </IconButton>
                              )}
                              {onEditInterconsultationNotes && !row.isGhost && isInterconsultation && (
                                <IconButton size="small" sx={{ color: row.services?.find(s => s.name?.toLowerCase() === 'interconsulta')?.color || '#ffb300' }} onClick={() => onEditInterconsultationNotes(row.id, row.serviceWork?.notes || '', row.patientId)} title="See interconsultation notes">
                                  <FileTextIcon size={16} />
                                </IconButton>
                              )}
                            </>
                          );
                        })()}
                        {onEdit && !row.isGhost && (
                          <IconButton size="small" onClick={() => onEdit(row.id)}>
                            <PencilSimpleIcon size={20} />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
      <Divider />
      {onLoadMore && rows.length < count && (
        <Sentinel onVisible={onLoadMore} />
      )}
    </Card>
  );
}
