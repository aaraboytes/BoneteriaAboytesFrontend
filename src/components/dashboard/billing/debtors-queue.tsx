'use client';

import * as React from 'react';
import { Box, Card, Stack, Typography, CircularProgress, Tabs, Tab, IconButton, OutlinedInput, InputAdornment, Chip } from '@mui/material';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { WarningCircle as WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { ArrowsClockwise as RefreshIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import apiClient from '@/lib/api-client';

export interface ChargeInfo {
  date: string;
  description: string;
  cost: number;
}

export interface Debtor {
  id: number;
  name: string;
  balance: number; // positive or negative
  lastChargeDate: string | null;
  recentCharges?: ChargeInfo[];
}

interface DebtorsQueueProps {
  debtors: Debtor[];
  loading: boolean;
  selectedDebtor: Debtor | null;
  onSelectDebtor: (debtor: Debtor) => void;
  onRefresh: () => void;
}

export function DebtorsQueue({
  debtors,
  loading,
  selectedDebtor,
  onSelectDebtor,
  onRefresh
}: DebtorsQueueProps): React.JSX.Element {
  const [tab, setTab] = React.useState(0);
  const [category, setCategory] = React.useState(0); // 0: Debtors (balance < 0), 1: Positive Balance (balance >= 0)
  const [searchQuery, setSearchQuery] = React.useState('');

  const [positiveDebtors, setPositiveDebtors] = React.useState<Debtor[]>([]);
  const [loadingPositive, setLoadingPositive] = React.useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchPositiveDebtors = async () => {
    setLoadingPositive(true);
    try {
      const res = await apiClient.get('/transactions/debtors?category=positive');
      setPositiveDebtors(res.data || []);
    } catch (err) {
      console.error('Failed to fetch positive balance patients', err);
    } finally {
      setLoadingPositive(false);
    }
  };

  React.useEffect(() => {
    if (category === 1 && positiveDebtors.length === 0) {
      fetchPositiveDebtors();
    }
  }, [category]);

  React.useEffect(() => {
    if (category === 1) {
      fetchPositiveDebtors();
    } else {
      setPositiveDebtors([]);
    }
  }, [debtors]);

  const getNetBalance = (d: Debtor) => {
    const chargesTotal = d.recentCharges && d.recentCharges.length > 0
      ? d.recentCharges.reduce((sum, c) => sum + c.cost, 0)
      : 0;
    return d.balance - chargesTotal;
  };

  const activeList = category === 0 ? debtors : positiveDebtors;

  const categoryList = activeList.filter(d => 
    category === 0 ? getNetBalance(d) < 0 : getNetBalance(d) >= 0
  );

  const todayList = categoryList.filter(d => d.lastChargeDate && d.lastChargeDate.startsWith(todayStr));
  const otherList = categoryList.filter(d => !(d.lastChargeDate && d.lastChargeDate.startsWith(todayStr)));

  const currentList = tab === 0 ? todayList : otherList;

  const filteredList = currentList.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefreshClick = () => {
    if (category === 0) {
      onRefresh();
    } else {
      fetchPositiveDebtors();
    }
  };

  // Helper counts
  const todayDebtorsCount = debtors.filter(d => getNetBalance(d) < 0 && d.lastChargeDate && d.lastChargeDate.startsWith(todayStr)).length;
  const todayPositiveCount = positiveDebtors.filter(d => getNetBalance(d) >= 0 && d.lastChargeDate && d.lastChargeDate.startsWith(todayStr)).length;
  
  const otherDebtorsCount = debtors.filter(d => getNetBalance(d) < 0 && !(d.lastChargeDate && d.lastChargeDate.startsWith(todayStr))).length;
  const otherPositiveCount = positiveDebtors.filter(d => getNetBalance(d) >= 0 && !(d.lastChargeDate && d.lastChargeDate.startsWith(todayStr))).length;

  const subTabDebtorsCount = tab === 0 ? todayDebtorsCount : otherDebtorsCount;
  const subTabPositiveCount = tab === 0 ? todayPositiveCount : otherPositiveCount;

  const isLoading = category === 0 ? loading : loadingPositive;

  return (
    <Box>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
            <Tab label={`Today (${todayDebtorsCount + todayPositiveCount})`} />
            <Tab label={`Others (${otherDebtorsCount + otherPositiveCount})`} />
          </Tabs>
          <IconButton onClick={handleRefreshClick} disabled={isLoading} color="primary">
            <RefreshIcon />
          </IconButton>
        </Stack>

        <Tabs 
          value={category} 
          onChange={(e, newValue) => setCategory(newValue)}
          variant="fullWidth"
          sx={{ 
            minHeight: 38, 
            height: 38,
            bgcolor: '#f1f5f9',
            borderRadius: '10px',
            p: 0.5,
            '& .MuiTabs-indicator': {
              height: '100%',
              borderRadius: '8px',
              bgcolor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              zIndex: 0
            },
            '& .MuiTab-root': {
              minHeight: 28,
              height: 28,
              py: 0,
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'none',
              zIndex: 1,
              color: '#64748b',
              '&.Mui-selected': {
                color: '#0f172a'
              }
            }
          }}
        >
          <Tab label={`Debtors (${subTabDebtorsCount})`} />
          <Tab label={`Positive Balance (${subTabPositiveCount})`} />
        </Tabs>
      </Stack>

      <OutlinedInput
        fullWidth
        placeholder="Search patient name..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="small"
        startAdornment={
          <InputAdornment position="start">
            <MagnifyingGlassIcon size={20} color="var(--mui-palette-text-secondary)" />
          </InputAdornment>
        }
        sx={{ mb: 3, bgcolor: '#ffffff', borderRadius: 2 }}
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          {filteredList.map((debtor) => (
            <Card
              key={debtor.id}
              onClick={() => onSelectDebtor(debtor)}
              sx={{
                p: 2,
                cursor: 'pointer',
                bgcolor: '#ffffff',
                borderLeft: '6px solid',
                borderColor: getNetBalance(debtor) < 0 
                  ? (Math.abs(getNetBalance(debtor)) > 1000 ? '#ef4444' : '#f97316') 
                  : (getNetBalance(debtor) > 0 ? '#10b981' : '#94a3b8'),
                borderRadius: 3,
                boxShadow: selectedDebtor?.id === debtor.id ? '0 0 0 2px var(--mui-palette-primary-main)' : '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateX(4px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                  <UsersIcon size={24} color="var(--mui-palette-text-secondary)" weight="light" />
                  <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                      {debtor.name}
                    </Typography>
                    {debtor.recentCharges && debtor.recentCharges.length > 0 && (
                      <Box sx={{ display: 'flex' }}>
                        <Chip
                          label="Pending Checkout"
                          size="small"
                          sx={{ 
                            fontSize: '0.65rem', 
                            height: 18, 
                            fontWeight: 700,
                            bgcolor: '#fef3c7',
                            color: '#d97706',
                            border: '1px solid #fde68a'
                          }}
                        />
                      </Box>
                    )}
                  </Stack>
                </Stack>
                <Stack direction={{ xs: 'row', sm: 'column' }} spacing={{ xs: 2, sm: 0.5 }} alignItems={{ xs: 'center', sm: 'flex-end' }} justifyContent="space-between" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {getNetBalance(debtor) < 0 ? 'Total Debt:' : 'Credit / Balance:'}
                    </Typography>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 700, 
                        color: getNetBalance(debtor) < 0 
                          ? (Math.abs(getNetBalance(debtor)) > 1000 ? '#ef4444' : '#f97316') 
                          : (getNetBalance(debtor) > 0 ? '#10b981' : 'text.secondary') 
                      }}
                    >
                      ${Math.abs(getNetBalance(debtor)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Stack>
                  {debtor.lastChargeDate && (
                    <Typography variant="caption" color="text.secondary">
                      Last Charge: {new Date(debtor.lastChargeDate).toLocaleString()}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Card>
          ))}
          {filteredList.length === 0 && (
            <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ py: 8 }}>
              <WarningCircleIcon size={48} color="var(--mui-palette-text-disabled)" />
              <Typography variant="subtitle1" color="text.secondary">
                {searchQuery ? 'No patients match your search.' : 'No patients found in this category.'}
              </Typography>
            </Stack>
          )}
        </Stack>
      )}
    </Box>
  );
}
