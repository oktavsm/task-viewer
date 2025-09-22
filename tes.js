// script.js (Versi dengan Sub-tugas & Deep Dive)

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

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

// --- Inisialisasi & Logika Kunci API (Tetap Sama) ---
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

// --- MAIN LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    checkAndAskForKey();

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    
    // --- FUNGSI-FUNGSI AI ---

    // Fungsi utama, tidak berubah
    async function getStructuredTaskFromAI(text) {
        // ... (Isi fungsi ini sama persis seperti di jawaban sebelumnya)
        // Cek dulu apakah model sudah siap
        if (!model) {
            alert("Model AI belum siap. Pastikan API Key sudah benar.");
            return null;
        }
        
        // Buat prompt untuk AI
        const offsetMinutes = new Date().getTimezoneOffset();
        const offsetHours = -offsetMinutes / 60;
        const timezoneString = `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
        
        const prompt = `
            Anda adalah asisten cerdas... (Isi prompt utama yang sudah timezone-aware)
            ...
            Input: "${text}"
            Output:
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            
            const match = responseText.match(/\{[\s\S]*\}/);

            if (match) {
                return JSON.parse(match[0]);
            } else {
                throw new Error("Tidak ada JSON valid yang ditemukan di jawaban AI.");
            }
        } catch (error) {
            console.error("Error dari AI API (Main Task):", error);
            alert("Gagal memproses tugas utama. Cek console (F12).");
            return null;
        }
    }

    // [BARU] Fungsi untuk membuat sub-tugas
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

    // --- Event Listener Form (Di-upgrade untuk memanggil sub-tugas) ---
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

        // ... sisa kode untuk memformat deadline dan subject (SAMA SEPERTI SEBELUMNYA) ...
        let deadlineFormatted = null; // ...
        let subjectKey = 'lainnya'; // ...
        
        const newTask = {
            id: Date.now(),
            text: structuredTask.taskName,
            subject: { key: subjectKey, name: structuredTask.subject },
            deadline: deadlineFormatted,
            completed: false,
            subtasks: subtasks // Tambahkan data sub-tugas
        };

        tasks.unshift(newTask);
        taskInput.value = '';
        saveTasks();
        renderTasks();

        submitButton.disabled = false;
        submitButton.textContent = 'Tambah';
    });

    // --- Render Function (Di-upgrade untuk menampilkan sub-tugas & tombol baru) ---
    function renderTasks() {
        taskList.innerHTML = '';
        // ... (kode jika tasks kosong tetap sama) ...
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            // ... (kode lainnya tetap sama) ...
            
            // [BARU] Membuat HTML untuk sub-tugas
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

            li.innerHTML = `
                <div class="task-content">
                    <div class="task-text-content">${task.text}</div>
                    <div class="task-info">
                        <span class="task-subject subject-${task.subject.key}">${task.subject.name}</span>
                        ${task.deadline ? `<span> | Deadline: ${task.deadline}</span>` : ''}
                    </div>
                    ${subtasksHTML}
                </div>
                <div class="task-actions">
                    <button class="deep-dive-btn" data-task-text="${task.text}">🪄</button>
                    <button class="delete-btn">🗑️</button>
                </div>
            `;
            taskList.appendChild(li);
        });
    }

    // --- Event Listener List (Di-upgrade untuk menghandle aksi baru) ---
    taskList.addEventListener('click', (e) => {
        const target = e.target;
        const taskLi = target.closest('.task-item');
        if (!taskLi) return;
        const taskId = parseInt(taskLi.getAttribute('data-id'));

        // Aksi Hapus & Tandai Selesai (Utama)
        if (target.matches('.delete-btn')) {
            // ... (logika hapus sama seperti sebelumnya) ...
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
        }
    });
    
    closeDeepDiveBtn.addEventListener('click', () => {
        deepDiveModal.classList.remove('show');
    });

    // (Sisa kode seperti saveTasks dan renderTasks awal sama)
});