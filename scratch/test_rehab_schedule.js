const axios = require('axios');

const API_BASE = 'http://localhost:8082/api'; 
const PATIENT_ID = 1;        // Adjust if needed
const REHAB_PROGRAM_ID = 3;  // Based on your screenshot

async function testRehabSchedule() {
    console.log('--- Starting Rehab Schedule Test ---');

    try {
        // 0. Login to get token
        console.log('Logging in as admin...');
        const loginRes = await axios.post(`${API_BASE}/Auth/login`, {
            email: 'admin@clinic.com',
            password: 'Admin123!'
        });
        const token = loginRes.data.token;
        console.log('✅ Login successful.');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // 0.5 Discover a valid patient and program
        console.log('Discovering a valid patient and rehab program...');
        const patientsRes = await axios.get(`${API_BASE}/Patients?pageSize=1`, config);
        const patients = patientsRes.data.items || patientsRes.data;
        if (!patients || patients.length === 0) throw new Error('No patients found in DB.');
        
        const patient = patients[0];
        const patientId = patient.id;

        // Fetch programs for this patient
        // Based on PatientsController, we might need to get the full patient
        const patientFullRes = await axios.get(`${API_BASE}/Patients/${patientId}`, config);
        const programs = patientFullRes.data.rehabilitationPrograms || [];
        if (programs.length === 0) throw new Error(`Patient #${patientId} has no rehab programs.`);
        
        const programId = programs[0].id;
        console.log(`✅ Using Patient #${patientId} and Rehab Program #${programId}.`);

        const testPayload = {
            patientId: patientId,
            clinicId: 1,
            appointmentDate: "2026-04-25T16:15:00",
            appointmentEndTime: "2026-04-25T17:15:00",
            status: "scheduled",
            TimeZoneId: "America/Mexico_City",
            recurrenceRule: {
                patternType: "weekly",
                repeatEvery: 1,
                daysOfWeek: "1,2,3", // Mon, Tue, Wed
                startDate: "2026-04-25T00:00:00",
                timeZoneId: "America/Mexico_City",
                timePreferences: [
                    { dayOfWeek: 1, startTime: "16:15", endTime: "17:15" },
                    { dayOfWeek: 2, startTime: "11:15", endTime: "12:15" },
                    { dayOfWeek: 3, startTime: "08:15", endTime: "09:15" }
                ]
            }
        };

        // 1. Create the schedule
        console.log(`Sending POST to schedule Rehab Program #${programId}...`);
        await axios.post(`${API_BASE}/Appointments/rehab-plan/${programId}?replaceExistingRule=true`, testPayload, config);
        console.log('✅ Schedule created successfully.');

        // 2. Fetch the active rule
        console.log(`Fetching active rule for Patient #${patientId} and Program #${programId}...`);
        const res = await axios.get(`${API_BASE}/Patients/${patientId}/active-recurrence-rule?programId=${programId}`, config);
        
        const rule = res.data;
        console.log('\n--- RETRIEVED RULE DATA ---');
        console.log(`Rule ID: ${rule.id}`);
        console.log(`Days of Week: ${rule.daysOfWeek}`);
        console.log('Time Preferences:');
        
        const timePrefs = rule.timePreferences || rule.TimePreferences || [];
        timePrefs.sort((a, b) => (a.dayOfWeek ?? a.DayOfWeek) - (b.dayOfWeek ?? b.DayOfWeek));
        
        timePrefs.forEach(tp => {
            const day = tp.dayOfWeek ?? tp.DayOfWeek;
            const start = tp.startTime ?? tp.StartTime;
            const end = tp.endTime ?? tp.EndTime;
            console.log(`  - Day ${day}: ${start} to ${end}`);
        });

        // 3. Verification
        const expected = ["16:15", "11:15", "08:15"];
        const actual = timePrefs.map(tp => {
            const start = tp.startTime ?? tp.StartTime;
            return String(start).slice(0, 5);
        });
        
        console.log('\nVerification:');
        console.log('Expected (any order):', expected);
        console.log('Actual:            ', actual);

        const allFound = expected.every(exp => actual.includes(exp));
        if (allFound) {
            console.log('\n🌟 TEST PASSED: All expected times are present in the retrieved rule!');
        } else {
            console.log('\n❌ TEST FAILED: Some expected times are missing.');
        }

    } catch (err) {
        console.error('Error during test:', err.response?.data || err.message);
    }
}

testRehabSchedule();

