'use client';

import * as React from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  Stack,
  TextField,
  Button,
  Autocomplete,
  Tooltip,
  InputAdornment,
  Chip,
  IconButton,
  Divider,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Clipboard as ClipboardIcon } from '@phosphor-icons/react/dist/ssr/Clipboard';
import { 
  ChatCircleText as ChatCircleTextIcon, 
  Pulse as ActivityIcon, 
  ListChecks as ListChecksIcon, 
  Stethoscope as StethoscopeIcon, 
  FirstAidKit as FirstAidKitIcon, 
  TrendUp as TrendUpIcon, 
  UsersThree as UsersThreeIcon, 
  Eye as EyeIcon 
} from '@phosphor-icons/react/dist/ssr';
import apiClient from '@/lib/api-client';
import { NewConsultationDialog } from '@/app/dashboard/patients/new-consultation-dialog';
import type { Consultation } from '@/app/dashboard/patients/consultations-list-view';
import { AssessmentPopover, type Assessment } from './assessment-popover';
import { PrescriptionPopover, type Prescription } from './prescription-popover';

interface ServiceRecord {
  id: number;
  name: string;
  color?: string;
  technologies: { id: number; name: string; }[];
}

interface ConsultationItem {
  id: number;
  patientId: number;
  patientName: string;
  userId: number;
  staffName: string;
  contactId: number | null;
  referredBy: string;
  date: string;
  reasonForConsultation: string;
  diagnostic: string;
  treatmentText?: string;
  evolutionNotes?: string;
  observations?: string;
  interconsultation?: string;
  reference?: string;
  assessments: Assessment[];
  prescriptions: Prescription[];
  indications?: Array<{
    id: number;
    tx0ServiceIds?: string;
    txServiceIds?: string;
    periodicity?: string;
    nextAssessmentAfterSessions?: number;
    discharge?: boolean;
    observations?: string;
  }>;
  rehabilitationPrograms?: Array<{
    id: number;
    name: string;
    services: Array<{ id: number; name: string; color: string }>;
  }>;
}

interface User {
  id: number;
  fullName: string;
}

export function ConsultationsTable(): React.JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [items, setItems] = React.useState<ConsultationItem[]>([]);
  const [totalItems, setTotalItems] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  
  // Pagination
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Filters
  const [consultationIdFilter, setConsultationIdFilter] = React.useState('');
  const [patientIdFilter, setPatientIdFilter] = React.useState('');
  const [patientNameFilter, setPatientNameFilter] = React.useState('');
  const [reasonFilter, setReasonFilter] = React.useState('');
  const [staffFilter, setStaffFilter] = React.useState<User | null>(null);
  const [referredByFilter, setReferredByFilter] = React.useState('');
  const [startDate, setStartDate] = React.useState<Dayjs | null>(null);
  const [endDate, setEndDate] = React.useState<Dayjs | null>(null);

  // Data
  const [staffMembers, setStaffMembers] = React.useState<User[]>([]);

  // Popover state for Assessments
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [selectedAssessment, setSelectedAssessment] = React.useState<Assessment | null>(null);

  // Popover state for Prescriptions (Treatments)
  const [prescriptionAnchorEl, setPrescriptionAnchorEl] = React.useState<HTMLElement | null>(null);
  const [selectedPrescription, setSelectedPrescription] = React.useState<Prescription | null>(null);

  // Dialog state
  const [openDialog, setOpenDialog] = React.useState(false);
  const [selectedFullConsultation, setSelectedFullConsultation] = React.useState<Consultation | null>(null);

  const [allServices, setAllServices] = React.useState<ServiceRecord[]>([]);

  const fetchServices = React.useCallback(async () => {
    try {
      const res = await apiClient.get<ServiceRecord[]>('/Services');
      setAllServices(res.data);
    } catch (err) {
      console.error('Failed to fetch services', err);
    }
  }, []);

  const renderTechnologiesChips = React.useCallback((consultation: ConsultationItem) => {
    if (!consultation.indications || consultation.indications.length === 0) return '—';
    const techMap = new Map<string, string>(); // techName -> color
    consultation.indications.forEach(ind => {
      const serviceIds = [
        ...(ind.tx0ServiceIds ? ind.tx0ServiceIds.split(',') : []),
        ...(ind.txServiceIds ? ind.txServiceIds.split(',') : [])
      ].map(idStr => parseInt(idStr.trim(), 10)).filter(id => !isNaN(id));

      serviceIds.forEach(srvId => {
        const srv = allServices.find(s => s.id === srvId);
        if (srv && srv.technologies) {
          srv.technologies.forEach(tech => {
            if (tech.name && !techMap.has(tech.name)) {
              techMap.set(tech.name, srv.color || '#1976d2');
            }
          });
        }
      });
    });

    if (techMap.size === 0) return '—';

    return (
      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ maxWidth: '200px', gap: 0.5 }}>
        {Array.from(techMap.entries()).map(([techName, color], idx) => (
          <Chip
            key={idx}
            label={techName}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.6rem',
              bgcolor: color,
              color: '#fff',
              fontWeight: 'bold'
            }}
          />
        ))}
      </Stack>
    );
  }, [allServices]);

  const fetchStaff = React.useCallback(async () => {
    try {
      const res = await apiClient.get<User[]>('/Users');
      setStaffMembers(res.data);
    } catch (err) {
      console.error('Failed to fetch staff members', err);
    }
  }, []);

  React.useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const fetchConsultations = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        pageSize: rowsPerPage.toString(),
      });

      if (consultationIdFilter) params.append('consultationId', consultationIdFilter);
      if (patientIdFilter) params.append('patientId', patientIdFilter);
      if (patientNameFilter) params.append('patientName', patientNameFilter);
      if (reasonFilter) params.append('reason', reasonFilter);
      if (staffFilter) params.append('staffId', staffFilter.id.toString());
      if (referredByFilter) params.append('referredBy', referredByFilter);
      if (startDate) params.append('startDate', startDate.startOf('day').toISOString());
      if (endDate) params.append('endDate', endDate.endOf('day').toISOString());

      const res = await apiClient.get<{ totalItems: number; items: ConsultationItem[] }>(`/MedicalRecords/consultations?${params.toString()}`);
      setItems(res.data.items);
      setTotalItems(res.data.totalItems);
    } catch (err) {
      console.error('Failed to fetch consultations', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, consultationIdFilter, patientIdFilter, patientNameFilter, reasonFilter, staffFilter, referredByFilter, startDate, endDate]);

  React.useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  React.useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const handlePageChange = (event: any, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAssessmentClick = (event: React.MouseEvent<HTMLElement>, assessment: Assessment) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedAssessment(assessment);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setSelectedAssessment(null);
  };

  const handlePrescriptionClick = (event: React.MouseEvent<HTMLElement>, prescription: Prescription) => {
    event.stopPropagation();
    setPrescriptionAnchorEl(event.currentTarget);
    setSelectedPrescription(prescription);
  };

  const handlePrescriptionPopoverClose = () => {
    setPrescriptionAnchorEl(null);
    setSelectedPrescription(null);
  };

  const handleRowClick = async (consultationId: number) => {
    setLoading(true);
    try {
      const res = await apiClient.get<Consultation>(`/MedicalRecords/consultations/${consultationId}`);
      setSelectedFullConsultation(res.data);
      setOpenDialog(true);
    } catch (err) {
      console.error('Failed to fetch full consultation details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setConsultationIdFilter('');
    setPatientIdFilter('');
    setPatientNameFilter('');
    setReasonFilter('');
    setStaffFilter(null);
    setReferredByFilter('');
    setStartDate(null);
    setEndDate(null);
    setPage(0);
  };

  return (
    <Card sx={{ p: 2, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <Stack spacing={3}>
        {/* Filters Section */}
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            <TextField
              label="Consultation ID"
              size="small"
              value={consultationIdFilter}
              onChange={(e) => { setConsultationIdFilter(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MagnifyingGlassIcon size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Patient ID"
              size="small"
              value={patientIdFilter}
              onChange={(e) => { setPatientIdFilter(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MagnifyingGlassIcon size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Patient Name"
              size="small"
              value={patientNameFilter}
              onChange={(e) => { setPatientNameFilter(e.target.value); setPage(0); }}
            />
            <TextField
              label="Referred By"
              size="small"
              value={referredByFilter}
              onChange={(e) => { setReferredByFilter(e.target.value); setPage(0); }}
            />
            <TextField
              label="Reason/Diagnostic"
              size="small"
              value={reasonFilter}
              onChange={(e) => { setReasonFilter(e.target.value); setPage(0); }}
            />
            <Autocomplete
              size="small"
              options={staffMembers}
              getOptionLabel={(option) => option.fullName}
              getOptionKey={(option) => option.id}
              value={staffFilter}
              onChange={(event, newValue) => { setStaffFilter(newValue); setPage(0); }}
              renderInput={(params) => <TextField {...params} label="Staff in Charge" />}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props as any;
                return (
                  <li key={option.id} {...optionProps}>
                    {option.fullName}
                  </li>
                );
              }}
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="From"
                value={startDate}
                onChange={(date) => { setStartDate(date); setPage(0); }}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <DatePicker
                label="To"
                value={endDate}
                onChange={(date) => { setEndDate(date); setPage(0); }}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </LocalizationProvider>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              size="small" 
              startIcon={<XIcon />} 
              onClick={handleClearFilters}
              disabled={!consultationIdFilter && !patientIdFilter && !patientNameFilter && !reasonFilter && !staffFilter && !referredByFilter && !startDate && !endDate}
            >
              Clear Filters
            </Button>
          </Box>
        </Stack>

        {/* Table/Card Section */}
        {isMobile ? (
          <Box>
            {loading && items.length === 0 ? (
              <Typography align="center" sx={{ py: 4, color: 'text.secondary' }}>Loading consultations...</Typography>
            ) : items.length === 0 ? (
              <Typography align="center" sx={{ py: 4, color: 'text.secondary' }}>No consultations found</Typography>
            ) : (
              <Stack spacing={2} divider={<Divider />}>
                {items.map((consultation) => (
                  <Box 
                    key={consultation.id} 
                    onClick={() => handleRowClick(consultation.id)}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, p: 1 }}
                  >
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {consultation.patientName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID #{consultation.patientId} · {dayjs(consultation.date).format('DD/MM/YYYY HH:mm')}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          {consultation.prescriptions?.map((p) => (
                            <IconButton
                              key={p.id}
                              color="primary"
                              size="small"
                              onClick={(e) => handlePrescriptionClick(e, p)}
                              sx={{ p: 0.5 }}
                            >
                              <ClipboardIcon weight="fill" size={18} />
                            </IconButton>
                          ))}
                        </Stack>
                      </Stack>

                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Rehab Program</Typography>
                        <Typography variant="body2">{consultation.rehabilitationPrograms?.[0]?.name || 'None'}</Typography>
                      </Box>

                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                        {consultation.rehabilitationPrograms?.[0]?.services?.map(s => (
                          <Chip 
                            key={s.id} 
                            label={s.name} 
                            size="small" 
                            onClick={(e) => { e.stopPropagation(); handleRowClick(consultation.id); }}
                            sx={{ 
                              height: 16, 
                              fontSize: '0.6rem',
                              bgcolor: s.color,
                              color: '#fff',
                              fontWeight: 'bold'
                            }} 
                          />
                        ))}
                      </Stack>

                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Reason</Typography>
                        <Typography variant="body2" noWrap>{consultation.reasonForConsultation}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Table sx={{ minWidth: '1200px' }}>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Patient</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Reason for consultation</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Assessment</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Indications</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Diagnostic</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Treatment</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Evolution notes</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Interconsultation</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Prescriptions</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Observations</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reference</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>TX</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>In Charge</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">Loading consultations...</Typography>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">No consultations found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((consultation) => (
                    <TableRow 
                      key={consultation.id} 
                      hover 
                      onClick={() => handleRowClick(consultation.id)}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        cursor: 'pointer'
                      }}
                    >
                      <TableCell>{consultation.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{consultation.patientName}</Typography>
                      </TableCell>
                      <TableCell>{dayjs(consultation.date).format('DD/MM/YYYY HH:mm')}</TableCell>
                      <TableCell align="center">
                        {consultation.reasonForConsultation ? (
                          <Tooltip title={`Reason: ${consultation.reasonForConsultation}`}>
                            <ChatCircleTextIcon size={20} style={{ color: '#0284c7' }} />
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      <TableCell align="center">
                        {consultation.assessments && consultation.assessments.length > 0 ? (
                          <Tooltip title="Has assessments">
                            <ActivityIcon size={20} style={{ color: '#10b981' }} />
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      <TableCell align="center">
                        {consultation.indications && consultation.indications.length > 0 ? (
                          <Tooltip title="Has indications">
                            <ListChecksIcon size={20} style={{ color: '#f59e0b' }} />
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      <TableCell align="center">
                        {consultation.diagnostic ? (
                          <Tooltip title={`Diagnostic: ${consultation.diagnostic}`}>
                            <StethoscopeIcon size={20} style={{ color: '#ef4444' }} />
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      <TableCell align="center">
                        {consultation.treatmentText ? (
                          <Tooltip title={`Treatment: ${consultation.treatmentText}`}>
                            <FirstAidKitIcon size={20} style={{ color: '#ec4899' }} />
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      <TableCell align="center">
                        {consultation.evolutionNotes ? (
                          <Tooltip title={`Evolution Notes: ${consultation.evolutionNotes}`}>
                            <TrendUpIcon size={20} style={{ color: '#8b5cf6' }} />
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      <TableCell align="center">
                        {consultation.interconsultation ? (
                          <Tooltip title={`Interconsultation: ${consultation.interconsultation}`}>
                            <UsersThreeIcon size={20} style={{ color: '#3b82f6' }} />
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      <TableCell align="center">{consultation.prescriptions?.length || 0}</TableCell>
                      <TableCell align="center">
                        {consultation.observations ? (
                          <Tooltip title={`Observations: ${consultation.observations}`}>
                            <EyeIcon size={20} style={{ color: '#f97316' }} />
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      <TableCell>{consultation.reference || '—'}</TableCell>
                      <TableCell>{renderTechnologiesChips(consultation)}</TableCell>
                      <TableCell>{consultation.staffName}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        )}

        <TablePagination
          component="div"
          count={totalItems}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Stack>

      <AssessmentPopover
        assessment={selectedAssessment}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
      />

      <PrescriptionPopover
        prescription={selectedPrescription}
        anchorEl={prescriptionAnchorEl}
        onClose={handlePrescriptionPopoverClose}
      />

      <NewConsultationDialog
        open={openDialog}
        patientId={selectedFullConsultation?.patientId || 0}
        mode="view"
        consultation={selectedFullConsultation}
        onClose={() => setOpenDialog(false)}
        onSuccess={() => {
          setOpenDialog(false);
          fetchConsultations();
        }}
      />
    </Card>
  );
}
