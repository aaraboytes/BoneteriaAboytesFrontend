export interface ClinicalHistory {
    id?: number;
    patientId?: number;

    // General
    occupation?: string;
    civilStatus?: string;
    address?: string;
    recommendedBy?: string;

    // Hereditary History
    hereditaryDiabetes: boolean;
    hereditaryDiabetesNotes?: string;
    hereditaryHeartDisease: boolean;
    hereditaryHeartDiseaseNotes?: string;
    hereditaryThyroid: boolean;
    hereditaryThyroidNotes?: string;
    hereditaryRheumatic: boolean;
    hereditaryRheumaticNotes?: string;
    hereditaryHypertension: boolean;
    hereditaryHypertensionNotes?: string;
    hereditaryCancer: boolean;
    hereditaryCancerNotes?: string;
    hereditaryRespiratory: boolean;
    hereditaryRespiratoryNotes?: string;
    hereditaryDepression: boolean;
    hereditaryDepressionNotes?: string;
    hereditaryTumors: boolean;
    hereditaryTumorsNotes?: string;
    hereditaryOthers?: string;

    // Personal History
    personalDiabetes: boolean;
    personalDiabetesNotes?: string;
    personalHeartDisease: boolean;
    personalHeartDiseaseNotes?: string;
    personalThyroid: boolean;
    personalThyroidNotes?: string;
    personalRheumatic: boolean;
    personalRheumaticNotes?: string;
    personalHypertension: boolean;
    personalHypertensionNotes?: string;
    personalCancer: boolean;
    personalCancerNotes?: string;
    personalRespiratory: boolean;
    personalRespiratoryNotes?: string;
    personalDepression: boolean;
    personalDepressionNotes?: string;
    personalTumors: boolean;
    personalTumorsNotes?: string;

    // Pathological Personal
    currentIllnesses?: string;
    allergies?: string;
    surgical?: string;
    traumatic?: string;
    
    // Medications
    medsAnalgesics?: string;
    medsAntiInflammatories?: string;
    medsAntidepressants?: string;
    medsLaxatives?: string;
    medsAnxiolytics?: string;
    medsCholesterol?: string;
    medsOthers?: string;

    // Systems Review
    systemGastrointestinal?: string;
    systemRespiratory?: string;
    systemCardiac?: string;
    systemReproductive?: string;
    systemRenal?: string;

    // Non-Pathological
    isSmoker: boolean;
    smokerNotes?: string;
    hasToxicomania: boolean;
    toxicomaniaNotes?: string;
    alcoholFrequency?: string;
    physicalActivity?: string;
    sleepHours?: string;

    // Current Condition
    complaintQue?: string;
    complaintComo?: string;
    complaintCuando?: string;
    complaintDonde?: string;
    mechanismOfInjury?: string;
    startDate?: string;
    previousTreatments?: string;
    physicalExploration?: string;
    indications?: string;

    // Informed Consent
    consentTutorName?: string;
    consentType?: string; // Patient, Tutor, LegalRepresentative
    consentDate?: string;
    consentSignature?: string; // Base64 signature
    consentAddress?: string;
    consentPhone?: string;
    useMedicalDevices: boolean;
    medicalDevicesNotes?: string;
}

export interface PatientDefaultAttendant {
    id?: number;
    patientId: number;
    serviceId: number;
    attendantId: number;
}

export interface Treatment {
    id: number;
    patientId: number;
    number: number;
    date: string;
    treatmentText: string;
}

export interface PatientRecord {
    id: number;
    firstName: string;
    lastName: string;
    birthDate: string;
    gender: string;
    medicalHistory: string; // Legacy field
    status: string;
    phone?: string;
    email?: string;
    clinicId?: number;
    groupId?: number;
    balance?: number;
    photoUrl?: string;
    referredBy?: string;
    clinic?: { id: number; name: string };
    group?: { id: number; name: string };
    clinicalHistory?: ClinicalHistory;
    defaultAttendants?: PatientDefaultAttendant[];
    treatments?: Treatment[];
    appointmentCount?: number;
    activeRehabServices?: Array<{ id: number; name: string; color: string }>;
    nextAppointmentType?: string;
}
