document.addEventListener('DOMContentLoaded', () => {
    
    // --- BAGIAN 1 & 2 (TETAP SAMA) ---
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
    
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // --- 3. FUNGSI "NLP LOKAL" v3.0 (THE BIG UPGRADE) ---
    function parseTaskInput(text) {
        let taskText = text;
        let deadline = null;
        let subject = { key: 'lainnya', name: 'Lainnya' };

        // Daftar Matkul (tetap sama)
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
        
        // --- PROSES BARU: PENGENALAN TANGGAL TINGKAT LANJUT ---
        const now = new Date();
        let deadlineDate = null;

        // Daftar nama bulan dalam Bahasa Indonesia
        const bulanIndonesia = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
        
        // Pola Regex untuk berbagai format tanggal
        const datePatterns = [
            { regex: /(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i, handler: match => {
                const day = parseInt(match[1]);
                const month = bulanIndonesia.indexOf(match[2].toLowerCase());
                return new Date(now.getFullYear(), month, day);
            }},
            { regex: /(\d+)\s+hari\s+lagi/i, handler: match => {
                const daysToAdd = parseInt(match[1]);
                const newDate = new Date();
                newDate.setDate(now.getDate() + daysToAdd);
                return newDate;
            }},
            { regex: /minggu\s+depan/i, handler: () => {
                const newDate = new Date();
                newDate.setDate(now.getDate() + 7);
                return newDate;
            }},
            { regex: /\blusa\b/i, handler: () => {
                const newDate = new Date();
                newDate.setDate(now.getDate() + 2);
                return newDate;
            }},
            { regex: /\bbesok\b/i, handler: () => {
                const newDate = new Date();
                newDate.setDate(now.getDate() + 1);
                return newDate;
            }},
            { regex: /\bhari\s+ini\b/i, handler: () => new Date() }
        ];

        // Loop untuk mencari pola tanggal yang cocok
        for (const pattern of datePatterns) {
            const match = taskText.match(pattern.regex);
            if (match) {
                deadlineDate = pattern.handler(match);
                taskText = taskText.replace(pattern.regex, '').trim(); // Hapus bagian tanggal dari teks
                break; // Hentikan jika sudah ketemu
            }
        }
        
        // Pola Regex untuk waktu (tetap sama)
        const timeRegex = /(jam|pukul)\s*(\d{1,2})([:.](\d{2}))?\s*(pagi|siang|sore|malam)?/i;
        const timeMatch = taskText.match(timeRegex);

        if (timeMatch) {
            if (!deadlineDate) deadlineDate = new Date();

            let hours = parseInt(timeMatch[2], 10);
            const minutes = timeMatch[4] ? parseInt(timeMatch[4], 10) : 0;
            const period = timeMatch[5];

            if (period && /malam/i.test(period) && hours < 12) hours += 12;
            else if (period && /pagi/i.test(period) && hours === 12) hours = 0;

            deadlineDate.setHours(hours, minutes, 0, 0);
            taskText = taskText.replace(timeRegex, '');
        }
        
        if (deadlineDate) {
            const options = { weekday: 'long', day: 'numeric', month: 'long' };
            if (timeMatch) {
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

    // --- SISA KODE (RENDER, SAVE, EVENT LISTENERS) SEMUANYA TETAP SAMA ---
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