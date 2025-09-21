// script.js (Versi Final dengan LocalStorage Key)

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

// Modal Elements
const apiKeyModal = document.getElementById('apiKeyModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');

// --- Fungsi Inisialisasi AI ---
function initializeAI(apiKey) {
    ai = new GoogleGenerativeAI(apiKey);
    // KODE BARU (ganti menjadi ini)
    model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
}

// --- Fungsi Pengecekan Kunci API ---
function checkAndAskForKey() {
    userApiKey = localStorage.getItem('gemini_api_key');
    if (!userApiKey) {
        apiKeyModal.classList.add('show');
    } else {
        initializeAI(userApiKey);
    }
}

// Event listener untuk tombol simpan kunci
saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        apiKeyModal.classList.remove('show');
        checkAndAskForKey(); // Cek ulang dan inisialisasi AI
    } else {
        alert('Kunci API tidak boleh kosong!');
    }
});

// --- MAIN LOGIC (yang dijalankan saat halaman dimuat) ---
document.addEventListener('DOMContentLoaded', () => {
    checkAndAskForKey(); // Cek kunci saat pertama kali halaman dibuka

    // --- Sisa kode lainnya (tema, event listener form, render, dll) ---
    // (Kode di bawah ini sama persis dengan versi sebelumnya, tidak perlu diubah)

    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        } else {
            body.classList.remove('dark-mode');
            themeToggle.textContent = '🌙';
        }
    }
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    themeToggle.addEventListener('click', () => {
        const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    async function getStructuredTaskFromAI(text) {
        if (!model) {
            alert("Model AI belum siap. Pastikan API Key sudah benar.");
            return null;
        }

         // --- LOGIKA BARU: MENDETEKSI ZONA WAKTU PENGGUNA ---
        const offsetMinutes = new Date().getTimezoneOffset();
        const offsetHours = -offsetMinutes / 60;
        // Membuat string seperti "GMT+7" atau "GMT-5"
        const timezoneString = `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
        
        // --- JURUS 1: PROMPT LEBIH TEGAS ---
        const prompt = `
            Anda adalah asisten cerdas yang tugasnya mengubah kalimat tugas kuliah acak menjadi data JSON terstruktur.
            Daftar mata kuliah yang valid adalah: Analisis Perancangan Sistem(APS atau aps), Interaksi Manusia dan Komputer(IMK atau imk), Kecerdasan Artifisial(AI atau ai), Algoritma Struktur Data(ASD atau asd), Bahasa Indonesia(Bindo atau bindo atau bind), Metode Numerik(METNUM atau metnum), Jaringan Komputer(JARKOM atau jarkom).
            
            PENTING: Pengguna saat ini berada di zona waktu ${timezoneString}. Semua input waktu dari pengguna harus diinterpretasikan dalam zona waktu ini.
            Tanggal dan waktu referensi saat ini adalah: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}.

            
            Tugas Anda:
            1. Baca kalimat input dari pengguna.
            2. Ekstrak nama tugasnya (taskName) dan rapikan pada output.
            3. Identifikasi mata kuliahnya (subject) dari daftar yang valid. Jika tidak ada, gunakan "Lainnya".
            4. Tentukan tanggal dan waktu deadline berdasarkan input pengguna dan zona waktu mereka (${timezoneString}).
            5. Konversikan tanggal dan waktu deadline tersebut ke format ISO 8601 string yang sepenuhnya sudah disesuaikan ke UTC (berakhir dengan 'Z').
            5. Kembalikan HANYA sebuah objek JSON valid. Jangan tulis penjelasan apapun. Jawabanmu harus selalu diawali dengan { dan diakhiri dengan }.

            Contoh:
            Contoh (dengan asumsi pengguna di ${timezoneString}):
            AI harus berpikir: "10 malam di ${timezoneString} adalah jam ${22 - offsetHours}:00 UTC".
            Input: "kayaknya ada laprak jarkom bab 3 buat besok jam 10 malem deh"
            Output: {"taskName": "Laporan Praktikum Bab 3", "subject": "Jaringan Komputer", "deadlineISO": "YYYY-MM-DDTHH:${22 - offsetHours}:00:00.000Z"} // (Tanggal disesuaikan)
            Sekarang, proses input berikut:
            Input: "${text}"
            Output:
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            
            // --- JURUS 2: PARSING JSON LEBIH PINTAR ---
            // Cari blok teks yang diawali { dan diakhiri }
            const match = responseText.match(/\{[\s\S]*\}/);

            if (match) {
                // Jika ketemu, baru kita parse
                return JSON.parse(match[0]);
            } else {
                // Jika tidak ada JSON sama sekali di jawaban AI
                throw new Error("Tidak ada JSON valid yang ditemukan di jawaban AI.");
            }

        } catch (error) {
            console.error("Error dari AI API atau saat parsing:", error);
            alert("Gagal memproses tugas dengan AI. Cek console (F12) untuk detail error. Jawaban dari AI mungkin tidak valid.");
            return null;
        }
    }

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawText = taskInput.value.trim();
        if (rawText === '') return;
        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';
        const structuredTask = await getStructuredTaskFromAI(rawText);
        submitButton.disabled = false;
        submitButton.textContent = 'Tambah';
        if (!structuredTask) return;
        let deadlineFormatted = null;
        if (structuredTask.deadlineISO) {
            const deadlineDate = new Date(structuredTask.deadlineISO);
            deadlineFormatted = deadlineDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
        }
        const subjects = { 'aps': 'Analisis Perancangan Sistem', 'imk': 'Interaksi Manusia Komputer', 'ai': 'Kecerdasan Artifisial', 'asd': 'Algoritma Struktur Data', 'metnum': 'Metode Numerik', 'jarkom': 'Jaringan Komputer', 'bindo': 'Bahasa Indonesia' };
        let subjectKey = 'lainnya';
        for (const key in subjects) { if (subjects[key] === structuredTask.subject) { subjectKey = key; break; } }
        const newTask = { id: Date.now(), text: structuredTask.taskName, subject: { key: subjectKey, name: structuredTask.subject }, deadline: deadlineFormatted, completed: false };
        tasks.unshift(newTask);
        taskInput.value = '';
        saveTasks();
        renderTasks();
    });

    function renderTasks() {
        taskList.innerHTML = '';
        if (tasks.length === 0) { taskList.innerHTML = `<p style="text-align:center; color:var(--subtle-text-color);">Belum ada tugas, santai dulu~ 🌴</p>`; return; }
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            if (task.completed) li.classList.add('completed');
            li.setAttribute('data-id', task.id);
            const subjectClass = `subject-${task.subject.key}`;
            li.innerHTML = `<div class="task-content"><div class="task-text-content">${task.text}</div><div class="task-info"><span class="task-subject ${subjectClass}">${task.subject.name}</span>${task.deadline ? `<span> | Deadline: ${task.deadline}</span>` : ''}</div></div><button class="delete-btn">🗑️</button>`;
            taskList.appendChild(li);
        });
    }
    function saveTasks() { localStorage.setItem('tasks', JSON.stringify(tasks)); }
    taskList.addEventListener('click', (e) => {
        const targetLi = e.target.closest('.task-item');
        if (!targetLi) return;
        const id = targetLi.getAttribute('data-id');
        if (e.target.classList.contains('delete-btn')) { tasks = tasks.filter(task => task.id != id); } else { tasks = tasks.map(task => task.id == id ? { ...task, completed: !task.completed } : task); }
        saveTasks();
        renderTasks();
    });

    renderTasks();
});