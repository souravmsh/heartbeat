"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskReminders = void 0;
class TaskReminders {
    constructor(context) {
        this.context = context;
        this._tasks = [];
        this._lastNotified = new Map();
        this.schedulePreviewTime = "18:00";
        this.loadTasks();
        setInterval(() => this.checkReminders(), 30000); // Check every 30s
    }
    addTask(title, content, date, highPriority, time, secret) {
        if (!title.trim()) {
            const taskCount = this._tasks.length + 1;
            title = `Task ${taskCount}`;
        }
        this._tasks.push({
            id: Date.now().toString(),
            title,
            content,
            date,
            time,
            highPriority: !!highPriority,
            secret: !!secret
        });
        this.saveTasks();
    }
    editTask(id, title, content, date, highPriority, time, secret) {
        const task = this._tasks.find(t => t.id === id);
        if (task) {
            task.title = title;
            task.content = content;
            task.date = date;
            task.time = time;
            task.highPriority = !!highPriority;
            task.secret = !!secret;
            this.saveTasks();
        }
    }
    removeTask(id) {
        this._tasks = this._tasks.filter(t => t.id !== id);
        this._lastNotified.delete(id);
        this.saveTasks();
    }
    getTasks() {
        return this._tasks;
    }
    loadTasks() {
        let data = this.context.globalState.get('heartbeat.tasks.v3');
        if (!data) {
            data = this.context.globalState.get('takeABreak.tasks.v3');
        }
        if (data && Array.isArray(data)) {
            this._tasks = data.map(task => ({
                id: task.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                title: task.title || task.name || 'Untitled Task',
                content: task.content || '',
                date: task.date,
                time: task.time,
                highPriority: !!task.highPriority,
                secret: !!task.secret
            }));
        }
    }
    saveTasks() {
        this.context.globalState.update('heartbeat.tasks.v3', this._tasks);
    }
    checkReminders() {
        const now = new Date();
        const todayDate = now.toISOString().split('T')[0];
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const notificationKey = `${todayDate} ${currentTime}`;
        this._tasks.forEach(task => {
            if (task.date === todayDate && task.time === currentTime) {
                const lastNotified = this._lastNotified.get(task.id);
                if (lastNotified !== notificationKey) {
                    if (this.onReminder) {
                        this.onReminder(task);
                    }
                    this._lastNotified.set(task.id, notificationKey);
                }
            }
        });
        // Check for tomorrow's schedule (Daily Preview)
        if (currentTime === this.schedulePreviewTime) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowDate = tomorrow.toISOString().split('T')[0];
            const tomorrowTasks = this._tasks.filter(t => t.date === tomorrowDate);
            if (tomorrowTasks.length > 0 && this._lastNotified.get("tomorrow_preview") !== todayDate) {
                if (this.onSchedulePreview) {
                    this.onSchedulePreview(tomorrowTasks);
                }
                this._lastNotified.set("tomorrow_preview", todayDate);
            }
        }
    }
}
exports.TaskReminders = TaskReminders;
//# sourceMappingURL=TaskReminders.js.map