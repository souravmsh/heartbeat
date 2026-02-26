"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskReminders = void 0;
class TaskReminders {
    constructor(context) {
        this.context = context;
        this._tasks = [];
        this.loadTasks();
        setInterval(() => this.checkReminders(), 60000);
    }
    addTask(name, date, highPriority) {
        this._tasks.push({
            id: Date.now().toString(),
            name,
            date,
            highPriority: !!highPriority
        });
        this.saveTasks();
    }
    editTask(id, name, date, highPriority) {
        const task = this._tasks.find(t => t.id === id);
        if (task) {
            task.name = name;
            task.date = date;
            task.highPriority = !!highPriority;
            this.saveTasks();
        }
    }
    removeTask(id) {
        this._tasks = this._tasks.filter(t => t.id !== id);
        this.saveTasks();
    }
    getTasks() {
        return this._tasks;
    }
    loadTasks() {
        const data = this.context.globalState.get('takeABreak.tasks.v3');
        if (data) {
            this._tasks = data;
        }
    }
    saveTasks() {
        this.context.globalState.update('takeABreak.tasks.v3', this._tasks);
    }
    checkReminders() {
        const now = new Date();
        // YYYY-MM-DD
        const todayDate = now.toISOString().split('T')[0];
        // Priority-based alerting could be integrated here if needed
        this._tasks.forEach(task => {
            if (task.date === todayDate) {
                // Only trigger once per day or upon opening, simplified for now
                // vscode.window.showInformationMessage(`Scheduled Task Reminder: ${task.name}`);
            }
        });
    }
}
exports.TaskReminders = TaskReminders;
//# sourceMappingURL=TaskReminders.js.map