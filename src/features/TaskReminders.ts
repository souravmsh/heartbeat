export interface ReminderTask {
    id: string;
    title: string;
    content: string;
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

    addTask(title: string, content: string, date?: string, highPriority?: boolean) {
        if (!title.trim()) {
            const taskCount = this._tasks.length + 1;
            title = `Task ${taskCount}`;
        }
        this._tasks.push({
            id: Date.now().toString(),
            title,
            content,
            date,
            highPriority: !!highPriority
        });
        this.saveTasks();
    }

    editTask(id: string, title: string, content: string, date?: string, highPriority?: boolean) {
        const task = this._tasks.find(t => t.id === id);
        if (task) {
            task.title = title;
            task.content = content;
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
        let data = this.context.globalState.get<any[]>('heartbeat.tasks.v3');
        if (!data) {
            data = this.context.globalState.get<any[]>('takeABreak.tasks.v3');
        }

        if (data && Array.isArray(data)) {
            this._tasks = data.map(task => ({
                id: task.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                title: task.title || task.name || 'Untitled Task',
                content: task.content || '',
                date: task.date,
                highPriority: !!task.highPriority
            }));
        }
    }

    private saveTasks() {
        this.context.globalState.update('heartbeat.tasks.v3', this._tasks);
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
