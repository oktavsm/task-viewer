// Tunggu sampai semua HTML selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. AMBIL ELEMEN DARI HTML ---
    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const taskList = document.getElementById('taskList');

    // --- 2. SIAPIN DATA ---
    // Cek apakah ada data di localStorage, kalau tidak, buat array kosong
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // --- 3. FUNGSI UNTUK "NLP LOKAL" ---
    // Fungsi ini memproses teks inputanmu menjadi data yang terstruktur
    function parseTaskInput(text) {
        let taskText = text;
        let deadline = null;
        let subject = 'Lainnya';

        // Daftar Mata Kuliah (sesuaikan jika perlu)
        const subjects = {
            'aps': 'Analisis Perancangan Sistem',
            'imk': 'Interaksi Manusia Komputer',
            'ai': 'Kecerdasan Artifisial',
            'asd': 'Algoritma Struktur Data',
            'metnum': 'Metode Numerik',
            'jarkom': 'Jaringan Komputer',
            'bindo': 'Bahasa Indonesia'
        };

        // Cek kata kunci mata kuliah
        for (const key in subjects) {
            const regex = new RegExp(`\\b${key}\\b`, 'i'); // \b untuk "whole word only"
            if (regex.test(taskText)) {
                subject = subjects[key];
                taskText = taskText.replace(regex, '').trim(); // Hapus kata kunci dari nama tugas
                break; // Hentikan pencarian jika sudah ketemu
            }
        }
        
        // Cek kata kunci deadline (contoh sederhana)
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
        
        // Hapus kata 'deadline' jika ada
        taskText = taskText.replace(/deadline/i, '').trim();

        return {
            id: Date.now(), // ID unik berdasarkan waktu
            text: taskText.charAt(0).toUpperCase() + taskText.slice(1), // Huruf pertama kapital
            subject: subject,
            deadline: deadline,
            completed: false
        };
    }

    // --- 4. FUNGSI UNTUK TAMPILIN TUGAS ---
    // Fungsi ini akan menggambar ulang daftar tugas setiap ada perubahan
    function renderTasks() {
        taskList.innerHTML = ''; // Kosongkan daftar yang lama
        if (tasks.length === 0) {
            taskList.innerHTML = '<p style="text-align:center; color:#999;">Belum ada tugas, santai dulu~ 🌴</p>';
            return;
        }

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            if (task.completed) {
                li.classList.add('completed');
            }
            li.setAttribute('data-id', task.id);

            // Tampilan HTML untuk satu item tugas
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

    // --- 5. FUNGSI UNTUK SIMPAN DATA ---
    // Simpan array 'tasks' ke localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // --- 6. EVENT LISTENER (PENDENGAR AKSI) ---
    // Aksi saat form disubmit (tombol "Tambah" diklik atau Enter ditekan)
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Mencegah halaman refresh
        const rawText = taskInput.value.trim();

        if (rawText === '') return;

        const newTask = parseTaskInput(rawText);
        tasks.unshift(newTask); // Tambah tugas baru ke awal array
        
        taskInput.value = ''; // Kosongkan input
        saveTasks();
        renderTasks();
    });

    // Aksi saat item di dalam list diklik (untuk toggle complete atau delete)
    taskList.addEventListener('click', (e) => {
        const id = e.target.closest('.task-item').getAttribute('data-id');

        // Jika tombol hapus yang diklik
        if (e.target.classList.contains('delete-btn')) {
            tasks = tasks.filter(task => task.id != id);
        } else { // Jika area lain yang diklik (untuk menandai selesai)
            tasks = tasks.map(task => {
                if (task.id == id) {
                    return { ...task, completed: !task.completed };
                }
                return task;
            });
        }
        
        saveTasks();
        renderTasks();
    });

    // --- 7. TAMPILKAN TUGAS SAAT PERTAMA KALI DIBUKA ---
    renderTasks();
});