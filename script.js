// script.js (Versi Final Gabungan Semua Fitur)

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// --- Variabel Global ---
let ai;
let model;
let userApiKey;

// --- DOM Elements ---
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const submitButton = taskForm.querySelector('button[type="submit"]');
const apiKeyModal = document.getElementById('apiKeyModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const deepDiveModal = document.getElementById('deepDiveModal');
const deepDiveTitle = document.getElementById('deepDiveTitle');
const deepDiveResult = document.getElementById('deepDiveResult');
const closeDeepDiveBtn = document.getElementById('closeDeepDiveBtn');

// --- Fungsi Inisialisasi & Logika Kunci API ---
function initializeAI(apiKey) {
    ai = new GoogleGenerativeAI(apiKey);
    model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
}

function checkAndAskForKey() {
    userApiKey = localStorage.getItem('gemini_api_key');
    if (!userApiKey) {
        apiKeyModal.classList.add('show');
    } else {
        initializeAI(userApiKey);
    }
}

saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        apiKeyModal.classList.remove('show');
        checkAndAskForKey();
    } else {
        alert('Kunci API tidak boleh kosong!');
    }
});

closeDeepDiveBtn.addEventListener('click', () => {
    deepDiveModal.classList.remove('show');
});

// --- MAIN LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    checkAndAskForKey();

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // --- Fungsi Pembantu (Helpers) ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        } else {
            body.classList.remove('dark-mode');
            themeToggle.textContent = '🌙';
        }
    }
    
    function updateTabTitle() {
        const now = new Date();
        now.setHours(0, 0, 0, 0); 
        const urgentTaskCount = tasks.filter(task => {
            if (!task.deadlineISO || task.completed) return false;
            const deadlineDate = new Date(task.deadlineISO);
            deadlineDate.setHours(0, 0, 0, 0);
            return deadlineDate <= now;
        }).length;
        if (urgentTaskCount > 0) {
            document.title = `(${urgentTaskCount}) Catatan Tugasku`;
        } else {
            document.title = 'Catatan Tugasku';
        }
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        updateTabTitle();
    }

    function getSubjectInfo(subjectName) {
        const subjects = { 'aps': 'Analisis Perancangan Sistem', 'imk': 'Interaksi Manusia Komputer', 'ai': 'Kecerdasan Artifisial', 'asd': 'Algoritma Struktur Data', 'metnum': 'Metode Numerik', 'jarkom': 'Jaringan Komputer', 'bindo': 'Bahasa Indonesia' };
        for (const key in subjects) {
            if (subjects[key] === subjectName) {
                return { key: key, name: subjectName };
            }
        }
        return { key: 'lainnya', name: subjectName || 'Lainnya' };
    }
    
    function generateGoogleCalendarLink(task) {
        if (!task.deadlineISO) return '#';
        const deadlineDate = new Date(task.deadlineISO);
        // Buat acara berlangsung selama 1 jam, berakhir tepat di deadline
        const startDate = new Date(deadlineDate.getTime() - 60 * 60 * 1000);
        const formatDateForGoogle = (date) => date.toISOString().replace(/-|:|\.\d{3}/g, '');
        const title = encodeURIComponent(task.text);
        const details = encodeURIComponent(`Tugas untuk mata kuliah: ${task.subject.name}\n\nSub-tugas:\n${(task.subtasks || []).map(st => `- ${st.text}`).join('\n')}`);
        return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatDateForGoogle(startDate)}/${formatDateForGoogle(deadlineDate)}&details=${details}`;
    }

    // --- Fungsi-Fungsi AI ---
    async function getStructuredTaskFromAI(text) {
        if (!model) { alert("Model AI belum siap."); return null; }
        const offsetMinutes = new Date().getTimezoneOffset();
        const offsetHours = -offsetMinutes / 60;
        const timezoneString = `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
        const prompt = `Anda adalah asisten akademik... (Isi prompt lengkap sama seperti sebelumnya)... Input: "${text}" Output:`;
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
            throw new Error("Tidak ada JSON valid di jawaban AI.");
        } catch (error) {
            console.error("Error dari AI API (Main Task):", error);
            alert("Gagal memproses tugas utama. Cek console (F12).");
            return null;
        }
    }

    async function generateSubtasks(taskName) {
        if (!model) return [];
        const prompt = `Kamu adalah manajer proyek ahli... (Isi prompt sub-tugas sama seperti sebelumnya)... Input: "${taskName}" Output:`;
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            const match = responseText.match(/\[[\s\S]*\]/);
            if (match) return JSON.parse(match[0]);
            return [];
        } catch (error) {
            console.error("Gagal membuat sub-tugas:", error);
            return [];
        }
    }

    async function getDeepDiveInfo(taskName) {
        if (!model) return null;
        deepDiveTitle.textContent = `Menganalisis "${taskName}"...`;
        deepDiveResult.innerHTML = `<p>Sedang bertanya pada AI...</p>`;
        deepDiveModal.classList.add('show');
        const prompt = `Jelaskan secara singkat... (Isi prompt deep dive sama seperti sebelumnya)...`;
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) {
                const data = JSON.parse(match[0]);
                deepDiveTitle.textContent = `Hasil Deep Dive: ${taskName}`;
                deepDiveResult.innerHTML = `<h3>Ringkasan Topik</h3><p>${data.summary}</p><h3>Kata Kunci Riset</h3><ul>${data.keywords.map(kw => `<li>${kw}</li>`).join('')}</ul>`;
            } else {
                throw new Error("Jawaban AI tidak valid.");
            }
        } catch (error) {
            deepDiveResult.innerHTML = `<p>Maaf, terjadi kesalahan.</p>`;
            console.error("Gagal melakukan deep dive:", error);
        }
    }

    // --- Render Function ---
    function renderTasks() {
        taskList.innerHTML = '';
        if (tasks.length === 0) { taskList.innerHTML = `<p style="text-align:center; color:var(--subtle-text-color);">Belum ada tugas, santai dulu~ 🌴</p>`; return; }
        tasks.forEach(task => {
            const li = document.createElement('li');
            const priority = task.priority || 'Biasa';
            const priorityClass = `priority-${priority.toLowerCase()}`;
            li.className = `task-item ${priorityClass} ${task.completed ? 'completed' : ''}`;
            li.setAttribute('data-id', task.id);

            let subtasksHTML = '';
            if (task.subtasks && task.subtasks.length > 0) {
                subtasksHTML = `<ul class="subtask-list">${task.subtasks.map((subtask, index) => `
                    <li class="subtask-item">
                        <input type="checkbox" class="subtask-checkbox" data-subtask-index="${index}" ${subtask.completed ? 'checked' : ''}>
                        <label class="subtask-label ${subtask.completed ? 'completed' : ''}">${subtask.text}</label>
                    </li>`).join('')}</ul>`;
            }

            let tagsHTML = '';
            if (task.tags && task.tags.length > 0) {
                tagsHTML = `<div class="task-tags">${task.tags.map(tag => `<span class="task-tag">#${tag}</span>`).join('')}</div>`;
            }
            
            let calendarButtonHTML = '';
            if (task.deadlineISO) {
                const calendarLink = generateGoogleCalendarLink(task);
                calendarButtonHTML = `<a href="${calendarLink}" target="_blank" class="add-to-calendar-btn" title="Tambah ke Kalender">🗓️</a>`;
            }
            
            const subjectInfo = getSubjectInfo(task.subject);

            li.innerHTML = `
                <div class="task-content">
                    <div class="task-text-content">${task.text}</div>
                    <div class="task-info">
                        <span class="task-subject subject-${subjectInfo.key}">${subjectInfo.name}</span>
                        ${task.deadline ? `<span> | Deadline: ${task.deadline}</span>` : ''}
                    </div>
                    ${tagsHTML}
                    ${subtasksHTML}
                </div>
                <div class="task-actions">
                    ${calendarButtonHTML}
                    <button class="deep-dive-btn">🪄</button>
                    <button class="delete-btn">🗑️</button>
                </div>
            `;
            taskList.appendChild(li);
        });
        updateTabTitle();
    }

    // --- Event Listeners ---
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    themeToggle.addEventListener('click', () => {
        const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawText = taskInput.value.trim();
        if (rawText === '') return;
        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';
        const structuredTask = await getStructuredTaskFromAI(rawText);
        if (!structuredTask) { submitButton.disabled = false; submitButton.textContent = 'Tambah'; return; }
        submitButton.textContent = 'Membuat sub-tugas...';
        const subtaskStrings = await generateSubtasks(structuredTask.taskName);
        let deadlineFormatted = null;
        if (structuredTask.deadlineISO) {
            const deadlineDate = new Date(structuredTask.deadlineISO);
            deadlineFormatted = deadlineDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
        }
        const newTask = {
            id: Date.now(),
            text: structuredTask.taskName,
            subject: structuredTask.subject,
            deadline: deadlineFormatted,
            deadlineISO: structuredTask.deadlineISO,
            completed: false,
            subtasks: subtaskStrings.map(st => ({ text: st, completed: false })),
            priority: structuredTask.priority || 'Biasa',
            tags: structuredTask.tags || []
        };
        tasks.unshift(newTask);
        taskInput.value = '';
        saveTasks();
        renderTasks();
        submitButton.disabled = false;
        submitButton.textContent = 'Tambah';
    });

    taskList.addEventListener('click', (e) => {
        const target = e.target;
        const taskLi = target.closest('.task-item');
        if (!taskLi) return;
        const taskId = parseInt(taskLi.getAttribute('data-id'));
        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (!taskToUpdate) return;

        if (target.matches('.delete-btn')) {
            tasks = tasks.filter(task => task.id !== taskId);
        } else if (target.matches('.deep-dive-btn')) {
            getDeepDiveInfo(taskToUpdate.text);
        } else if (target.matches('.subtask-checkbox')) {
            const subtaskIndex = parseInt(target.getAttribute('data-subtask-index'));
            taskToUpdate.subtasks[subtaskIndex].completed = !taskToUpdate.subtasks[subtaskIndex].completed;
        } else if (!target.matches('a, a *')) { // Jangan tandai selesai jika klik link
            taskToUpdate.completed = !taskToUpdate.completed;
        }
        saveTasks();
        renderTasks();
    });

    renderTasks();
});