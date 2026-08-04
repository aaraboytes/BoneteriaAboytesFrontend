import sys

filepath = r'c:\Users\aarab\Documents\Antigravity\ClinicSystem\frontend\material-kit-react\src\app\dashboard\patients\rehabilitation-program-dialog.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Update imports
if "TimePicker" not in content:
    content = content.replace("DatePicker } from '@mui/x-date-pickers';", "DatePicker, TimePicker } from '@mui/x-date-pickers';")
    content = content.replace("DatePicker } from '@mui/x-date-pickers'", "DatePicker, TimePicker } from '@mui/x-date-pickers'")

target_str = '''                                </Select>
                            </FormControl>
                        </Stack>'''

custom_ui_template = '''
                        {recurrenceType === 'custom' && (
                            <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2 }}>Select Days and Times</Typography>
                                <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                                    {DAYS_OF_WEEK.map((day) => {
                                        const isSelected = recurrenceState.repeatDays.includes(day.value);
                                        return (
                                            <Chip
                                                key={day.value}
                                                label={day.label}
                                                color={isSelected ? 'primary' : 'default'}
                                                onClick={() => {
                                                    setRecurrenceState(prev => {
                                                        const newDays = isSelected
                                                            ? prev.repeatDays.filter(d => d !== day.value)
                                                            : [...prev.repeatDays, day.value].sort((a, b) => a - b);
                                                        
                                                        const newTimes = { ...(prev.repeatTimes || {}) };
                                                        if (!isSelected && !newTimes[day.value]) {
                                                            newTimes[day.value] = { start: '09:00', end: '10:00' };
                                                        }
                                                        return { ...prev, repeatDays: newDays, repeatTimes: newTimes };
                                                    });
                                                }}
                                                variant={isSelected ? 'filled' : 'outlined'}
                                                sx={{ width: 40, height: 40, borderRadius: '50%' }}
                                            />
                                        );
                                    })}
                                </Stack>
                                
                                {recurrenceState.repeatDays.length > 0 && (
                                    <Stack spacing={2}>
                                        {recurrenceState.repeatDays.map(dayValue => {
                                            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayValue];
                                            const times = recurrenceState.repeatTimes?.[dayValue] || { start: '09:00', end: '10:00' };
                                            return (
                                                <Stack key={dayValue} direction="row" spacing={2} alignItems="center">
                                                    <Typography sx={{ width: 100 }}>{dayName}</Typography>
                                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                        <TimePicker
                                                            label="Start Time"
                                                            value={dayjs(`2000-01-01T${times.start}`)}
                                                            onChange={(newValue) => {
                                                                if (newValue) {
                                                                    setRecurrenceState(prev => ({
                                                                        ...prev,
                                                                        repeatTimes: {
                                                                            ...prev.repeatTimes,
                                                                            [dayValue]: { ...times, start: newValue.format('HH:mm') }
                                                                        }
                                                                    }));
                                                                }
                                                            }}
                                                            format="hh:mm A"
                                                            slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
                                                        />
                                                        <Typography>to</Typography>
                                                        <TimePicker
                                                            label="End Time"
                                                            value={dayjs(`2000-01-01T${times.end}`)}
                                                            onChange={(newValue) => {
                                                                if (newValue) {
                                                                    setRecurrenceState(prev => ({
                                                                        ...prev,
                                                                        repeatTimes: {
                                                                            ...prev.repeatTimes,
                                                                            [dayValue]: { ...times, end: newValue.format('HH:mm') }
                                                                        }
                                                                    }));
                                                                }
                                                            }}
                                                            format="hh:mm A"
                                                            slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
                                                        />
                                                    </LocalizationProvider>
                                                </Stack>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        )}'''

if target_str in content and custom_ui_template not in content:
    content = content.replace(target_str, target_str + '\n' + custom_ui_template)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched successfully.")
else:
    print("Target not found or already patched.")
