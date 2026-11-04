export const INITIAL_MOCK_INMATES = [
  {
    id: '#REC-88392',
    name: 'Vance, Marcus T.',
    fullName: 'Marcus T. Vance',
    block: 'Block C - Max 4',
    expiry: '2023-11-15',
    remission: 45,
    status: 'In Progress',
    progress: '2/5',
    statusType: 'progress',
    action: 'Manage Clearance',
  },
  {
    id: '#REC-44102',
    name: 'Holloway, Sarah J.',
    fullName: 'Sarah J. Holloway',
    block: 'Block A - Min 2',
    expiry: '2023-11-18',
    remission: 30,
    status: 'Ready for Auth',
    progress: '',
    statusType: 'ready',
    action: 'Authorize Release',
  },
  {
    id: '#REC-99211',
    name: 'Kowalski, Robert',
    fullName: 'Robert Kowalski',
    block: 'Block B - Med 1',
    expiry: '2023-11-22',
    remission: 12,
    status: 'Hold: Property Missing',
    progress: '',
    statusType: 'hold',
    action: 'Manage Clearance',
  },
];

const STORAGE_KEYS = {
  inmates: 'prison-management.trial.inmates',
  dischargeEvents: 'prison-management.trial.discharge-events',
  checklists: 'prison-management.trial.checklists',
};

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('The trial backend requires browser local storage.');
  }

  return window.localStorage;
}

function readCollection(key, initialValue = []) {
  const storage = getStorage();
  const storedValue = storage.getItem(key);

  if (storedValue === null) {
    storage.setItem(key, JSON.stringify(initialValue));
    return initialValue;
  }

  let value;
  try {
    value = JSON.parse(storedValue);
  } catch (error) {
    throw new Error(`Trial data for "${key}" is not valid JSON.`, { cause: error });
  }

  if (!Array.isArray(value)) {
    throw new Error(`Trial data for "${key}" must be a list.`);
  }

  return value;
}

function writeCollection(key, value) {
  getStorage().setItem(key, JSON.stringify(value));
  return value;
}

function requireText(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required.`);
  }
}

export const ReleaseDischargeService = {
  getAllInmates: async () => readCollection(STORAGE_KEYS.inmates, INITIAL_MOCK_INMATES),

  getUserById: async (id) => {
    requireText(id, 'Inmate ID');
    const inmate = readCollection(STORAGE_KEYS.inmates, INITIAL_MOCK_INMATES)
      .find((record) => record.id === id);

    if (!inmate) {
      throw new Error(`No trial inmate record exists for "${id}".`);
    }

    return inmate;
  },

  createInmate: async (inmateData) => {
    requireText(inmateData?.id, 'Inmate ID');
    requireText(inmateData?.name, 'Inmate name');
    requireText(inmateData?.fullName, 'Full name');

    const inmates = readCollection(STORAGE_KEYS.inmates, INITIAL_MOCK_INMATES);
    if (inmates.some((inmate) => inmate.id === inmateData.id)) {
      throw new Error(`An inmate record with ID "${inmateData.id}" already exists.`);
    }

    const createdInmate = { ...inmateData };
    writeCollection(STORAGE_KEYS.inmates, [...inmates, createdInmate]);
    return createdInmate;
  },

  updateInmate: async (id, changes) => {
    requireText(id, 'Inmate ID');

    const inmates = readCollection(STORAGE_KEYS.inmates, INITIAL_MOCK_INMATES);
    const inmateIndex = inmates.findIndex((inmate) => inmate.id === id);
    if (inmateIndex === -1) {
      throw new Error(`No trial inmate record exists for "${id}".`);
    }

    const updatedInmate = { ...inmates[inmateIndex], ...changes, id };
    const updatedInmates = [...inmates];
    updatedInmates[inmateIndex] = updatedInmate;
    writeCollection(STORAGE_KEYS.inmates, updatedInmates);
    return updatedInmate;
  },

  getAllDischargeEvents: async () => readCollection(STORAGE_KEYS.dischargeEvents),

  recordDischarge: async (eventData) => {
    requireText(eventData?.inmateId, 'Inmate ID');
    requireText(eventData?.inmateName, 'Inmate name');
    requireText(eventData?.dischargeDate, 'Discharge date');
    requireText(eventData?.destination, 'Destination');

    const events = readCollection(STORAGE_KEYS.dischargeEvents);
    const event = {
      ...eventData,
      id: `TRIAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      recordedAt: new Date().toISOString(),
    };
    writeCollection(STORAGE_KEYS.dischargeEvents, [event, ...events]);
    return event;
  },

  getChecklist: async (inmateId, initialChecklist) => {
    requireText(inmateId, 'Inmate ID');

    const storedChecklists = readCollection(STORAGE_KEYS.checklists);
    return storedChecklists.find((entry) => entry.inmateId === inmateId)?.items
      ?? initialChecklist;
  },

  saveChecklist: async (inmateId, items) => {
    requireText(inmateId, 'Inmate ID');
    if (!Array.isArray(items)) {
      throw new Error('Checklist items must be a list.');
    }

    const storedChecklists = readCollection(STORAGE_KEYS.checklists);
    const savedChecklist = { inmateId, items };
    const updatedChecklists = [
      savedChecklist,
      ...storedChecklists.filter((entry) => entry.inmateId !== inmateId),
    ];
    writeCollection(STORAGE_KEYS.checklists, updatedChecklists);
    return items;
  },

  resetTrialData: async () => {
    const storage = getStorage();
    Object.values(STORAGE_KEYS).forEach((key) => storage.removeItem(key));
    return readCollection(STORAGE_KEYS.inmates, INITIAL_MOCK_INMATES);
  },
};
