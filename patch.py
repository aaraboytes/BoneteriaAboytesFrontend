import sys
import os

filepath = r'c:\Users\aarab\Documents\Antigravity\ClinicSystem\frontend\material-kit-react\src\app\dashboard\patients\new-consultation-dialog.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
imports_addition = '''
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import { MuscleSelector } from '@/components/dashboard/services/muscle-selector';
'''
content = content.replace("import { DocxGenerator } from '@/lib/docx-generator';", "import { DocxGenerator } from '@/lib/docx-generator';" + imports_addition)

# 2. Interfaces and Constants
interfaces_addition = '''
interface ServiceRecord {
    id: number;
    name: string;
    technologies: { id: number; name: string; }[];
}

export interface RecurrenceState {
    repeatEvery: number;
    repeatInterval: 'day' | 'week' | 'month' | 'year';
    repeatDays: number[];
    endType: 'never' | 'on' | 'after';
    endDate?: string;
    endOccurrences?: number;
    repeatTimes?: Record<string, { start: string, end: string }>;
}

interface RehabSessionState {
    id: string;
    serviceIds: number[];
    count: number;
}

const DAYS_OF_WEEK = [
    { label: 'S', value: 0 },
    { label: 'M', value: 1 },
    { label: 'T', value: 2 },
    { label: 'W', value: 3 },
    { label: 'T', value: 4 },
    { label: 'F', value: 5 },
    { label: 'S', value: 6 },
];
'''
content = content.replace("const TROPHISM_OPTIONS = ['NORMAL MUSCLE TROPHISM', 'MUSCLE HYPOTROPHISM', 'MUSCLE HYPERTROPHISM'];", "const TROPHISM_OPTIONS = ['NORMAL MUSCLE TROPHISM', 'MUSCLE HYPOTROPHISM', 'MUSCLE HYPERTROPHISM'];" + interfaces_addition)

# 3. State Variables
state_addition = '''
    // Rehabilitation Program Form
    const [createRehabProgram, setCreateRehabProgram] = React.useState(false);
    const [rehabName, setRehabName] = React.useState('');
    const [rehabStatus, setRehabStatus] = React.useState('Active');
    const [rehabMuscleGroups, setRehabMuscleGroups] = React.useState<string[]>([]);
    
    const generateId = () => Math.random().toString(36).substring(2, 9);
    const [rehabSessions, setRehabSessions] = React.useState<RehabSessionState[]>([{ id: generateId(), serviceIds: [], count: 1 }]);
    const [availableServices, setAvailableServices] = React.useState<ServiceRecord[]>([]);
    
    const [rehabRecurrenceType, setRehabRecurrenceType] = React.useState<string>('weekly');
    const [rehabRecurrenceState, setRehabRecurrenceState] = React.useState<RecurrenceState>({
        repeatEvery: 1,
        repeatInterval: 'week',
        repeatDays: [1, 3, 5],
        endType: 'never',
    });
    const [rehabStartDate, setRehabStartDate] = React.useState<Dayjs>(dayjs());
'''
content = content.replace("const [assessments, setAssessments] = React.useState<AssessmentInput[]>([]);", "const [assessments, setAssessments] = React.useState<AssessmentInput[]>([]);" + state_addition)

# 4. useEffect
use_effect_addition = '''
            // Fetch services for rehab program
            apiClient.get<ServiceRecord[]>('/Services').then(res => {
                setAvailableServices(res.data);
            }).catch(err => {
                console.error('Failed to fetch services', err);
            });
'''
content = content.replace("setStaffMembers(res.data))\n                .catch(err => console.error('Failed to fetch staff members', err));", "setStaffMembers(res.data))\n                .catch(err => console.error('Failed to fetch staff members', err));" + use_effect_addition)

# 5. Helper Functions & Derived state
helpers_addition = '''
    const handleCloneSession = (index: number) => {
        const source = rehabSessions[index];
        const newSession: RehabSessionState = {
            id: generateId(),
            serviceIds: [...source.serviceIds],
            count: source.count
        };
        const newSessions = [...rehabSessions];
        newSessions.splice(index + 1, 0, newSession);
        setRehabSessions(newSessions);
    };

    const handleRemoveSession = (id: string) => {
        setRehabSessions(rehabSessions.filter(s => s.id !== id));
    };

    const handleSessionChange = (id: string, field: keyof RehabSessionState, value: any) => {
        setRehabSessions(rehabSessions.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const uniqueTechnologies = React.useMemo(() => {
        const techMap = new Map<number, string>();
        rehabSessions.forEach(session => {
            session.serviceIds.forEach(serviceId => {
                const service = availableServices.find(s => s.id === serviceId);
                if (service && service.technologies) {
                    service.technologies.forEach(tech => {
                        techMap.set(tech.id, tech.name);
                    });
                }
            });
        });
        return Array.from(techMap.values());
    }, [rehabSessions, availableServices]);

    const simulatedDates = React.useMemo(() => {
        const totalCount = rehabSessions.reduce((acc, s) => acc + s.count, 0);
        if (totalCount === 0 || rehabRecurrenceType === 'none') return [];

        const dates: dayjs.Dayjs[] = [];
        let currentDate = rehabStartDate.clone();
        
        while (dates.length < totalCount) {
            let matches = false;
            
            if (rehabRecurrenceType === 'daily') {
                matches = true;
            } else if (rehabRecurrenceType === 'weekly' || (rehabRecurrenceType === 'custom' && rehabRecurrenceState.repeatInterval === 'week')) {
                const targetDays = rehabRecurrenceType === 'custom' ? rehabRecurrenceState.repeatDays : [];
                if (rehabRecurrenceType === 'weekly') {
                    matches = currentDate.day() >= 1 && currentDate.day() <= 5;
                } else {
                    matches = targetDays.includes(currentDate.day());
                }
            } else if (rehabRecurrenceType === 'custom' && rehabRecurrenceState.repeatInterval === 'day') {
                matches = true;
            }

            if (matches) {
                dates.push(currentDate.clone());
            }

            if (rehabRecurrenceType === 'daily' || (rehabRecurrenceType === 'custom' && rehabRecurrenceState.repeatInterval === 'day')) {
                currentDate = currentDate.add(rehabRecurrenceType === 'custom' ? rehabRecurrenceState.repeatEvery : 1, 'day');
            } else if (rehabRecurrenceType === 'weekly' || (rehabRecurrenceType === 'custom' && rehabRecurrenceState.repeatInterval === 'week')) {
                currentDate = currentDate.add(1, 'day');
                const repeatEvery = rehabRecurrenceType === 'custom' ? rehabRecurrenceState.repeatEvery : 1;
                if (currentDate.day() === 0 && repeatEvery > 1) {
                    currentDate = currentDate.add(7 * (repeatEvery - 1), 'day');
                }
            } else {
                currentDate = currentDate.add(1, 'day');
            }
        }
        return dates;
    }, [rehabSessions, rehabRecurrenceType, rehabRecurrenceState, rehabStartDate]);
'''
content = content.replace("const handleAddAssessment = () => {", helpers_addition + "\n    const handleAddAssessment = () => {")

# 6. Save Logic (POST Rehab Program)
save_logic_addition = '''
            // After saving consultation, check if we need to create a rehab program
            if (createRehabProgram) {
                const finalSessions: any[] = [];
                rehabSessions.forEach(s => {
                    for (let i = 0; i < s.count; i++) {
                        finalSessions.push({ serviceIds: s.serviceIds });
                    }
                });

                const rehabPayload: any = {
                    name: rehabName,
                    muscleGroups: rehabMuscleGroups.join(','),
                    status: rehabStatus,
                    sessions: finalSessions,
                };

                if (rehabRecurrenceType !== 'none') {
                    rehabPayload.Recurrence = {
                        PatternType: rehabRecurrenceType === 'custom' ? (rehabRecurrenceState.repeatInterval === 'day' ? 'daily' : rehabRecurrenceState.repeatInterval === 'week' ? 'weekly' : 'monthly') : (rehabRecurrenceType === 'daily' ? 'daily' : 'weekly'),
                        RepeatEvery: rehabRecurrenceType === 'custom' ? rehabRecurrenceState.repeatEvery : 1,
                        DaysOfWeek: rehabRecurrenceType === 'custom' ? rehabRecurrenceState.repeatDays.join(',') : '',
                        StartDate: rehabStartDate.format('YYYY-MM-DDTHH:mm:ss'),
                        MaxOccurrences: rehabRecurrenceType === 'custom' && rehabRecurrenceState.endType === 'after' ? rehabRecurrenceState.endOccurrences : null,
                        EndDate: rehabRecurrenceType === 'custom' && rehabRecurrenceState.endType === 'on' ? rehabRecurrenceState.endDate : null,
                        TimePreferences: rehabRecurrenceType === 'custom' && rehabRecurrenceState.repeatTimes ? JSON.stringify(rehabRecurrenceState.repeatTimes) : null
                    };
                }

                try {
                    await apiClient.post(`/Patients/${patientId}/rehabilitation-programs`, rehabPayload);
                } catch (rehabErr) {
                    console.error('Failed to save rehab program', rehabErr);
                    alert('Consultation saved, but failed to save Rehabilitation Program.');
                }
            }
'''
content = content.replace("onSuccess();\n        } catch (error) {", save_logic_addition + "\n            onSuccess();\n        } catch (error) {")


# Write back
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Phase 1 patching complete.')
