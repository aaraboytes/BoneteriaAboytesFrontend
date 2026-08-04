'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import { DownloadSimple, ArrowLeft, ListBullets } from '@phosphor-icons/react/dist/ssr';
import apiClient from '@/lib/api-client';

import { PosWorkspace } from './pos-workspace';
import { OpenSessionView } from './open-session-view';
import { CloseSessionDialog } from './close-session-dialog';
import { ManualTransactionDialog } from './manual-transaction-dialog';
import { DailyHistoryDialog } from './daily-history-dialog';
import { DebtorsQueue, Debtor } from '../billing/debtors-queue';

export interface LineItem {
  id: string;
  name: string;
  type: string;
  price: number;
  quantity: number;
}

export function SalesClient(): React.JSX.Element {
  const [activeSession, setActiveSession] = React.useState<any | undefined>(undefined);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = React.useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = React.useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = React.useState(false);

  const [selectedPatient, setSelectedPatient] = React.useState<any | null>(null);
  const [selectedDebtor, setSelectedDebtor] = React.useState<Debtor | null>(null);

  // Debtors Queue State
  const [debtors, setDebtors] = React.useState<Debtor[]>([]);
  const [loadingDebtors, setLoadingDebtors] = React.useState(true);

  // Footer Stats
  const [totalOrdersToday, setTotalOrdersToday] = React.useState(0);
  const [totalSalesToday, setTotalSalesToday] = React.useState(0);

  const fetchDebtors = React.useCallback(async () => {
    setLoadingDebtors(true);
    try {
      const res = await apiClient.get('/transactions/debtors');
      setDebtors(res.data || []);
    } catch (err) {
      console.error('Failed to fetch debtors', err);
    } finally {
      setLoadingDebtors(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDebtors();
  }, [fetchDebtors]);

  const checkActiveSession = React.useCallback(async () => {
    try {
      const res = await apiClient.get('/cash/sessions/active');
      setActiveSession(res.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setActiveSession(null);
      } else {
        console.error('Failed to check active session', error);
        setActiveSession(null);
      }
    }
  }, []);


  const fetchDailyStats = React.useCallback(async () => {
    try {
      const res = await apiClient.get('/cash/sessions/active/summary');
      setTotalOrdersToday(res.data.totalSalesCount || 0);
      setTotalSalesToday(res.data.totalBalance || 0);
    } catch (error) {
      console.error('Failed to fetch daily stats', error);
    }
  }, []);


  React.useEffect(() => {
    if (activeSession === undefined) {
      checkActiveSession();
    }
  }, [activeSession, checkActiveSession]);

  const hasPromptedCloseRef = React.useRef(false);

  React.useEffect(() => {
    if (activeSession) {
      fetchDailyStats();

      if (!hasPromptedCloseRef.current) {
        const today = new Date().toDateString();
        const sessionDate = new Date(activeSession.openingTime).toDateString();
        if (sessionDate !== today) {
          alert("The previous day's sales were not closed. Please register the closing before continuing.");
          setIsCloseDialogOpen(true);
        }
        hasPromptedCloseRef.current = true;
      }
    }
  }, [activeSession, fetchDailyStats]);


  if (activeSession === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 100px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (activeSession === null) {
    return <OpenSessionView onSessionOpened={checkActiveSession} />;
  }

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, height: { xs: 'auto', md: 'calc(100vh - 145px)' }, overflow: { xs: 'auto', md: 'hidden' } }}>
      {/* Top Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>Sales & Billing Desk</Typography>
      </Stack>

      <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>

        {/* Left Section: Debtors Queue */}
        <Grid size={{ xs: 12, md: 5, lg: 6 }} sx={{ height: { xs: 'auto', md: '100%' }, overflowY: 'auto' }}>
          <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2, height: '100%' }}>
            <DebtorsQueue
              debtors={debtors}
              loading={loadingDebtors}
              selectedDebtor={selectedDebtor}
              onSelectDebtor={setSelectedDebtor}
              onRefresh={fetchDebtors}
            />
          </Box>
        </Grid>

        {/* Right Section: Workspace */}
        <Grid size={{ xs: 12, md: 7, lg: 6 }} sx={{ height: { xs: 'auto', md: '100%' } }}>
          <PosWorkspace
            onOpenManualTransaction={() => setIsMovementDialogOpen(true)}
            onOpenCloseSession={() => setIsCloseDialogOpen(true)}
            onOpenTransactionsHistory={() => setIsHistoryDialogOpen(true)}
            selectedPatient={selectedPatient}
            setSelectedPatient={setSelectedPatient}
            selectedDebtor={selectedDebtor}
            onCheckoutSuccess={() => {
              setSelectedDebtor(null);
              fetchDebtors();
            }}
          />
        </Grid>

      </Grid>

      {/* Dialogs */}
      <CloseSessionDialog
        open={isCloseDialogOpen}
        onClose={() => setIsCloseDialogOpen(false)}
        onSessionClosed={() => {
          setIsCloseDialogOpen(false);
          setActiveSession(null);
        }}
      />

      <ManualTransactionDialog
        open={isMovementDialogOpen}
        onClose={() => setIsMovementDialogOpen(false)}
        onSuccess={() => setIsMovementDialogOpen(false)}
        initialPatient={selectedPatient}
      />

      <DailyHistoryDialog
        open={isHistoryDialogOpen}
        onClose={() => setIsHistoryDialogOpen(false)}
      />
    </Box>
  );
}
