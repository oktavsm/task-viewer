// script.js (Versi dengan Prioritas & Tag Otomatis)

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// (Deklarasi variabel global dan DOM Elements sama persis seperti sebelumnya)
let ai, model, userApiKey;
const taskForm = document.getElementById('taskForm');
// ... dan seterusnya ...

// (Semua fungsi inisialisasi, API Key, dan tema tetap sama persis)

document.addEventListener('DOMContentLoaded', () => {
    checkAndAskForKey();
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // --- FUNGSI AI UTAMA (DI-UPGRADE) ---
    async function getStructuredTaskFromAI(text) {
        if (!model) {
            alert("Model AI belum siap. Pastikan API Key sudah benar.");
            return null;
        }
        
        const offsetMinutes = new Date().getTimezoneOffset();
        const offsetHours = -offsetMinutes / 60;
        const timezoneString = `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
        
        // [UPGRADE] Prompt di-upgrade untuk meminta prioritas dan tag
        const prompt = `
            Anda adalah asisten akademik cerdas. Tugas Anda adalah mengubah kalimat tugas kuliah menjadi data JSON terstruktur.
            Daftar mata kuliah yang valid adalah: Analisis Perancangan Sistem, Interaksi Manusia dan Komputer, Kecerdasan Artifisial, Algoritma Struktur Data, Bahasa Indonesia, Metode Numerik, Jaringan Komputer.
            
            PENTING: Pengguna saat ini berada di zona waktu ${timezoneString}. Semua input waktu harus diinterpretasikan dalam zona waktu ini.
            Tanggal referensi saat ini adalah: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}.

            Tugas Anda:
            1. Baca input pengguna.
            2. Ekstrak nama tugasnya (taskName).
            3. Identifikasi mata kuliahnya (subject). Jika tidak ada, gunakan "Lainnya".
            4. Tentukan deadline berdasarkan input dan zona waktu pengguna, lalu konversi ke format ISO 8601 UTC ('Z').
            5. [BARU] Tentukan tingkat prioritasnya ('Kritis', 'Penting', 'Biasa') berdasarkan kata kunci (e.g., ujian, kuis, dadakan = Kritis; tugas, laporan = Penting; cicil, baca = Biasa) dan kedekatan deadline.
            6. [BARU] Ekstrak 1-2 kata kunci sebagai tag (dalam bentuk array of strings).
            7. Kembalikan HANYA sebuah objek JSON valid dengan struktur: {"taskName": string, "subject": string, "deadlineISO": string|null, "priority": string, "tags": string[]}. Jawabanmu harus selalu diawali dengan { dan diakhiri dengan }.

            Contoh (pengguna di ${timezoneString}):
            Input: "kuis dadakan jarkom besok pagi jam 8"
            Output: {"taskName": "Kuis dadakan", "subject": "Jaringan Komputer", "deadlineISO": "...", "priority": "Kritis", "tags": ["kuis", "dadakan"]}
            
            Proses input berikut:
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

    // (Fungsi generateSubtasks dan getDeepDiveInfo tidak perlu diubah sama sekali)
    // ...

    // --- Event Listener Form (DI-UPGRADE UNTUK MENYIMPAN DATA BARU) ---
    taskForm.addEventListener('submit', async (e) => {
        // ... (bagian awal sampai structuredTask didapatkan tetap sama) ...
        
        const structuredTask = await getStructuredTaskFromAI(rawText);
        
        if (!structuredTask) { /* ... (handle error tetap sama) ... */ return; }

        submitButton.textContent = 'Membuat sub-tugas...';
        const subtaskStrings = await generateSubtasks(structuredTask.taskName);
        const subtasks = subtaskStrings.map(st => ({ text: st, completed: false }));

        let deadlineFormatted = null;
        // ... (logika format deadline tetap sama) ...
        
        const subjectInfo = getSubjectInfo(structuredTask.subject); // Menggunakan helper function
        
        // [UPGRADE] Objek newTask sekarang menyimpan data prioritas dan tag
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
        // ... (sisa fungsi sama, save, render, reset button) ...
    });

    // --- Render Function (DI-UPGRADE UNTUK MENAMPILKAN INFO BARU) ---
    function renderTasks() {
        taskList.innerHTML = '';
        if (tasks.length === 0) { /* ... (empty state tetap sama) ... */ return; }

        tasks.forEach(task => {
            const li = document.createElement('li');
            
            // [UPGRADE] Menambahkan kelas CSS berdasarkan prioritas
            const priorityClass = `priority-${task.priority.toLowerCase()}`;
            li.className = `task-item ${priorityClass}`;
            
            if (task.completed) li.classList.add('completed');
            li.setAttribute('data-id', task.id);
            
            // ... (logika subtasksHTML tetap sama) ...

            // [BARU] Membuat HTML untuk tags
            let tagsHTML = '';
            if (task.tags && task.tags.length > 0) {
                tagsHTML = '<div class="task-tags">';
                task.tags.forEach(tag => {
                    tagsHTML += `<span class="task-tag">#${tag}</span>`;
                });
                tagsHTML += '</div>';
            }

            li.innerHTML = `
                <div class="task-content">
                    <div class="task-text-content">${task.text}</div>
                    <div class="task-info">
                        <span class="task-subject subject-${task.subject.key}">${task.subject.name}</span>
                        ${task.deadline ? `<span> | Deadline: ${task.deadline}</span>` : ''}
                    </div>
                    ${tagsHTML} ${subtasksHTML} </div>
                <div class="task-actions">
                    <button class="deep-dive-btn" data-task-text="${task.text}">🪄</button>
                    <button class="delete-btn">🗑️</button>
                </div>
            `;
            taskList.appendChild(li);
        });
    }

    // (Sisa kode seperti saveTasks, event listener list, helper function, dll. tetap sama)
});