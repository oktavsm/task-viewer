// script.js (Versi dengan Alur Kerja Edit Post-Creation)

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

let ai, model, userApiKey;

// --- DOM Elements (ditambah elemen modal edit) ---
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
// ... (elemen lain yang sudah ada)
const editTaskModal = document.getElementById('editTaskModal');
const closeEditBtn = document.getElementById('closeEditBtn');
const editTaskTitle = document.getElementById('editTaskTitle');
const editDescription = document.getElementById('editDescription');
const editSubtasksList = document.getElementById('editSubtasksList');
const generateSubtasksBtn = document.getElementById('generateSubtasksBtn');
const saveChangesBtn = document.getElementById('saveChangesBtn');

// --- Inisialisasi & Logika Kunci API (Tidak berubah) ---
// ...

document.addEventListener('DOMContentLoaded', () => {
    checkAndAskForKey();
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // --- Fungsi Pembantu (Helpers - tidak banyak berubah) ---
    // ... (applyTheme, updateTabTitle, saveTasks, getSubjectInfo, generateGoogleCalendarLink) ...

    // --- Fungsi-Fungsi AI (generateSubtasks sekarang dipanggil di tempat berbeda) ---
    async function getStructuredTaskFromAI(text) { /* ... (Prompt Utama tidak berubah) ... */ }
    async function generateSubtasks(taskName, description) {
        if (!model) return [];
        let context = ``;
        if (description) { context = `\nDengan deskripsi tambahan: "${description}"`; }
        const prompt = `
            Berdasarkan tugas utama ini: "${taskName}"${context}, pecahlah menjadi 3 sampai 5 sub-tugas yang logis dan bisa dikerjakan.
            Kembalikan hasilnya dalam format JSON array of strings.
            Contoh Input: "Buat presentasi IMK"
            Contoh Output: ["Riset topik", "Buat outline", "Desain slide", "Latihan"]
            Input: "${taskName}"
            Output:`;
        try {
            // ... (sisa logika sama)
        } catch (error) { /* ... */ }
    }
    async function getDeepDiveInfo(task) { /* ... (Prompt Deep Dive tidak berubah) ... */ }

    // --- Render Function (Tidak banyak berubah) ---
    function renderTasks() { /* ... (Logika render sama seperti versi stabil terakhir) ... */ }

    // --- [BARU] Logika untuk Modal Edit ---
    function openEditModal(task) {
        editTaskModal.setAttribute('data-editing-task-id', task.id);
        editTaskTitle.textContent = `Edit Tugas: ${task.text}`;
        editDescription.value = task.description || '';
        renderSubtasksInModal(task.subtasks || []);
        editTaskModal.classList.add('show');
    }
    
    function renderSubtasksInModal(subtasks) {
        editSubtasksList.innerHTML = '';
        if (subtasks.length > 0) {
            subtasks.forEach(subtask => {
                const li = document.createElement('li');
                li.className = 'subtask-item'; // Pakai style yang sudah ada
                li.innerHTML = `
                    <input type="checkbox" ${subtask.completed ? 'checked' : ''} disabled>
                    <label class="${subtask.completed ? 'completed' : ''}">${subtask.text}</label>
                `;
                editSubtasksList.appendChild(li);
            });
        } else {
            editSubtasksList.innerHTML = `<li>Belum ada sub-tugas.</li>`;
        }
    }

    generateSubtasksBtn.addEventListener('click', async () => {
        const taskId = parseInt(editTaskModal.getAttribute('data-editing-task-id'));
        const task = tasks.find(t => t.id === taskId);
        const description = editDescription.value;
        if (!task) return;
        
        generateSubtasksBtn.textContent = 'Membuat...';
        generateSubtasksBtn.disabled = true;

        const subtaskStrings = await generateSubtasks(task.text, description);
        task.subtasks = subtaskStrings.map(st => ({ text: st, completed: false }));
        renderSubtasksInModal(task.subtasks);

        generateSubtasksBtn.textContent = 'Buat Sub-tugas dengan AI 🤖';
        generateSubtasksBtn.disabled = false;
    });

    saveChangesBtn.addEventListener('click', () => {
        const taskId = parseInt(editTaskModal.getAttribute('data-editing-task-id'));
        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (taskToUpdate) {
            taskToUpdate.description = editDescription.value.trim();
            // Sub-tugas sudah di-update saat di-generate, jadi tinggal simpan
        }
        saveTasks();
        renderTasks();
        editTaskModal.classList.remove('show');
    });

    closeEditBtn.addEventListener('click', () => editTaskModal.classList.remove('show'));


    // --- Event Listener Form (Disederhanakan) ---
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawText = taskInput.value.trim();
        if (rawText === '') return;

        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';
        
        const structuredTask = await getStructuredTaskFromAI(rawText);
        if (!structuredTask) { /* ... (handle error) ... */ return; }
        
        let deadlineFormatted = null;
        if (structuredTask.deadlineISO) { /* ... */ }
        const subjectInfo = getSubjectInfo(structuredTask.subject);
        
        const newTask = {
            id: Date.now(),
            text: structuredTask.taskName,
            description: '', // [BARU] Defaultnya kosong
            subject: subjectInfo.name,
            deadline: deadlineFormatted,
            deadlineISO: structuredTask.deadlineISO,
            completed: false,
            subtasks: [], // [BARU] Defaultnya kosong
            priority: structuredTask.priority || 'Biasa',
            tags: structuredTask.tags || []
        };

        tasks.unshift(newTask);
        saveTasks();
        renderTasks();

        taskInput.value = '';
        submitButton.disabled = false;
        submitButton.textContent = 'Tambah';
    });

    // --- Event Listener List (Di-upgrade untuk membuka modal edit) ---
    taskList.addEventListener('click', (e) => {
        const target = e.target;
        const taskLi = target.closest('.task-item');
        if (!taskLi) return;
        const taskId = parseInt(taskLi.getAttribute('data-id'));
        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (!taskToUpdate) return;

        // Cek aksi spesifik (tombol) dulu
        if (target.matches('.delete-btn') || target.closest('.delete-btn')) {
            tasks = tasks.filter(t => t.id !== taskId);
            saveTasks();
            renderTasks();
        } else if (target.matches('.deep-dive-btn') || target.closest('.deep-dive-btn')) {
            getDeepDiveInfo(taskToUpdate);
        } else if (target.matches('.subtask-checkbox')) {
            const subtaskIndex = parseInt(target.getAttribute('data-subtask-index'));
            taskToUpdate.subtasks[subtaskIndex].completed = !taskToUpdate.subtasks[subtaskIndex].completed;
            saveTasks();
            renderTasks();
        } else if (!target.closest('a')) { // Jika bukan klik link kalender
            // Jika tidak ada aksi spesifik, buka modal edit
            openEditModal(taskToUpdate);
        }
    });

    // ... (kode renderTasks awal & tema) ...
});