// script.js (Versi AI)
document.addEventListener('DOMContentLoaded', () => {
    
    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const taskList = document.getElementById('taskList');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const submitButton = taskForm.querySelector('button[type="submit"]');

    // --- LOGIKA TEMA (TETAP SAMA) ---
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
    
    // --- DATA TUGAS (TETAP SAMA) ---
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // --- INILAH OTAK AI BARUNYA ---
    // Fungsi ini ngobrol dengan Google AI untuk mengekstrak info dari teks
    async function getStructuredTaskFromAI(text) {
        // Inisialisasi Google AI dengan kunci dari config.js
        const { streamText } = await import('https://sdk.vercel.ai/ai');
        const ai = new google.generativeai.GenerativeAI(API_KEY);
        const model = ai.getGenerativeModel({ model: "gemini-pro" });

        // Ini adalah "perintah" atau "briefing" yang kita kasih ke AI
        const prompt = `
            Anda adalah asisten cerdas yang tugasnya mengubah kalimat tugas kuliah acak menjadi data JSON terstruktur.
            Daftar mata kuliah yang valid adalah: Analisis Perancangan Sistem, Interaksi Manusia dan Komputer, Kecerdasan Artifisial, Algoritma Struktur Data, Bahasa Indonesia, Metode Numerik, Jaringan Komputer.

            Tugas Anda:
            1. Baca kalimat input dari pengguna.
            2. Ekstrak nama tugasnya (taskName).
            3. Identifikasi mata kuliahnya (subject) dari daftar yang valid. Jika tidak ada, gunakan "Lainnya".
            4. Tentukan tanggal dan waktu deadline-nya. Ubah ke format ISO 8601 string (YYYY-MM-DDTHH:mm:ss.sssZ). Gunakan tanggal hari ini (${new Date().toISOString()}) sebagai referensi.
            5. Kembalikan HANYA sebuah objek JSON valid dengan struktur: { "taskName": "string", "subject": "string", "deadlineISO": "string|null" }

            Contoh:
            Input: "kayaknya ada laprak jarkom buat lusa jam 11 malem deh"
            Output: {"taskName": "Laprak", "subject": "Jaringan Komputer", "deadlineISO": "${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().replace(/\d{2}:\d{2}\.\d{3}Z$/, '23:00:00.000Z')}"}

            Input: "ngerjain essay bindo"
            Output: {"taskName": "Ngerjain essay", "subject": "Bahasa Indonesia", "deadlineISO": null}
            
            Sekarang, proses input berikut:
            Input: "${text}"
            Output:
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            
            // Membersihkan & mem-parsing output JSON dari AI
            const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonString);

        } catch (error) {
            console.error("Error dari AI API:", error);
            alert("Gagal memproses tugas dengan AI. Coba lagi atau periksa kunci API.");
            return null;
        }
    }

    // --- FORM SUBMIT DENGAN LOGIKA ASYNC ---
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawText = taskInput.value.trim();
        if (rawText === '') return;

        // Tampilkan status loading
        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';
        
        const structuredTask = await getStructuredTaskFromAI(rawText);

        // Kembalikan tombol ke normal
        submitButton.disabled = false;
        submitButton.textContent = 'Tambah';

        if (!structuredTask) return; // Jika AI gagal, hentikan proses

        // Format tanggal dari ISO ke format yang mudah dibaca
        let deadlineFormatted = null;
        if (structuredTask.deadlineISO) {
            const deadlineDate = new Date(structuredTask.deadlineISO);
            deadlineFormatted = deadlineDate.toLocaleDateString('id-ID', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
            }).replace(/\./g, ':');
        }

        // Cari 'key' dari subject untuk pewarnaan
        const subjects = {
            'aps': 'Analisis Perancangan Sistem', 'imk': 'Interaksi Manusia Komputer', 'ai': 'Kecerdasan Artifisial',
            'asd': 'Algoritma Struktur Data', 'metnum': 'Metode Numerik', 'jarkom': 'Jaringan Komputer', 'bindo': 'Bahasa Indonesia'
        };
        let subjectKey = 'lainnya';
        for (const key in subjects) {
            if (subjects[key] === structuredTask.subject) {
                subjectKey = key;
                break;
            }
        }
        
        const newTask = {
            id: Date.now(),
            text: structuredTask.taskName,
            subject: { key: subjectKey, name: structuredTask.subject },
            deadline: deadlineFormatted,
            completed: false
        };

        tasks.unshift(newTask);
        taskInput.value = '';
        saveTasks();
        renderTasks();
    });

    // --- SISA KODE (RENDER, SAVE) TIDAK BERUBAH ---
    function renderTasks() {
        taskList.innerHTML = '';
        if (tasks.length === 0) {
            taskList.innerHTML = `<p style="text-align:center; color:var(--subtle-text-color);">Belum ada tugas, santai dulu~ 🌴</p>`;
            return;
        }

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            if (task.completed) li.classList.add('completed');
            li.setAttribute('data-id', task.id);
            
            const subjectClass = `subject-${task.subject.key}`;

            li.innerHTML = `
                <div class="task-content">
                    <div class="task-text-content">${task.text}</div>
                    <div class="task-info">
                        <span class="task-subject ${subjectClass}">${task.subject.name}</span>
                        ${task.deadline ? `<span> | Deadline: ${task.deadline}</span>` : ''}
                    </div>
                </div>
                <button class="delete-btn">🗑️</button>
            `;
            taskList.appendChild(li);
        });
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    taskList.addEventListener('click', (e) => {
        const targetLi = e.target.closest('.task-item');
        if (!targetLi) return;
        const id = targetLi.getAttribute('data-id');

        if (e.target.classList.contains('delete-btn')) {
            tasks = tasks.filter(task => task.id != id);
        } else {
            tasks = tasks.map(task => 
                task.id == id ? { ...task, completed: !task.completed } : task
            );
        }
        saveTasks();
        renderTasks();
    });

    renderTasks();
});