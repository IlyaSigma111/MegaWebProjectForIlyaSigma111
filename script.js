// Глобальные переменные
let currentNoteId = null;
let currentEventId = null;

// ===== НАВИГАЦИЯ ПО ВКЛАДКАМ =====
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        this.classList.add('active');
        const tabId = this.dataset.tab;
        document.getElementById(tabId).classList.add('active');
    });
});

// ===== ЧАСЫ =====
function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    
    document.querySelector('#clockWidget .time').textContent = time;
    document.querySelector('#clockWidget .date').textContent = date;
}
setInterval(updateClock, 1000);
updateClock();

// ===== ПОГОДА =====
async function getWeather() {
    try {
        const response = await fetch('https://wttr.in/?format=%t+%c');
        const data = await response.text();
        document.getElementById('weatherWidget').innerHTML = `<div class="weather-info">${data}</div>`;
    } catch {
        document.getElementById('weatherWidget').innerHTML = '<div class="weather-info">Погода: неизвестно</div>';
    }
}
getWeather();

// ===== ПОИСК =====
document.getElementById('searchBtn').addEventListener('click', function() {
    const query = document.getElementById('globalSearch').value;
    if (query) {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    }
});

document.getElementById('globalSearch').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
    }
});

// ===== МОДАЛЬНЫЕ ОКНА =====
function openModal(modalId, id = null) {
    document.getElementById(modalId).style.display = 'flex';
    
    if (modalId === 'noteModal' && id) {
        currentNoteId = id;
        loadNoteForEdit(id);
    } else if (modalId === 'eventModal' && id) {
        currentEventId = id;
        loadEventForEdit(id);
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.getElementById('noteTitle')?.value = '';
    document.getElementById('noteContent')?.value = '';
    document.getElementById('eventTitle')?.value = '';
    document.getElementById('eventDate')?.value = '';
    document.getElementById('eventTime')?.value = '';
    document.getElementById('eventDesc')?.value = '';
    currentNoteId = null;
    currentEventId = null;
}

// Закрытие по клику вне модалки
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ===== ЗАМЕТКИ (FIREBASE) =====
async function saveNote() {
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;
    
    if (!title || !content) {
        alert('Заполните заголовок и текст');
        return;
    }
    
    try {
        if (currentNoteId) {
            // Обновление
            await db.collection('notes').doc(currentNoteId).update({
                title,
                content,
                updatedAt: new Date()
            });
        } else {
            // Создание
            await db.collection('notes').add({
                title,
                content,
                createdAt: new Date()
            });
        }
        
        closeModal('noteModal');
        loadNotes();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при сохранении');
    }
}

async function loadNotes() {
    const container = document.getElementById('notesContainer');
    container.innerHTML = '<div class="loading">Загрузка...</div>';
    
    try {
        const snapshot = await db.collection('notes').orderBy('createdAt', 'desc').get();
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state">Нет заметок</div>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const note = doc.data();
            const date = note.createdAt?.toDate().toLocaleDateString('ru-RU') || 'неизвестно';
            
            html += `
                <div class="note-card glass-panel" data-id="${doc.id}">
                    <h3>${note.title}</h3>
                    <p>${note.content}</p>
                    <small>${date}</small>
                    <div class="note-actions">
                        <button onclick="editNote('${doc.id}')"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteNote('${doc.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<div class="error">Ошибка загрузки</div>';
    }
}

async function deleteNote(id) {
    if (confirm('Удалить заметку?')) {
        await db.collection('notes').doc(id).delete();
        loadNotes();
    }
}

async function editNote(id) {
    currentNoteId = id;
    const doc = await db.collection('notes').doc(id).get();
    const note = doc.data();
    
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content;
    openModal('noteModal');
}

// ===== КАЛЕНДАРЬ/СОБЫТИЯ (FIREBASE) =====
async function saveEvent() {
    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const desc = document.getElementById('eventDesc').value;
    
    if (!title || !date) {
        alert('Заполните название и дату');
        return;
    }
    
    try {
        if (currentEventId) {
            await db.collection('events').doc(currentEventId).update({
                title,
                date,
                time,
                description: desc,
                updatedAt: new Date()
            });
        } else {
            await db.collection('events').add({
                title,
                date,
                time,
                description: desc,
                createdAt: new Date()
            });
        }
        
        closeModal('eventModal');
        loadEvents();
        updateCalendar();
    } catch (error) {
        alert('Ошибка при сохранении');
    }
}

async function loadEvents() {
    const container = document.getElementById('eventsContainer');
    
    try {
        const snapshot = await db.collection('events').orderBy('date').get();
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state">Нет событий</div>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const event = doc.data();
            html += `
                <div class="event-item glass-panel" data-id="${doc.id}">
                    <div class="event-date">${event.date} ${event.time || ''}</div>
                    <div class="event-title">${event.title}</div>
                    ${event.description ? `<div class="event-desc">${event.description}</div>` : ''}
                    <div class="event-actions">
                        <button onclick="editEvent('${doc.id}')"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteEvent('${doc.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        updateUpcomingWidget();
    } catch (error) {
        container.innerHTML = '<div class="error">Ошибка загрузки</div>';
    }
}

async function deleteEvent(id) {
    if (confirm('Удалить событие?')) {
        await db.collection('events').doc(id).delete();
        loadEvents();
        updateCalendar();
    }
}

async function editEvent(id) {
    currentEventId = id;
    const doc = await db.collection('events').doc(id).get();
    const event = doc.data();
    
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDate').value = event.date;
    document.getElementById('eventTime').value = event.time || '';
    document.getElementById('eventDesc').value = event.description || '';
    openModal('eventModal');
}

function updateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let html = '<div class="calendar-header">';
    html += `<div class="calendar-month">${now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</div>`;
    html += '</div><div class="calendar-weekdays">';
    
    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    weekdays.forEach(day => {
        html += `<div class="weekday">${day}</div>`;
    });
    html += '</div><div class="calendar-days">';
    
    // Пустые ячейки до первого дня
    for (let i = 0; i < firstDay.getDay() - 1; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Дни месяца
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        html += `<div class="calendar-day" data-date="${dateStr}">${d}</div>`;
    }
    
    html += '</div>';
    calendarGrid.innerHTML = html;
    
    // Подгрузка событий
    loadEvents().then(() => {
        document.querySelectorAll('.calendar-day[data-date]').forEach(day => {
            const date = day.dataset.date;
            // Подсветка дней с событиями
            db.collection('events').where('date', '==', date).get().then(snapshot => {
                if (!snapshot.empty) {
                    day.classList.add('has-event');
                }
            });
        });
    });
}

async function updateUpcomingWidget() {
    const widget = document.getElementById('upcomingWidget');
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const snapshot = await db.collection('events')
            .where('date', '>=', today)
            .orderBy('date')
            .limit(3)
            .get();
        
        if (snapshot.empty) {
            widget.innerHTML = '<div class="upcoming-item">Нет ближайших событий</div>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const event = doc.data();
            html += `<div class="upcoming-item">${event.date}: ${event.title}</div>`;
        });
        widget.innerHTML = html;
    } catch {
        widget.innerHTML = '<div class="upcoming-item">Ошибка загрузки</div>';
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    loadNotes();
    updateCalendar();
    updateUpcomingWidget();
});
