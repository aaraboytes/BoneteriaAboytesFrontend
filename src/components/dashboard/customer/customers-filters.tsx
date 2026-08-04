'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { CaretLeft as CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import dayjs from 'dayjs';

import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import OutlinedInputMui from '@mui/material/OutlinedInput';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';

export interface CustomersFiltersProps {
  onSearch?: (term: string) => void;
  searchTerm?: string;
  onDateChange?: (date: string) => void;
  selectedDate?: string;
  appointments?: Record<string, unknown>[];
  // NEW FILTERS
  availableServices?: Array<{id: number, name: string, color?: string}>;
  selectedServiceIds?: number[];
  onServiceIdsChange?: (ids: number[]) => void;
  showOnlyEvaluations?: boolean;
  onShowOnlyEvaluationsChange?: (checked: boolean) => void;
  selectedTurn?: 'all' | 'morning' | 'afternoon';
  onTurnChange?: (turn: 'all' | 'morning' | 'afternoon') => void;
}

function CustomDay(props: PickersDayProps & { appointments?: Record<string, unknown>[], day: dayjs.Dayjs }) {
  const { appointments, day, outsideCurrentMonth, ...other } = props;

  const apptsThisDay = appointments?.filter((app: Record<string, unknown>) => {
    if (!app.appointmentDate) return false;
    return dayjs(app.appointmentDate as string).format('YYYY-MM-DD') === day.format('YYYY-MM-DD');
  }) || [];

  const count = apptsThisDay.length;

  return (
    <Badge
      key={day.toString()}
      overlap="circular"
      badgeContent={count > 0 ? count : undefined}
      color="primary"
      sx={{
        '& .MuiBadge-badge': {
          right: 4,
          top: 4,
          fontSize: '0.6rem',
          minWidth: '16px',
          height: '16px',
          padding: '0 4px',
        }
      }}
    >
      <PickersDay {...other} day={day} outsideCurrentMonth={outsideCurrentMonth} />
    </Badge>
  );
}

function RealTimeClock() {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
      {dayjs(time).format('hh:mm:ss A')}
    </Typography>
  );
}

export function CustomersFilters({ 
  onSearch, 
  searchTerm, 
  onDateChange, 
  selectedDate, 
  availableServices = [],
  selectedServiceIds = [],
  onServiceIdsChange,
  appointments = [],
  showOnlyEvaluations = false,
  onShowOnlyEvaluationsChange,
  selectedTurn = 'all',
  onTurnChange
}: CustomersFiltersProps): React.JSX.Element {
  const handlePrevDay = () => {
    if (selectedDate && onDateChange) {
      let baseDate = dayjs(selectedDate);
      if (!baseDate.isValid()) {
        baseDate = dayjs();
      }
      onDateChange(baseDate.subtract(1, 'day').format('YYYY-MM-DD'));
    }
  };

  const handleNextDay = () => {
    if (selectedDate && onDateChange) {
      let baseDate = dayjs(selectedDate);
      if (!baseDate.isValid()) {
        baseDate = dayjs();
      }
      onDateChange(baseDate.add(1, 'day').format('YYYY-MM-DD'));
    }
  };

  return (
    <Card sx={{ p: 1.5 }}>
      <Stack 
        direction={{ xs: 'column', md: 'row' }} 
        spacing={1.5} 
        sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
      >
        <OutlinedInput
          size="small"
          value={searchTerm ?? ''}
          onChange={(e) => onSearch?.(e.target.value)}
          fullWidth
          placeholder="Search patient"
          startAdornment={
            <InputAdornment position="start">
              <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
            </InputAdornment>
          }
          sx={{ maxWidth: { xs: 'none', md: '500px' } }}
        />
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel id="service-filter-label" size="small">Filter by Service</InputLabel>
          <Select
            labelId="service-filter-label"
            multiple
            size="small"
            value={[
              ...(showOnlyEvaluations ? ['eval'] : []),
              ...(selectedServiceIds ?? [])
            ]}
            input={<OutlinedInputMui label="Filter by Service" size="small" />}
            onChange={(e) => {
              const val = e.target.value as Array<number | string>;
              const hasEval = val.includes('eval');
              const serviceIds = val.filter(v => typeof v === 'number') as number[];
              onShowOnlyEvaluationsChange?.(hasEval);
              onServiceIdsChange?.(serviceIds);
            }}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as Array<number | string>).map((value) => {
                  if (value === 'eval') return null;
                  const service = availableServices?.find(t => t.id === value);
                  const name = service?.name || value;
                  const color = service?.color;
                  return <Chip key={value} label={String(name)} size="small" sx={{ bgcolor: color, color: color ? '#fff' : undefined }} />;
                })}
              </Box>
            )}
          >
            {(availableServices ?? []).map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 130 }}>
          <InputLabel id="turn-filter-label" size="small">Turn</InputLabel>
          <Select
            labelId="turn-filter-label"
            size="small"
            value={selectedTurn}
            input={<OutlinedInputMui label="Turn" size="small" />}
            onChange={(e) => onTurnChange?.(e.target.value as 'all' | 'morning' | 'afternoon')}
          >
            <MenuItem value="all">All Turns</MenuItem>
            <MenuItem value="morning">Morning (8am - 1:30pm)</MenuItem>
            <MenuItem value="afternoon">Afternoon (2:30pm - 9pm)</MenuItem>
          </Select>
        </FormControl>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' } }}>
          <IconButton onClick={handlePrevDay} disabled={!selectedDate}>
            <CaretLeftIcon />
          </IconButton>

          <Stack sx={{ alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', fontSize: '0.65rem', lineHeight: 1 }}>
              {selectedDate && dayjs(selectedDate).isValid() ? dayjs(selectedDate).format('dddd') : '-'}
            </Typography>
            <RealTimeClock />
            <Box sx={{ maxWidth: '160px', mt: 0.5 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  format="DD/MM/YYYY"
                  value={selectedDate && dayjs(selectedDate).isValid() ? dayjs(selectedDate) : null}
                  onChange={(newValue) => {
                    if (newValue && newValue.isValid() && onDateChange) {
                      onDateChange(newValue.format('YYYY-MM-DD'));
                    }
                  }}
                  slots={{
                    day: CustomDay
                  }}
                  slotProps={{
                    day: {
                      appointments
                    } as any,
                    textField: {
                      size: 'small',
                    }
                  }}
                />
              </LocalizationProvider>
            </Box>
          </Stack>

          <IconButton onClick={handleNextDay} disabled={!selectedDate}>
            <CaretRightIcon />
          </IconButton>
        </Stack>
      </Stack>
    </Card>
  );
}
