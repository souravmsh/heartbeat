export interface ReminderTask {
    id: string;
    name: string;
    date?: string;
    highPriority: boolean;
}

import * as vscode from 'vscode';

export class TaskReminders {
    private _tasks: ReminderTask[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.loadTasks();
        setInterval(() => this.checkReminders(), 60000);
    }

    addTask(name: string, date?: string, highPriority?: boolean) {
        this._tasks.push({
            id: Date.now().toString(),
            name,
            date,
            highPriority: !!highPriority
        });
        this.saveTasks();
    }

    editTask(id: string, name: string, date?: string, highPriority?: boolean) {
        const task = this._tasks.find(t => t.id === id);
        if (task) {
            task.name = name;
            task.date = date;
            task.highPriority = !!highPriority;
            this.saveTasks();
        }
    }

    removeTask(id: string) {
        this._tasks = this._tasks.filter(t => t.id !== id);
        this.saveTasks();
    }

    getTasks() {
        return this._tasks;
    }

    private loadTasks() {
        const data = this.context.globalState.get<ReminderTask[]>('takeABreak.tasks.v3');
        if (data) {
            this._tasks = data;
        }
    }

    private saveTasks() {
        this.context.globalState.update('takeABreak.tasks.v3', this._tasks);
    }

    private checkReminders() {
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
