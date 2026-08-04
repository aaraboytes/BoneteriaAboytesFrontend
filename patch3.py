import sys
import os

files_to_patch = [
    r'c:\Users\aarab\Documents\Antigravity\ClinicSystem\frontend\material-kit-react\src\app\dashboard\patients\new-consultation-dialog.tsx',
    r'c:\Users\aarab\Documents\Antigravity\ClinicSystem\frontend\material-kit-react\src\app\dashboard\patients\rehabilitation-program-dialog.tsx'
]

custom_ui_template = '''
                                    {<RECURRENCE_TYPE> === 'custom' && (
                                        <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                            <Typography variant="subtitle2" sx={{ mb: 2 }}>Select Days and Times</Typography>
                                            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                                                {DAYS_OF_WEEK.map((day) => {
                                                    const isSelected = <RECURRENCE_STATE>.repeatDays.includes(day.value);
                                                    return (
                                                        <Chip
                                                            key={day.value}
                                                            label={day.label}
                                                            color={isSelected ? 'primary' : 'default'}
                                                            onClick={() => {
                                                                <SET_RECURRENCE_STATE>(prev => {
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
                                            
                                            {<RECURRENCE_STATE>.repeatDays.length > 0 && (
                                                <Stack spacing={2}>
                                                    {<RECURRENCE_STATE>.repeatDays.map(dayValue => {
                                                        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayValue];
                                                        const times = <RECURRENCE_STATE>.repeatTimes?.[dayValue] || { start: '09:00', end: '10:00' };
                                                        return (
                                                            <Stack key={dayValue} direction="row" spacing={2} alignItems="center">
                                                                <Typography sx={{ width: 100 }}>{dayName}</Typography>
                                                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                                    <TimePicker
                                                                        label="Start Time"
                                                                        value={dayjs(`2000-01-01T${times.start}`)}
                                                                        onChange={(newValue) => {
                                                                            if (newValue) {
                                                                                <SET_RECURRENCE_STATE>(prev => ({
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
                                                                                <SET_RECURRENCE_STATE>(prev => ({
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
                                    )}
'''

for filepath in files_to_patch:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update imports
    if "TimePicker" not in content:
        content = content.replace("DatePicker } from '@mui/x-date-pickers';", "DatePicker, TimePicker } from '@mui/x-date-pickers';")
        content = content.replace("DatePicker } from '@mui/x-date-pickers'", "DatePicker, TimePicker } from '@mui/x-date-pickers'")
        # For rehabilitation-program-dialog.tsx, TimePicker might already be imported
        if "TimePicker, DatePicker" in content:
            pass

    # 2. Insert Custom UI
    if 'new-consultation-dialog.tsx' in filepath:
        target_str = '''                                            </Select>
                                        </FormControl>
                                    </Stack>'''
        ui = custom_ui_template.replace('<RECURRENCE_TYPE>', 'rehabRecurrenceType')
        ui = ui.replace('<RECURRENCE_STATE>', 'rehabRecurrenceState')
        ui = ui.replace('<SET_RECURRENCE_STATE>', 'setRehabRecurrenceState')
        
        if target_str in content and ui not in content:
            content = content.replace(target_str, target_str + '\n' + ui)
    
    elif 'rehabilitation-program-dialog.tsx' in filepath:
        target_str = '''                                            </Select>
                                </FormControl>
                            </Stack>'''
        ui = custom_ui_template.replace('<RECURRENCE_TYPE>', 'recurrenceType')
        ui = ui.replace('<RECURRENCE_STATE>', 'recurrenceState')
        ui = ui.replace('<SET_RECURRENCE_STATE>', 'setRecurrenceState')
        
        # Note: the indentation in rehabilitation-program-dialog is slightly less
        # Let's just adjust the target string
        
        if target_str in content and ui not in content:
            content = content.replace(target_str, target_str + '\n' + ui)
        else:
            print(f"Target string not found in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Patching complete.")
