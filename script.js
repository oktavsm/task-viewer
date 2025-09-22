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

// Modal API Key
const apiKeyModal = document.getElementById('apiKeyModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');

// [BARU] Modal Deep Dive
const deepDiveModal = document.getElementById('deepDiveModal');
const deepDiveTitle = document.getElementById('deepDiveTitle');
const deepDiveResult = document.getElementById('deepDiveResult');
const closeDeepDiveBtn = document.getElementById('closeDeepDiveBtn');

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
            3. Identifikasi mata kuliahnya (subject) dari daftar yang valid. Jika tidak ada, temukan kunci yang sesuai misal "Lifestyle", "Kesehatan" dll.
            4. Tentukan tingkat prioritasnya ('Kritis', 'Penting', 'Biasa') berdasarkan kata kunci (e.g., ujian, kuis, dadakan = Kritis; tugas, laporan = Penting; cicil, baca = Biasa) dan kedekatan deadline.
            5. Ekstrak 1-2 kata kunci sebagai tag (dalam bentuk array of strings).
            6. Tentukan tanggal dan waktu deadline berdasarkan input pengguna dan zona waktu mereka (${timezoneString}).
            7. Konversikan tanggal dan waktu deadline tersebut ke format ISO 8601 string yang sepenuhnya sudah disesuaikan ke UTC (berakhir dengan 'Z').
            8. Kembalikan HANYA sebuah objek JSON valid dengan struktur: {"taskName": string, "subject": string, "deadlineISO": string|null, "priority": string, "tags": string[]}. Jawabanmu harus selalu diawali dengan { dan diakhiri dengan }.Jangan tulis penjelasan apapun.

            Contoh:
            Contoh (dengan asumsi pengguna di ${timezoneString}):
            AI harus berpikir: "10 malam di ${timezoneString} adalah jam ${22 - offsetHours}:00 UTC".
            Input: "kayaknya ada laprak jarkom bab 3 buat besok jam 10 malem deh"
            Output: {"taskName": "Laporan Praktikum Bab 3", "subject": "Jaringan Komputer", "deadlineISO": "YYYY-MM-DDTHH:${22 - offsetHours}:00:00.000Z", "priority": "Penting", "tags": ["laprak", "jarkom"]} // (Tanggal disesuaikan)
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
    async function generateSubtasks(taskName) {
        if (!model) return []; // Jangan lakukan apa-apa jika model belum siap
        const prompt = `
            Kamu adalah seorang manajer proyek yang ahli. Berdasarkan tugas utama ini: "${taskName}", pecahlah menjadi 3 sampai 5 sub-tugas yang logis, singkat, dan bisa dikerjakan.
            Kembalikan hasilnya dalam format JSON array of strings.
            Contoh:
            Input: "Buat presentasi IMK tentang 10 Usability Heuristics"
            Output: ["Riset 10 Usability Heuristics", "Cari studi kasus untuk tiap heuristic", "Buat outline presentasi", "Desain slide", "Latihan presentasi"]

            Input: "${taskName}"
            Output:
        `;
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            const match = responseText.match(/\[[\s\S]*\]/);
            if (match) {
                return JSON.parse(match[0]);
            }
            return [];
        } catch (error) {
            console.error("Gagal membuat sub-tugas:", error);
            return []; // Kembalikan array kosong jika gagal
        }
    }

    // [BARU] Fungsi untuk "Deep Dive"
    async function getDeepDiveInfo(taskName) {
        if (!model) return null;
        deepDiveTitle.textContent = `Menganalisis "${taskName}"...`;
        deepDiveResult.innerHTML = `<p>Sedang bertanya pada AI...</p>`;
        deepDiveModal.classList.add('show');

        const prompt = `
            Jelaskan secara singkat dalam satu atau dua kalimat, seolah untuk mahasiswa, topik akademis berikut: "${taskName}".
            Kemudian, berikan 3-5 kata kunci (keywords) yang relevan untuk melakukan riset online tentang topik ini.
            Kembalikan hasilnya dalam format JSON: {"summary": "...", "keywords": ["...", "..."]}.
            Jangan tulis penjelasan apapun, hanya JSON.
        `;
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) {
                const data = JSON.parse(match[0]);
                deepDiveTitle.textContent = `Hasil Deep Dive: ${taskName}`;
                deepDiveResult.innerHTML = `
                    <h3>Ringkasan Topik</h3>
                    <p>${data.summary}</p>
                    <h3>Kata Kunci Riset</h3>
                    <ul>
                        ${data.keywords.map(kw => `<li>${kw}</li>`).join('')}
                    </ul>
                `;
            } else {
                throw new Error("Jawaban AI tidak valid.");
            }
        } catch (error) {
            deepDiveResult.innerHTML = `<p>Maaf, terjadi kesalahan saat melakukan deep dive.</p>`;
            console.error("Gagal melakukan deep dive:", error);
        }
    }

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawText = taskInput.value.trim();
        if (rawText === '') return;
        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';
        const structuredTask = await getStructuredTaskFromAI(rawText);
        if (!structuredTask) { // Jika tugas utama gagal, hentikan
            submitButton.disabled = false;
            submitButton.textContent = 'Tambah';
            return;
        }
        submitButton.textContent = 'Membuat sub-tugas...';
        const subtaskStrings = await generateSubtasks(structuredTask.taskName);
        const subtasks = subtaskStrings.map(st => ({ text: st, completed: false }));
        submitButton.disabled = false;
        submitButton.textContent = 'Tambah';

        let deadlineFormatted = null;
        if (structuredTask.deadlineISO) {
            const deadlineDate = new Date(structuredTask.deadlineISO);
            deadlineFormatted = deadlineDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
        }
        const subjectInfo = getSubjectInfo(structuredTask.subject);
        const newTask = {
            id: Date.now(),
            text: structuredTask.taskName,
            subject: { key: subjectInfo.key, name: subjectInfo.name },
            deadline: deadlineFormatted,
            completed: false,
            subtasks: subtasks,
            priority: structuredTask.priority || 'Biasa', // Fallback jika AI tidak memberi prioritas
            tags: structuredTask.tags || [] // Fallback jika AI tidak memberi tag
        };
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

            // KODE BARU (Anti-Error):
            const priority = task.priority || 'Biasa'; // Kasih nilai default 'Biasa' jika prioritas tidak ada
            const priorityClass = `priority-${priority.toLowerCase()}`;
            li.className = `task-item ${priorityClass}`;
            if (task.completed) li.classList.add('completed');
            li.setAttribute('data-id', task.id);
            const subjectClass = `subject-${task.subject.key}`;


            let subtasksHTML = '';
            if (task.subtasks && task.subtasks.length > 0) {
                subtasksHTML = '<ul class="subtask-list">';
                task.subtasks.forEach((subtask, index) => {
                    subtasksHTML += `
                        <li class="subtask-item">
                            <input type="checkbox" class="subtask-checkbox" data-task-id="${task.id}" data-subtask-index="${index}" ${subtask.completed ? 'checked' : ''}>
                            <label class="subtask-label ${subtask.completed ? 'completed' : ''}">${subtask.text}</label>
                        </li>
                    `;
                });
                subtasksHTML += '</ul>';
            }
            let tagsHTML = '';
            if (task.tags && task.tags.length > 0) {
                tagsHTML = '<div class="task-tags">';
                task.tags.forEach(tag => {
                    tagsHTML += `<span class="task-tag">#${tag}</span>`;
                });
                tagsHTML += '</div>';
            }

            // Di dalam fungsi renderTasks()

            li.innerHTML = `
                <div class="task-content">
                    <div class="task-text-content">${task.text}</div>
                    <div class="task-info">
                        <span class="task-subject subject-${task.subject.key}">${task.subject.name}</span>
                        ${task.deadline ? `<span> | Deadline: ${task.deadline}</span>` : ''}
                    </div>
                    ${tagsHTML} ${subtasksHTML}
                </div>
                <div class="task-actions">
                    <button class="deep-dive-btn" data-task-text="${task.text}">🪄</button>
                    <button class="delete-btn">🗑️</button>
                </div>
            `;
            taskList.appendChild(li);
        });
    }


    function saveTasks() { localStorage.setItem('tasks', JSON.stringify(tasks)); }
    taskList.addEventListener('click', (e) => {
        const target = e.target;
        const taskLi = target.closest('.task-item');
        if (!taskLi) return;
        const taskId = parseInt(taskLi.getAttribute('data-id'));

        if (target.matches('.delete-btn')) {
            tasks = tasks.filter(task => task.id !== taskId);
            saveTasks();
            renderTasks();
        } else if (target.matches('.deep-dive-btn')) {
            const taskText = target.getAttribute('data-task-text');
            getDeepDiveInfo(taskText);
        } else if (target.matches('.subtask-checkbox')) {
            const subtaskIndex = parseInt(target.getAttribute('data-subtask-index'));
            const taskToUpdate = tasks.find(t => t.id === taskId);
            if (taskToUpdate) {
                taskToUpdate.subtasks[subtaskIndex].completed = !taskToUpdate.subtasks[subtaskIndex].completed;
                saveTasks();
                renderTasks();
            }
        } else {
            // ... (logika tandai selesai tugas utama sama seperti sebelumnya) ...
            tasks = tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task);
            saveTasks();
            renderTasks();
        }


    });
    function getSubjectInfo(subjectName) {
        const subjects = { 'aps': 'Analisis Perancangan Sistem', 'imk': 'Interaksi Manusia Komputer', 'ai': 'Kecerdasan Artifisial', 'asd': 'Algoritma Struktur Data', 'metnum': 'Metode Numerik', 'jarkom': 'Jaringan Komputer', 'bindo': 'Bahasa Indonesia' };

        for (const key in subjects) {
            if (subjects[key] === subjectName) {
                return { key: key, name: subjectName };
            }
        }
        return { key: 'lainnya', name: 'Lainnya' };
    }
    closeDeepDiveBtn.addEventListener('click', () => {
        deepDiveModal.classList.remove('show');
    });
    renderTasks();
});