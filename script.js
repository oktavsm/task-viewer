document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. AMBIL ELEMEN & PENGATURAN TEMA ---
    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const taskList = document.getElementById('taskList');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Cek tema yang tersimpan di localStorage
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    }

    // Event listener untuk tombol tema
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggle.textContent = '☀️';
        } else {
            localStorage.setItem('theme', 'light');
            themeToggle.textContent = '🌙';
        }
    });
    
    // --- 2. SIAPIN DATA TUGAS ---
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // --- 3. FUNGSI "NLP LOKAL" (DENGAN SEDIKIT UPGRADE) ---
    function parseTaskInput(text) {
        let taskText = text;
        let deadline = null;
        let subject = { key: 'lainnya', name: 'Lainnya' }; // Sekarang jadi objek

        const subjects = {
            'aps': 'Analisis Perancangan Sistem',
            'imk': 'Interaksi Manusia Komputer',
            'ai': 'Kecerdasan Artifisial',
            'asd': 'Algoritma Struktur Data',
            'metnum': 'Metode Numerik',
            'jarkom': 'Jaringan Komputer',
            'bindo': 'Bahasa Indonesia'
        };

        for (const key in subjects) {
            const regex = new RegExp(`\\b${key}\\b`, 'i');
            if (regex.test(taskText)) {
                subject = { key: key, name: subjects[key] };
                taskText = taskText.replace(regex, '').trim();
                break;
            }
        }
        
        const today = new Date();
        if (/besok/i.test(taskText)) {
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);
            deadline = tomorrow.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
            taskText = taskText.replace(/besok/i, '').trim();
        } else if (/hari ini/i.test(taskText)) {
            deadline = today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
            taskText = taskText.replace(/hari ini/i, '').trim();
        }
        
        taskText = taskText.replace(/deadline/i, '').trim();

        return {
            id: Date.now(),
            text: taskText.charAt(0).toUpperCase() + taskText.slice(1),
            subject: subject, // Menyimpan objek subject
            deadline: deadline,
            completed: false
        };
    }

    // --- 4. FUNGSI RENDER TUGAS (DENGAN KELAS DINAMIS) ---
    function renderTasks() {
        taskList.innerHTML = '';
        if (tasks.length === 0) {
            taskList.innerHTML = '<p style="text-align:center; color:var(--subtle-text-color);">Belum ada tugas, santai dulu~ 🌴</p>';
            return;
        }

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            if (task.completed) {
                li.classList.add('completed');
            }
            li.setAttribute('data-id', task.id);

            // Menambahkan kelas dinamis untuk warna label
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

    // --- 5. FUNGSI SIMPAN DATA (TETAP SAMA) ---
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // --- 6. EVENT LISTENERS (TETAP SAMA) ---
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
        const id = e.target.closest('.task-item').getAttribute('data-id');
        if (!id) return;

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

    // --- 7. RENDER AWAL (TETAP SAMA) ---
    renderTasks();
});