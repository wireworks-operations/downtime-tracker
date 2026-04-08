// app.js

const DB_NAME = 'DowntimeTrackerDB';
const DB_VERSION = 2; // Increment version for new store
const STORE_NAME = 'records';
const SETTINGS_STORE = 'settings';
const REASONS_STORE = 'custom_reasons';

let db;

// Request persistent storage
async function requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`Persisted storage granted: ${isPersisted}`);
        return isPersisted;
    }
    return false;
}

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            updateDBStatus('Error');
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database opened successfully');
            updateDBStatus('Healthy');
            requestPersistence();
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                db.createObjectStore(SETTINGS_STORE);
            }
            if (!db.objectStoreNames.contains(REASONS_STORE)) {
                db.createObjectStore(REASONS_STORE, { keyPath: 'name' });
            }
        };
    });
}

function updateDBStatus(status) {
    const dbStatusEl = document.getElementById('db-status');
    if (dbStatusEl) {
        dbStatusEl.textContent = status;
        dbStatusEl.parentElement.style.borderColor = status === 'Healthy' ? 'var(--purple)' : 'var(--red)';
    }
}

// CRUD Operations
async function addRecord(record) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(record);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function addCustomReason(reason) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([REASONS_STORE], 'readwrite');
        const store = transaction.objectStore(REASONS_STORE);
        const request = store.put({ name: reason });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getAllCustomReasons() {
    return new Promise((resolve, reject) => {
        if (!db) return resolve([]);
        const transaction = db.transaction([REASONS_STORE], 'readonly');
        const store = transaction.objectStore(REASONS_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllRecords() {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve([]);
            return;
        }
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteRecord(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function clearDatabase() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME, SETTINGS_STORE, REASONS_STORE], 'readwrite');
        transaction.objectStore(STORE_NAME).clear();
        transaction.objectStore(SETTINGS_STORE).clear();
        transaction.objectStore(REASONS_STORE).clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

async function setSetting(key, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getSetting(key) {
    return new Promise((resolve, reject) => {
        if (!db) return resolve(null);
        const transaction = db.transaction([SETTINGS_STORE], 'readonly');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Timer State
let timerInterval;
let startTime;
let isRunning = false;
let currentReason = 'Forklift';

// DOM Elements
const timerDisplay = document.querySelector('.timer-display');
const punchBtn = document.getElementById('punch-btn');
const punchText = document.getElementById('punch-text');
const reasonSelect = document.getElementById('downtime-reason');
const customReasonModal = document.getElementById('custom-reason-modal');
const customReasonInput = document.getElementById('custom-reason-input');
const saveCustomBtn = document.getElementById('save-custom');
const cancelCustomBtn = document.getElementById('cancel-custom');

// Timer Functions
async function startTimer() {
    startTime = Date.now();
    isRunning = true;
    punchBtn.classList.add('active');
    punchText.textContent = 'STOP TIMER';

    await saveTimerState();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

async function stopTimer() {
    clearInterval(timerInterval);
    const endTime = Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);

    const record = {
        reason: currentReason,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        timestamp: new Date().toLocaleString()
    };

    await addRecord(record);

    isRunning = false;
    punchBtn.classList.remove('active');
    punchText.textContent = 'START TIMER';
    timerDisplay.textContent = '00:00:00';

    await clearTimerState();
    await updateDashboard();
    await renderRecords();
}

async function saveTimerState() {
    await setSetting('timerState', {
        startTime,
        isRunning,
        currentReason
    });
}

async function clearTimerState() {
    await setSetting('timerState', null);
}

async function restoreTimerState() {
    const state = await getSetting('timerState');
    if (state && state.isRunning) {
        startTime = state.startTime;
        isRunning = state.isRunning;
        currentReason = state.currentReason;
        reasonSelect.value = currentReason;

        punchBtn.classList.add('active');
        punchText.textContent = 'STOP TIMER';
        timerInterval = setInterval(updateTimerDisplay, 1000);
        updateTimerDisplay();
    }
}

function updateTimerDisplay() {
    const now = Date.now();
    const diff = Math.floor((now - startTime) / 1000);

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    timerDisplay.textContent =
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Event Listeners
punchBtn.addEventListener('click', () => {
    if (isRunning) {
        stopTimer();
    } else {
        startTimer();
    }
});

reasonSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        customReasonModal.style.display = 'flex';
    } else {
        currentReason = e.target.value;
    }
});

saveCustomBtn.addEventListener('click', async () => {
    const customReason = customReasonInput.value.trim();
    if (customReason) {
        await addCustomReason(customReason);
        addReasonToDropdown(customReason);
        reasonSelect.value = customReason;
        currentReason = customReason;
        customReasonModal.style.display = 'none';
        customReasonInput.value = '';
    }
});

function addReasonToDropdown(reason) {
    // Check if it already exists
    if (Array.from(reasonSelect.options).some(opt => opt.value === reason)) return;

    const option = document.createElement('option');
    option.value = reason;
    option.textContent = reason;
    reasonSelect.insertBefore(option, reasonSelect.lastElementChild);
}

async function loadCustomReasons() {
    const reasons = await getAllCustomReasons();
    reasons.forEach(r => addReasonToDropdown(r.name));
}

cancelCustomBtn.addEventListener('click', () => {
    customReasonModal.style.display = 'none';
    reasonSelect.value = currentReason;
});

// App Initialization
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    await loadCustomReasons();
    await restoreTimerState();
    await updateDashboard();
    await renderRecords();
});

// Stubs for next steps
async function updateDashboard() {
    const records = await getAllRecords();
    document.getElementById('total-records').textContent = records.length;

    let totalSeconds = 0;
    let lastActivity = 'Never';

    if (records.length > 0) {
        totalSeconds = records.reduce((acc, rec) => acc + rec.duration, 0);
        lastActivity = new Date(records[records.length - 1].endTime).toLocaleTimeString();
    }

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    document.getElementById('total-downtime').textContent = `${h}h ${m}m`;
    document.getElementById('last-activity').textContent = lastActivity;
}

// Record Rendering and Management
const recordsListEl = document.getElementById('records-list');
const searchInput = document.getElementById('search-records');
const sortSelect = document.getElementById('sort-order');
const clearSearchBtn = document.getElementById('clear-search');
const selectAllCheckbox = document.getElementById('select-all');
const selectedCountEl = document.getElementById('selected-count');

let allRecords = [];

async function renderRecords() {
    allRecords = await getAllRecords();
    applyFilters();
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const sortOrder = sortSelect.value;

    let filteredRecords = allRecords.filter(rec =>
        rec.reason.toLowerCase().includes(searchTerm) ||
        rec.timestamp.toLowerCase().includes(searchTerm)
    );

    filteredRecords.sort((a, b) => {
        return sortOrder === 'newest' ? b.startTime - a.startTime : a.startTime - b.startTime;
    });

    displayRecords(filteredRecords);
}

function displayRecords(records) {
    recordsListEl.innerHTML = '';

    if (records.length === 0) {
        recordsListEl.innerHTML = '<div class="no-records">No records found.</div>';
        return;
    }

    records.forEach(record => {
        const item = document.createElement('div');
        item.className = 'record-item';

        const checkboxContainer = document.createElement('label');
        checkboxContainer.className = 'checkbox-container';
        checkboxContainer.innerHTML = `
            <input type="checkbox" class="record-checkbox" data-id="${record.id}">
            <span class="checkmark"></span>
        `;

        const info = document.createElement('div');
        info.className = 'record-info';

        const reason = document.createElement('div');
        reason.className = 'record-reason';
        reason.textContent = record.reason;

        const meta = document.createElement('div');
        meta.className = 'record-meta';
        meta.textContent = `${record.timestamp} • Duration: ${formatDuration(record.duration)}`;

        info.appendChild(reason);
        info.appendChild(meta);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-record-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.onclick = () => handleDeleteRecord(record.id);

        item.appendChild(checkboxContainer);
        item.appendChild(info);
        item.appendChild(deleteBtn);

        recordsListEl.appendChild(item);
    });

    updateSelectedCount();
}

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m ${s}s`;
}

async function handleDeleteRecord(id) {
    if (confirm('Are you sure you want to delete this record?')) {
        await deleteRecord(id);
        await updateDashboard();
        await renderRecords();
    }
}

// Filter Event Listeners
searchInput.addEventListener('input', applyFilters);
sortSelect.addEventListener('change', applyFilters);
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    applyFilters();
});

// Batch Selection
selectAllCheckbox.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.record-checkbox');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
    updateSelectedCount();
});

recordsListEl.addEventListener('change', (e) => {
    if (e.target.classList.contains('record-checkbox')) {
        updateSelectedCount();
    }
});

function updateSelectedCount() {
    const selected = document.querySelectorAll('.record-checkbox:checked');
    selectedCountEl.textContent = selected.length;
}

// Export and Management Logic
const exportCSVBtn = document.getElementById('export-csv');
const exportMDBtn = document.getElementById('export-md');
const exportHTMLBtn = document.getElementById('export-html');
const clearDBBtn = document.getElementById('clear-db');
const backupDBBtn = document.getElementById('backup-db');
const restoreDBBtn = document.getElementById('restore-db');
const restoreInput = document.getElementById('restore-input');
const deleteSelectedBtn = document.getElementById('delete-selected');
const exportSelectedBtn = document.getElementById('export-selected');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

// Helper to get selected records
function getSelectedRecords() {
    const selectedIds = Array.from(document.querySelectorAll('.record-checkbox:checked'))
        .map(cb => parseInt(cb.getAttribute('data-id')));
    return allRecords.filter(rec => selectedIds.includes(rec.id));
}

// Export functions
function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeCSV(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/"/g, '""');
}

function generateCSV(records) {
    const header = 'ID,Reason,Start Time,End Time,Duration (s),Timestamp\n';
    const rows = records.map(r => `${r.id},"${escapeCSV(r.reason)}",${r.startTime},${r.endTime},${r.duration},"${r.timestamp}"`).join('\n');
    return header + rows;
}

function generateMD(records) {
    let md = '# Downtime Tracker Records\n\n';
    md += '| ID | Reason | Duration | Timestamp |\n';
    md += '|---|---|---|---|\n';
    records.forEach(r => {
        // MD pipes need escaping if they are in the reason
        const escapedReason = r.reason.replace(/\|/g, '\\|');
        md += `| ${r.id} | ${escapedReason} | ${formatDuration(r.duration)} | ${r.timestamp} |\n`;
    });
    return md;
}

function generateHTML(records) {
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Downtime Records</title>
        <style>
            table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { font-family: sans-serif; }
        </style>
    </head>
    <body>
        <h1>Downtime Tracker Records</h1>
        <table>
            <thead>
                <tr><th>Reason</th><th>Duration</th><th>Timestamp</th></tr>
            </thead>
            <tbody>`;

    records.forEach(r => {
        html += `<tr><td>${escapeHTML(r.reason)}</td><td>${formatDuration(r.duration)}</td><td>${r.timestamp}</td></tr>`;
    });

    html += `</tbody></table></body></html>`;
    return html;
}

async function backupDatabase() {
    const records = await getAllRecords();
    const reasons = await getAllCustomReasons();
    const data = {
        records,
        reasons,
        exportDate: new Date().toISOString(),
        version: DB_VERSION
    };
    downloadFile(JSON.stringify(data, null, 2), `downtime_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
}

async function restoreDatabase(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.records || !data.reasons) {
                throw new Error('Invalid backup file format');
            }

            if (confirm(`Restore ${data.records.length} records and ${data.reasons.length} custom reasons? This will append to your current database.`)) {
                const recordTransaction = db.transaction([STORE_NAME], 'readwrite');
                const recordStore = recordTransaction.objectStore(STORE_NAME);
                data.records.forEach(r => {
                    delete r.id; // Let auto-increment handle it
                    recordStore.add(r);
                });

                const reasonTransaction = db.transaction([REASONS_STORE], 'readwrite');
                const reasonStore = reasonTransaction.objectStore(REASONS_STORE);
                data.reasons.forEach(r => {
                    reasonStore.put(r);
                });

                await Promise.all([
                    new Promise(r => recordTransaction.oncomplete = r),
                    new Promise(r => reasonTransaction.oncomplete = r)
                ]);

                alert('Database restored successfully!');
                location.reload(); // Easiest way to refresh all UI
            }
        } catch (err) {
            console.error('Restore error:', err);
            alert('Failed to restore database: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// Event Listeners for Export
exportCSVBtn.addEventListener('click', () => {
    if (allRecords.length === 0) return alert('No records to export');
    downloadFile(generateCSV(allRecords), 'downtime_records.csv', 'text/csv');
});

exportMDBtn.addEventListener('click', () => {
    if (allRecords.length === 0) return alert('No records to export');
    downloadFile(generateMD(allRecords), 'downtime_records.md', 'text/markdown');
});

exportHTMLBtn.addEventListener('click', () => {
    if (allRecords.length === 0) return alert('No records to export');
    downloadFile(generateHTML(allRecords), 'downtime_records.html', 'text/html');
});

exportSelectedBtn.addEventListener('click', () => {
    const selected = getSelectedRecords();
    if (selected.length === 0) return alert('Please select records to export');
    // Default to CSV for batch selection export
    downloadFile(generateCSV(selected), 'selected_downtime_records.csv', 'text/csv');
});

// Management Event Listeners
backupDBBtn.addEventListener('click', backupDatabase);
restoreDBBtn.addEventListener('click', () => restoreInput.click());
restoreInput.addEventListener('change', restoreDatabase);

clearDBBtn.addEventListener('click', async () => {
    if (confirm('CRITICAL: Are you sure you want to delete the entire database? This cannot be undone.')) {
        await clearDatabase();
        await updateDashboard();
        await renderRecords();
    }
});

deleteSelectedBtn.addEventListener('click', async () => {
    const selected = document.querySelectorAll('.record-checkbox:checked');
    if (selected.length === 0) return alert('Please select records to delete');

    if (confirm(`Are you sure you want to delete ${selected.length} records?`)) {
        for (const cb of selected) {
            await deleteRecord(parseInt(cb.getAttribute('data-id')));
        }
        await updateDashboard();
        await renderRecords();
        selectAllCheckbox.checked = false;
    }
});

// Theme Toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    themeIcon.textContent = isDarkMode ? '☀️' : '🌙';
});

// Make handleDeleteRecord global for onclick
window.handleDeleteRecord = handleDeleteRecord;
