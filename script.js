document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. AMBIL ELEMEN & PENGATURAN TEMA ---
    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const taskList = document.getElementById('taskList');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

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
    
    // --- 2. SIAPIN DATA TUGAS ---
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // --- 3. FUNGSI "NLP LOKAL" v2.0 (DENGAN PENGENAL WAKTU) ---
    function parseTaskInput(text) {
        let taskText = text;
        let deadline = null;
        let subject = { key: 'lainnya', name: 'Lainnya' };

        const subjects = {
            'aps': 'Analisis Perancangan Sistem', 'imk': 'Interaksi Manusia Komputer', 'ai': 'Kecerdasan Artifisial',
            'asd': 'Algoritma Struktur Data', 'metnum': 'Metode Numerik', 'jarkom': 'Jaringan Komputer', 'bindo': 'Bahasa Indonesia'
        };

        for (const key in subjects) {
            const regex = new RegExp(`\\b${key}\\b`, 'i');
            if (regex.test(taskText)) {
                subject = { key: key, name: subjects[key] };
                taskText = taskText.replace(regex, '').trim();
                break;
            }
        }
        
        // --- PROSES BARU: MENGENALI TANGGAL & WAKTU ---
        const now = new Date();
        let deadlineDate = null;

        // Kenali tanggal dulu (lusa, besok, hari ini)
        if (/\blusa\b/i.test(taskText)) {
            deadlineDate = new Date();
            deadlineDate.setDate(now.getDate() + 2);
            taskText = taskText.replace(/\blusa\b/i, '');
        } else if (/\bbesok\b/i.test(taskText)) {
            deadlineDate = new Date();
            deadlineDate.setDate(now.getDate() + 1);
            taskText = taskText.replace(/\bbesok\b/i, '');
        } else if (/\bhari ini\b/i.test(taskText)) {
            deadlineDate = new Date();
            taskText = taskText.replace(/\bhari ini\b/i, '');
        }

        // Kenali waktu (jam 23.59, 10 malam, dll)
        const timeRegex = /(jam|pukul)\s*(\d{1,2})([:.](\d{2}))?\s*(pagi|siang|sore|malam)?/i;
        const timeMatch = taskText.match(timeRegex);

        if (timeMatch) {
            if (!deadlineDate) deadlineDate = new Date(); // Jika tgl tidak disebut, anggap hari ini

            let hours = parseInt(timeMatch[2], 10);
            const minutes = timeMatch[4] ? parseInt(timeMatch[4], 10) : 0;
            const period = timeMatch[5];

            if (period && /malam/i.test(period) && hours < 12) {
                hours += 12;
            } else if (period && /pagi/i.test(period) && hours === 12) {
                hours = 0; // jam 12 pagi = 00:00
            }

            deadlineDate.setHours(hours, minutes, 0, 0);
            taskText = taskText.replace(timeRegex, '');
        }
        
        // Format hasil deadline menjadi teks yang rapi
        if (deadlineDate) {
            const options = { weekday: 'long', day: 'numeric', month: 'long' };
            if (timeMatch) { // Jika ada waktunya, tambahkan format jam
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            deadline = deadlineDate.toLocaleDateString('id-ID', options).replace(/\./g, ':');
        }

        taskText = taskText.replace(/deadline/ig, '').replace(/[\s,]+$/, '').trim();

        return {
            id: Date.now(),
            text: taskText.charAt(0).toUpperCase() + taskText.slice(1),
            subject: subject,
            deadline: deadline,
            completed: false
        };
    }

    // --- 4. FUNGSI RENDER TUGAS (DENGAN PERBAIKAN) ---
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
            
            const subjectClass = `subject-${task.subject.key}`; // Ini bagian penting yang diperbaiki

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

    // --- Sisa kode (fungsi simpan & event listener) tetap sama persis ---
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawText = taskInput.value.trim();
        if (rawText === '') return;
        const newTask = parseTaskInput(rawText);
        tasks.unshift(newTask);
        taskInput.value = '';
        saveTasks();
        renderTasks();
    });

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