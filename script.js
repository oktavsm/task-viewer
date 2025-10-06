// script.js (Versi Reset - Hanya Fitur Inti)

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
    model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
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

    // --- Fungsi Inti AI ---
    async function getStructuredTaskFromAI(text) {
        if (!model) {
            alert("Model AI belum siap. Pastikan API Key sudah benar.");
            return null;
        }
        
        const offsetMinutes = new Date().getTimezoneOffset();
        const offsetHours = -offsetMinutes / 60;
        const timezoneString = `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
        
        const prompt = `
            Anda adalah asisten cerdas yang mengubah kalimat tugas menjadi data JSON.
            Daftar mata kuliah yang valid: Analisis Perancangan Sistem, Interaksi Manusia dan Komputer, Kecerdasan Artifisial, Algoritma Struktur Data, Bahasa Indonesia, Metode Numerik, Jaringan Komputer.
            
            PENTING: Pengguna ada di zona waktu ${timezoneString}. Semua input waktu harus diinterpretasikan dalam zona waktu ini.

            Tugas Anda:
            1. Ekstrak nama tugasnya (taskName).
            2. Identifikasi mata kuliahnya (subject) dari daftar valid. Jika tidak ada, gunakan "Lainnya".
            3. Tentukan tanggal dan waktu deadline-nya, lalu konversi ke format ISO 8601 UTC ('Z').
            4. Kembalikan HANYA sebuah objek JSON valid dengan struktur: {"taskName": string, "subject": string, "deadlineISO": string|null}. Jangan beri penjelasan apapun.

            Contoh (pengguna di ${timezoneString}):
            Input: "laprak jarkom bab 3 buat besok jam 10 malem"
            Output: {"taskName": "Laporan Praktikum Jarkom Bab 3", "subject": "Jaringan Komputer", "deadlineISO": "..."}
            
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

    // --- Render Function ---
    function renderTasks() {
        taskList.innerHTML = '';
        if (tasks.length === 0) {
            taskList.innerHTML = `<p style="text-align:center; color:var(--subtle-text-color);">Belum ada tugas, santai dulu~ 🌴</p>`;
            return;
        }
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.setAttribute('data-id', task.id);

            li.innerHTML = `
                <div class="task-content">
                    <div class="task-text-content">${task.text}</div>
                    <div class="task-info">
                        <span class="task-subject">${task.subject}</span>
                        ${task.deadline ? `<span> | Deadline: ${task.deadline}</span>` : ''}
                    </div>
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
            deadlineFormatted = deadlineDate.toLocaleDateString('id-ID', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
            }).replace(/\./g, ':');
        }
        
        const newTask = {
            id: Date.now(),
            text: structuredTask.taskName,
            subject: structuredTask.subject || 'Lainnya',
            deadline: deadlineFormatted,
            completed: false
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