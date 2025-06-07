// Elements
const todoInput = document.getElementById('todo-input');
const deadlineInput = document.getElementById('deadline-input');
const tagInput = document.getElementById('tag-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const filter = document.getElementById('filter');
const clearAllBtn = document.getElementById('clear-all');
const taskCount = document.getElementById('task-count');
const themeToggle = document.getElementById('theme-toggle');

const calendarMonthLabel = document.getElementById('calendar-month');
const calendarGrid = document.getElementById('calendar-grid');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

const reminderPopup = document.getElementById('reminder-popup');
const reminderMessage = document.getElementById('reminder-message');
const reminderCloseBtn = document.getElementById('reminder-close');

// Data
let tasks = [];
let currentFilter = 'all';

let calendarDate = new Date();
calendarDate.setDate(1);

// Enable Add button only if input has text
todoInput.addEventListener('input', () => {
  addBtn.disabled = todoInput.value.trim() === '';
});

// Add task
addBtn.addEventListener('click', () => {
  const text = todoInput.value.trim();
  if (!text) return;
  const deadline = deadlineInput.value ? deadlineInput.value : null;
  const tag = tagInput.value.trim() || null;

  const newTask = {
    id: Date.now(),
    text,
    done: false,
    deadline,
    tag,
    subtasks: [],
    createdAt: new Date().toISOString(),
  };

  tasks.push(newTask);
  saveTasks();
  renderTasks();
  todoInput.value = '';
  deadlineInput.value = '';
  tagInput.value = '';
  addBtn.disabled = true;
  updateCalendar();
});

// Save tasks to localStorage
function saveTasks() {
  localStorage.setItem('todoTasks', JSON.stringify(tasks));
}

// Load tasks from localStorage
function loadTasks() {
  const saved = localStorage.getItem('todoTasks');
  if (saved) {
    tasks = JSON.parse(saved);
  }
}

// Render tasks list
function renderTasks() {
  todoList.innerHTML = '';
  let filteredTasks = tasks;
  if (currentFilter === 'done') {
    filteredTasks = tasks.filter(t => t.done);
  } else if (currentFilter === 'pending') {
    filteredTasks = tasks.filter(t => !t.done);
  }

  filteredTasks.forEach(task => {
    const li = document.createElement('li');
    li.classList.add('todo-item');
    if (task.done) li.classList.add('done');
    li.setAttribute('draggable', 'true');
    li.dataset.id = task.id;

    // Top row (checkbox, text, deadline, tag, actions)
    const topDiv = document.createElement('div');
    topDiv.classList.add('todo-top');

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('todo-checkbox');
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => {
      task.done = checkbox.checked;
      saveTasks();
      renderTasks();
      updateCalendar();
      checkOverdueNotifications();
    });
    topDiv.appendChild(checkbox);

    // Task text (click to edit)
    const textSpan = document.createElement('span');
    textSpan.classList.add('todo-text');
    textSpan.textContent = task.text;
    textSpan.title = 'Click to edit';
    textSpan.addEventListener('click', () => {
      enableEditing(textSpan, task);
    });
    topDiv.appendChild(textSpan);

    // Deadline badge
    if (task.deadline) {
      const dlSpan = document.createElement('span');
      dlSpan.classList.add('todo-deadline');

      const today = new Date();
      const deadlineDate = new Date(task.deadline);
      deadlineDate.setHours(23,59,59,999);

      if (task.done) {
        dlSpan.classList.add('deadline-future');
      } else if (deadlineDate < today) {
        dlSpan.classList.add('deadline-overdue');
      } else if (deadlineDate.toDateString() === today.toDateString()) {
        dlSpan.classList.add('deadline-pending');
      } else {
        dlSpan.classList.add('deadline-future');
      }

      dlSpan.textContent = formatDate(task.deadline);
      topDiv.appendChild(dlSpan);
    }

    // Tag badge
    if (task.tag) {
      const tagSpan = document.createElement('span');
      tagSpan.classList.add('todo-tag');
      tagSpan.textContent = task.tag;
      topDiv.appendChild(tagSpan);
    }

    // Actions buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('todo-actions');

    // Edit button (optional because text click edits)
    // Delete button
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '🗑️';
    delBtn.title = 'Delete Task';
    delBtn.addEventListener('click', () => {
      if (confirm('Delete this task?')) {
        tasks = tasks.filter(t => t.id !== task.id);
        saveTasks();
        renderTasks();
        updateCalendar();
      }
    });
    actionsDiv.appendChild(delBtn);

    topDiv.appendChild(actionsDiv);
    li.appendChild(topDiv);

    // Subtasks
    const subtasksUl = document.createElement('ul');
    subtasksUl.classList.add('subtasks');

    task.subtasks.forEach((subtask, i) => {
      const subLi = document.createElement('li');
      subLi.classList.add('subtask-item');

      // Checkbox
      const subCheckbox = document.createElement('input');
      subCheckbox.type = 'checkbox';
      subCheckbox.checked = subtask.done;
      subCheckbox.addEventListener('change', () => {
        subtask.done = subCheckbox.checked;
        saveTasks();
        renderTasks();
        checkOverdueNotifications();
      });
      subLi.appendChild(subCheckbox);

      // Subtask text span
      const subText = document.createElement('span');
      subText.classList.add('subtask-text');
      if (subtask.done) subText.classList.add('done');
      subText.textContent = subtask.text;
      subText.title = 'Click to edit subtask';
      subText.addEventListener('click', () => {
        enableSubtaskEditing(subText, subtask);
      });
      subLi.appendChild(subText);

      // Delete subtask button
      const delSubBtn = document.createElement('button');
      delSubBtn.textContent = '×';
      delSubBtn.classList.add('subtask-delete-btn');
      delSubBtn.title = 'Delete Subtask';
      delSubBtn.addEventListener('click', () => {
        if (confirm('Delete this subtask?')) {
          task.subtasks.splice(i, 1);
          saveTasks();
          renderTasks();
        }
      });
      subLi.appendChild(delSubBtn);

      subtasksUl.appendChild(subLi);
    });

    li.appendChild(subtasksUl);

    // Add subtask input (hidden until clicked)
    const addSubtaskBtn = document.createElement('span');
    addSubtaskBtn.classList.add('add-subtask');
    addSubtaskBtn.textContent = '+ Add Subtask';
    addSubtaskBtn.title = 'Add a subtask';

    addSubtaskBtn.addEventListener('click', () => {
      addSubtaskBtn.style.display = 'none';

      const inputSubtask = document.createElement('input');
      inputSubtask.type = 'text';
      inputSubtask.placeholder = 'Enter subtask and press Enter';
      inputSubtask.classList.add('subtask-input');

      inputSubtask.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && inputSubtask.value.trim() !== '') {
          task.subtasks.push({ text: inputSubtask.value.trim(), done: false });
          saveTasks();
          renderTasks();
        } else if (e.key === 'Escape') {
          renderTasks();
        }
      });

      li.appendChild(inputSubtask);
      inputSubtask.focus();
    });

    li.appendChild(addSubtaskBtn);

    // Drag & Drop handlers
    li.addEventListener('dragstart', dragStart);
    li.addEventListener('dragover', dragOver);
    li.addEventListener('drop', drop);
    li.addEventListener('dragend', dragEnd);

    todoList.appendChild(li);
  });

  updateTaskCount(filteredTasks.length);
}

// Format date as DD MMM YYYY
function formatDate(dateStr) {
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  const dt = new Date(dateStr);
  return dt.toLocaleDateString(undefined, options);
}

// Enable editing of task text
function enableEditing(textSpan, task) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = task.text;
  input.classList.add('todo-text', 'editing');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const newText = input.value.trim();
      if (newText !== '') {
        task.text = newText;
        saveTasks();
        renderTasks();
      }
    } else if (e.key === 'Escape') {
      renderTasks();
    }
  });

  input.addEventListener('blur', () => {
    renderTasks();
  });

  textSpan.replaceWith(input);
  input.focus();
}

// Enable editing of subtask text
function enableSubtaskEditing(subTextSpan, subtask) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = subtask.text;
  input.classList.add('subtask-input');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const newText = input.value.trim();
      if (newText !== '') {
        subtask.text = newText;
        saveTasks();
        renderTasks();
      }
    } else if (e.key === 'Escape') {
      renderTasks();
    }
  });

  input.addEventListener('blur', () => {
    renderTasks();
  });

  subTextSpan.replaceWith(input);
  input.focus();
}

// Filter tasks
filter.addEventListener('change', () => {
  currentFilter = filter.value;
  renderTasks();
});

// Clear all tasks
clearAllBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all tasks?')) {
    tasks = [];
    saveTasks();
    renderTasks();
    updateCalendar();
  }
});

// Update task count
function updateTaskCount(count) {
  taskCount.textContent = `Tasks: ${count}`;
}

// Drag and Drop Functions
let draggedItem = null;

function dragStart(e) {
  draggedItem = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const draggingOverItem = this;
  if (draggingOverItem === draggedItem) return;

  const bounding = draggingOverItem.getBoundingClientRect();
  const offset = e.clientY - bounding.top;

  if (offset > bounding.height / 2) {
    draggingOverItem.style['border-bottom'] = '2px solid #b35b6b';
    draggingOverItem.style['border-top'] = '';
  } else {
    draggingOverItem.style['border-top'] = '2px solid #b35b6b';
    draggingOverItem.style['border-bottom'] = '';
  }
}

function drop(e) {
  e.preventDefault();

  if (!draggedItem) return;

  const draggingOverItem = this;
  if (draggingOverItem === draggedItem) return;

  const bounding = draggingOverItem.getBoundingClientRect();
  const offset = e.clientY - bounding.top;

  const draggedIndex = tasks.findIndex(t => t.id == draggedItem.dataset.id);
  const overIndex = tasks.findIndex(t => t.id == draggingOverItem.dataset.id);

  tasks.splice(draggedIndex, 1);

  if (offset > bounding.height / 2) {
    tasks.splice(overIndex + 1, 0, tasks.find(t => t.id == draggedItem.dataset.id) || draggedItem);
  } else {
    tasks.splice(overIndex, 0, tasks.find(t => t.id == draggedItem.dataset.id) || draggedItem);
  }

  // Instead of above (which might not work well), we do a simple reorder:
  tasks.splice(overIndex, 0, tasks.splice(draggedIndex, 1)[0]);

  saveTasks();
  renderTasks();
  updateCalendar();
}

function dragEnd() {
  draggedItem.classList.remove('dragging');
  todoList.querySelectorAll('.todo-item').forEach(item => {
    item.style.borderTop = '';
    item.style.borderBottom = '';
  });
  draggedItem = null;
}

// Calendar functionality
function updateCalendar() {
  calendarGrid.innerHTML = '';

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  calendarMonthLabel.textContent = calendarDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  // Find first day of month (0-6)
  const firstDay = new Date(year, month, 1).getDay();

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Show 6 weeks grid (42 days)
  for (let i = 0; i < 42; i++) {
    const dayDiv = document.createElement('div');
    dayDiv.classList.add('calendar-day');

    // Calculate the date for the cell
    let cellDate, inCurrentMonth = true;
    if (i < firstDay) {
      // Days from prev month
      const dateNum = daysInPrevMonth - firstDay + 1 + i;
      cellDate = new Date(year, month - 1, dateNum);
      inCurrentMonth = false;
      dayDiv.style.opacity = '0.4';
    } else if (i >= firstDay + daysInMonth) {
      // Days from next month
      const dateNum = i - (firstDay + daysInMonth) + 1;
      cellDate = new Date(year, month + 1, dateNum);
      inCurrentMonth = false;
      dayDiv.style.opacity = '0.4';
    } else {
      // Current month days
      const dateNum = i - firstDay + 1;
      cellDate = new Date(year, month, dateNum);
    }

    // Display day number
    dayDiv.textContent = cellDate.getDate();

    // Container for tasks on this day
    const tasksContainer = document.createElement('div');
    tasksContainer.classList.add('calendar-task-list');

    // Add tasks with deadline matching cellDate
    const cellDateStr = cellDate.toISOString().slice(0, 10);
    const dayTasks = tasks.filter(t => t.deadline === cellDateStr);

    dayTasks.forEach(t => {
      const taskDiv = document.createElement('div');
      taskDiv.textContent = t.text;
      if (t.done) taskDiv.style.textDecoration = 'line-through';
      tasksContainer.appendChild(taskDiv);
    });

    dayDiv.appendChild(tasksContainer);
    calendarGrid.appendChild(dayDiv);
  }
}

prevMonthBtn.addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  updateCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  updateCalendar();
});

// Theme toggle (light/dark)
let darkMode = false;
themeToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  if (darkMode) {
    document.body.style.background = '#4a2c36';
    document.body.style.color = '#f9d5db';
    themeToggle.textContent = '☀️';
  } else {
    document.body.style.background = '#fff0f5';
    document.body.style.color = '#4a2c36';
    themeToggle.textContent = '🌙';
  }
});

// Reminder notifications for overdue tasks
function checkOverdueNotifications() {
  const now = new Date();
  const overdueTasks = tasks.filter(t => {
    if (t.deadline && !t.done) {
      const dlDate = new Date(t.deadline + 'T23:59:59');
      return dlDate < now;
    }
    return false;
  });

  if (overdueTasks.length > 0) {
    reminderMessage.textContent = `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}!`;
    reminderPopup.classList.remove('hidden');
  } else {
    reminderPopup.classList.add('hidden');
  }
}

reminderCloseBtn.addEventListener('click', () => {
  reminderPopup.classList.add('hidden');
});

// Initialize
loadTasks();
renderTasks();
updateCalendar();
checkOverdueNotifications();
