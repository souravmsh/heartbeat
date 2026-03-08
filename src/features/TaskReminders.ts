export interface ReminderTask {
    id: string;
    title: string;
    content: string;
    date?: string;
    time?: string; // HH:mm
    highPriority: boolean;
    secret?: boolean;
}

import * as vscode from 'vscode';

export class TaskReminders {
    private _tasks: ReminderTask[] = [];
    private _lastNotified: Map<string, string> = new Map();
    public schedulePreviewTime: string = "18:00";
    public onReminder?: (task: ReminderTask) => void;
    public onSchedulePreview?: (tasks: ReminderTask[]) => void;

    constructor(private context: vscode.ExtensionContext) {
        this.loadTasks();
        setInterval(() => this.checkReminders(), 30000); // Check every 30s
    }

    addTask(title: string, content: string, date?: string, highPriority?: boolean, time?: string, secret?: boolean) {
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

    editTask(id: string, title: string, content: string, date?: string, highPriority?: boolean, time?: string, secret?: boolean) {
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

    removeTask(id: string) {
        this._tasks = this._tasks.filter(t => t.id !== id);
        this._lastNotified.delete(id);
        this.saveTasks();
    }

    getTasks() {
        return this._tasks;
    }

    public loadTasks() {
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
                time: task.time,
                highPriority: !!task.highPriority,
                secret: !!task.secret
            }));
        }
    }

    private saveTasks() {
        this.context.globalState.update('heartbeat.tasks.v3', this._tasks);
    }

    private checkReminders() {
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
