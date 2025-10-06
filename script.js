// script.js (Versi Inti + Organisator Cerdas)

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

let ai, model, userApiKey;

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

// --- Inisialisasi & Logika Kunci API ---
function initializeAI(apiKey) {
    ai = new GoogleGenerativeAI(apiKey);
    model = ai.getGenerativeModel({ model: "gemini-pro" });
}
function checkAndAskForKey() {
    userApiKey = localStorage.getItem('gemini_api_key');
    if (!userApiKey) { apiKeyModal.classList.add('show'); } 
    else { initializeAI(userApiKey); }
}
saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        apiKeyModal.classList.remove('show');
        checkAndAskForKey();
    } else { alert('Kunci API tidak boleh kosong!'); }
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
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    function getSubjectInfo(subjectName) {
        const subjects = { 'aps': 'Analisis Perancangan Sistem', 'imk': 'Interaksi Manusia dan Komputer', 'ai': 'Kecerdasan Artifisial', 'asd': 'Algoritma Struktur Data', 'metnum': 'Metode Numerik', 'jarkom': 'Jaringan Komputer', 'bindo': 'Bahasa Indonesia' };
        for (const key in subjects) { if (subjects[key] === subjectName) return { key, name: subjectName }; }
        return { key: 'lainnya', name: subjectName || 'Lainnya' };
    }

    // --- Fungsi Inti AI (di-upgrade) ---
    async function getStructuredTaskFromAI(text) {
        if (!model) { alert("Model AI belum siap."); return null; }
        const offsetMinutes = new Date().getTimezoneOffset();
        const offsetHours = -offsetMinutes / 60;
        const timezoneString = `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
        
        const prompt = `
            Anda adalah asisten cerdas yang mengubah kalimat tugas menjadi data JSON.
            Daftar mata kuliah valid: Analisis Perancangan Sistem, Interaksi Manusia dan Komputer, Kecerdasan Artifisial, Algoritma Struktur Data, Bahasa Indonesia, Metode Numerik, Jaringan Komputer.
            
            PENTING: Pengguna ada di zona waktu ${timezoneString}.
            Tugas Anda:
            1. Ekstrak nama tugas (taskName).
            2. Identifikasi mata kuliah (subject). Jika tidak ada, gunakan "Lainnya".
            3. Tentukan deadline, lalu konversi ke ISO 8601 UTC ('Z').
            4. Tentukan prioritas ('Kritis', 'Penting', 'Biasa') berdasarkan kata kunci (ujian, kuis, dadakan = Kritis) dan kedekatan deadline.
            5. Ekstrak 1-2 kata kunci sebagai tag (array of strings).
            6. Kembalikan HANYA objek JSON dengan struktur: {"taskName": string, "subject": string, "deadlineISO": string|null, "priority": string, "tags": string[]}.

            Contoh (pengguna di ${timezoneString}):
            Input: "kuis dadakan jarkom besok pagi jam 8"
            Output: {"taskName": "Kuis dadakan", "subject": "Jaringan Komputer", "deadlineISO": "...", "priority": "Kritis", "tags": ["kuis", "dadakan"]}
            
            Proses input ini:
            Input: "${text}"
            Output:
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
            throw new Error("Tidak ada JSON valid dari AI.");
        } catch (error) {
            console.error("Error dari AI API:", error);
            alert("Gagal memproses tugas dengan AI. Cek console (F12).");
            return null;
        }
    }

    // --- Render Function (di-upgrade) ---
    function renderTasks() {
        taskList.innerHTML = '';
        if (tasks.length === 0) {
            taskList.innerHTML = `<p style="text-align:center; color:var(--subtle-text-color);">Belum ada tugas, santai dulu~ 🌴</p>`;
            return;
        }
        tasks.forEach(task => {
            const li = document.createElement('li');
            const priority = task.priority || 'Biasa';
            li.className = `task-item priority-${priority.toLowerCase()} ${task.completed ? 'completed' : ''}`;
            li.setAttribute('data-id', task.id);

            let tagsHTML = '';
            if (task.tags && task.tags.length > 0) {
                tagsHTML = `<div class="task-tags">${task.tags.map(tag => `<span class="task-tag">#${tag}</span>`).join('')}</div>`;
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
                </div>
                <button class="delete-btn">🗑️</button>
            `;
            taskList.appendChild(li);
        });
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
        if (!structuredTask) {
            submitButton.disabled = false;
            submitButton.textContent = 'Tambah';
            return;
        }
        let deadlineFormatted = null;
        if (structuredTask.deadlineISO) {
            const deadlineDate = new Date(structuredTask.deadlineISO);
            deadlineFormatted = deadlineDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
        }
        
        const newTask = {
            id: Date.now(),
            text: structuredTask.taskName,
            subject: structuredTask.subject || 'Lainnya',
            deadline: deadlineFormatted,
            completed: false,
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

    taskList.addEventListener('click', (e) => {
        const taskLi = e.target.closest('.task-item');
        if (!taskLi) return;
        const taskId = parseInt(taskLi.getAttribute('data-id'));
        
        if (e.target.matches('.delete-btn')) {
            tasks = tasks.filter(task => task.id !== taskId);
        } else {
            const taskToUpdate = tasks.find(t => t.id === taskId);
            if (taskToUpdate) {
                taskToUpdate.completed = !taskToUpdate.completed;
            }
        }
        saveTasks();
        renderTasks();
    });
    renderTasks();
});