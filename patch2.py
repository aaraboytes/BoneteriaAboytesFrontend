import sys
import os

filepath = r'c:\Users\aarab\Documents\Antigravity\ClinicSystem\frontend\material-kit-react\src\app\dashboard\patients\new-consultation-dialog.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The Prescriptions block starts with `<Box sx={{ pt: 2 }}>` right after `TextField label="Observations"` and ends before `</Stack>\n                    </Box>\n\n                    {/* Right Column: Assessment Data */}`.

# Let's find the Exact string:
prescriptions_start = content.find('<Box sx={{ pt: 2 }}>')
prescriptions_end = content.find('</Stack>\n                    </Box>\n\n                    {/* Right Column: Assessment Data */}')

# We need to extract the exact block. 
# Looking at the original file:
#                             <Box sx={{ pt: 2 }}>
#                                 <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
# ...
#                                 </Stack>
#                             </Box>

extract_start = content.find('<Box sx={{ pt: 2 }}>\n                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>\n                                    <Typography variant="h6">Prescriptions</Typography>')

# It ends right before `                        </Stack>\n                    </Box>\n\n                    {/* Right Column: Assessment Data */}`
# Let's extract everything between extract_start and the end of that Box.
# Actually, the string to find the end is:
#                                     )}
#                                 </Stack>
#                             </Box>
#                         </Stack>
#                     </Box>

# Let's use a simpler approach. I will replace the prescriptions block with empty string, and then append it at the end.
prescriptions_block = content[extract_start:content.find('</Box>', extract_start + 1000) + 6]
# Wait, this is risky if there are nested `<Box>` tags.
# Let's do it manually since we know the exact text.

prescriptions_block = '''                            <Box sx={{ pt: 2 }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                    <Typography variant="h6">Prescriptions</Typography>
                                    {!isView && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<PlusIcon />}
                                            onClick={() => setPrescriptionInputs(prev => [...prev, { id: Math.random().toString(), text: '' }])}
                                        >
                                            Add Prescription
                                        </Button>
                                    )}
                                </Stack>
                                <Stack spacing={2}>
                                    {prescriptionInputs.map((p, idx) => (
                                        <Stack key={p.id} direction="row" spacing={1} alignItems="flex-start">
                                            <TextField
                                                label={`Prescription #${idx + 1}`}
                                                value={p.text}
                                                onChange={(e) => {
                                                    const newInputs = [...prescriptionInputs];
                                                    const index = newInputs.findIndex(item => item.id === p.id);
                                                    if (index !== -1) {
                                                        newInputs[index].text = e.target.value;
                                                        setPrescriptionInputs(newInputs);
                                                    }
                                                }}
                                                multiline
                                                rows={2}
                                                fullWidth
                                                slotProps={{ input: { readOnly: isView } }}
                                            />
                                            {!isView && (
                                                <IconButton size="small" color="error" onClick={() => setPrescriptionInputs(prev => prev.filter(item => item.id !== p.id))} sx={{ mt: 1 }}>
                                                    <TrashIcon />
                                                </IconButton>
                                            )}
                                        </Stack>
                                    ))}
                                    {!isView && prescriptionInputs.length === 0 && (
                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                            No prescriptions added. Use the button above to add one.
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>'''

if prescriptions_block in content:
    content = content.replace(prescriptions_block, '')
else:
    print("Could not find exact prescriptions block to remove.")
    # Exit to prevent further errors
    sys.exit(1)

rehab_ui = '''
                <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Typography variant="h6">Rehabilitation Program</Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={createRehabProgram}
                                    onChange={(e) => setCreateRehabProgram(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Create Rehabilitation Program?"
                        />
                    </Stack>

                    <Collapse in={createRehabProgram}>
                        <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
                            <Stack spacing={4}>
                                {/* Program Meta */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 2 }}>Program Details</Typography>
                                    <Stack direction="row" spacing={2}>
                                        <TextField
                                            label="Rehabilitation program's name"
                                            fullWidth
                                            value={rehabName}
                                            onChange={(e) => setRehabName(e.target.value)}
                                            placeholder="e.g. Post-op ACL Recovery"
                                        />
                                        <TextField
                                            label="Status"
                                            select
                                            value={rehabStatus}
                                            onChange={(e) => setRehabStatus(e.target.value)}
                                            sx={{ minWidth: 200 }}
                                        >
                                            <MenuItem value="Active">Active</MenuItem>
                                            <MenuItem value="Inactive">Inactive</MenuItem>
                                        </TextField>
                                    </Stack>

                                    <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>Program Schedule</Typography>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <DatePicker
                                                label="Program Start Date"
                                                value={rehabStartDate}
                                                onChange={(newValue) => setRehabStartDate(newValue || dayjs())}
                                                format="DD/MM/YYYY"
                                                slotProps={{ textField: { fullWidth: true } }}
                                            />
                                        </LocalizationProvider>
                                        <FormControl fullWidth>
                                            <InputLabel>Recurrence Pattern</InputLabel>
                                            <Select
                                                value={rehabRecurrenceType}
                                                label="Recurrence Pattern"
                                                onChange={(e) => setRehabRecurrenceType(e.target.value)}
                                            >
                                                <MenuItem value="none">Manual / Unscheduled</MenuItem>
                                                <MenuItem value="daily">Daily</MenuItem>
                                                <MenuItem value="custom">Custom (e.g. MWF)</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Stack>
                                </Box>

                                {/* Muscle Selector */}
                                <Box>
                                    <MuscleSelector
                                        selectedMuscles={rehabMuscleGroups}
                                        onChange={(muscles) => setRehabMuscleGroups(muscles)}
                                    />
                                </Box>

                                {/* Sessions & Technologies Split Layout */}
                                <Stack direction="row" spacing={3} alignItems="flex-start" sx={{ flexDirection: { xs: 'column', lg: 'row' }}}>
                                    {/* LEFT: Sessions & Recurrence */}
                                    <Box sx={{ flex: 2, width: '100%' }}>
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2" sx={{ mb: 2 }}>Sessions</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Total current sessions: {rehabSessions.reduce((acc, s) => acc + s.count, 0)} ({rehabSessions.length} rows)
                                            </Typography>
                                        </Box>

                                        <Stack spacing={2}>
                                            <Stack spacing={1}>
                                                {rehabSessions.map((session, index) => {
                                                    const bgColor = 'var(--mui-palette-background-level1)';
                                                    const startIdx = rehabSessions.slice(0, index).reduce((acc, s) => acc + s.count, 0);

                                                    return (
                                                        <Box key={session.id}>
                                                            <Stack direction="row" spacing={2} alignItems="center" sx={{ bgcolor: bgColor, p: 1, borderRadius: 1, flexWrap: 'wrap', gap: 1 }}>
                                                                <Typography variant="body2" color="text.secondary" sx={{ width: 40, fontWeight: 'bold' }}>#{startIdx}</Typography>

                                                                <Box sx={{ minWidth: 100 }}>
                                                                    {simulatedDates[startIdx] ? (
                                                                        <Typography variant="caption" color="primary.main" fontWeight="bold">
                                                                            {simulatedDates[startIdx].format('DD MMM')}
                                                                            {session.count > 1 && simulatedDates[startIdx + session.count - 1] && 
                                                                                ` - ${simulatedDates[startIdx + session.count - 1].format('DD MMM')}`}
                                                                        </Typography>
                                                                    ) : <Typography variant="caption" color="text.disabled">Unscheduled</Typography>}
                                                                </Box>

                                                                <TextField
                                                                    type="number"
                                                                    size="small"
                                                                    label="Count"
                                                                    value={session.count}
                                                                    onChange={(e) => {
                                                                        const val = Math.max(1, parseInt(e.target.value) || 1);
                                                                        handleSessionChange(session.id, 'count', val);
                                                                    }}
                                                                    sx={{ width: 80 }}
                                                                    inputProps={{ min: 1 }}
                                                                />

                                                                <FormControl sx={{ flex: 1, minWidth: 200 }} size="small">
                                                                    <InputLabel>Services</InputLabel>
                                                                    <Select
                                                                        multiple
                                                                        value={session.serviceIds}
                                                                        onChange={(e) => {
                                                                            const value = e.target.value;
                                                                            handleSessionChange(session.id, 'serviceIds', typeof value === 'string' ? value.split(',').map(Number) : value);
                                                                        }}
                                                                        input={<OutlinedInput label="Services" />}
                                                                        renderValue={(selected) => (
                                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                                {selected.map((value) => {
                                                                                    const s = availableServices.find(srv => srv.id === value);
                                                                                    return <Chip key={value} label={s?.name || `Service ${value}`} size="small" sx={{ height: 20, fontSize: '0.75rem' }} />;
                                                                                })}
                                                                            </Box>
                                                                        )}
                                                                    >
                                                                        {availableServices.map((service) => (
                                                                            <MenuItem key={service.id} value={service.id}>
                                                                                <Checkbox checked={session.serviceIds.includes(service.id)} />
                                                                                <ListItemText primary={service.name} />
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </FormControl>

                                                                <IconButton color="error" size="small" onClick={() => handleRemoveSession(session.id)} disabled={rehabSessions.length === 1}>
                                                                    <TrashIcon />
                                                                </IconButton>
                                                            </Stack>
                                                        </Box>
                                                    )
                                                })}
                                                <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleCloneSession(rehabSessions.length - 1)}
                                                        sx={{
                                                            border: '1px solid',
                                                            borderColor: 'primary.main',
                                                            bgcolor: 'primary.main',
                                                            color: 'white',
                                                            '&:hover': {
                                                                bgcolor: 'primary.dark',
                                                            }
                                                        }}
                                                    >
                                                        <PlusIcon size={16} />
                                                    </IconButton>
                                                </Box>
                                            </Stack>
                                        </Stack>
                                    </Box>

                                    {/* RIGHT: Selected Techs panel */}
                                    <Box sx={{ flex: 1, position: 'sticky', top: 0, width: '100%' }}>
                                        {uniqueTechnologies.length > 0 && (
                                            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                                <Typography variant="subtitle2" sx={{ mb: 2 }}>Technologies involved</Typography>
                                                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                                                    {uniqueTechnologies.map(tech => (
                                                        <Chip key={tech} label={tech} color="secondary" variant="outlined" size="small" />
                                                    ))}
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                                    These are identified automatically based on selected services.
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Stack>
                            </Stack>
                        </Box>
                    </Collapse>
                </Box>
'''

# The place to insert is after `                    </Box>\n                </Box>\n            </DialogContent>`
# Wait, the end of the 2-column layout is `                    </Box>\n                </Box>`

insert_target = '                    </Box>\n                </Box>'
new_content = insert_target + '\n' + rehab_ui + '\n' + prescriptions_block.replace('<Box sx={{ pt: 2 }}>', '<Box sx={{ mt: 4, pt: 3, borderTop: \'1px solid\', borderColor: \'divider\' }}>')

if insert_target in content:
    content = content.replace(insert_target, new_content)
else:
    print("Could not find insert target.")
    sys.exit(1)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Phase 2 patching complete.')
