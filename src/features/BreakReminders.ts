import * as vscode from 'vscode';

export interface BreakAction {
    id: string;
    name: string;
    interval: number; // minutes
}

export class BreakReminders {
    private _breaks: BreakAction[] = [];
    private _intervals: NodeJS.Timeout[] = [];
    public onReminder?: (br: BreakAction) => void;

    constructor(private context: vscode.ExtensionContext) {
        this.loadBreaks();
        this.startReminders();

        // Add default if empty
        if (this._breaks.length === 0) {
            this.addBreak("Eye Relaxation", 20);
            this.addBreak("Drink Water", 60);
            this.addBreak("Stretch", 120);
            this.addBreak("Stand Up", 180);
        }
    }

    addBreak(name: string, interval: number) {
        this._breaks.push({ id: Date.now().toString(), name, interval });
        this.saveBreaks();
        this.startReminders();
    }

    removeBreak(id: string) {
        this._breaks = this._breaks.filter(b => b.id !== id);
        this.saveBreaks();
        this.startReminders();
    }

    snoozeBreak(id: string, minutes: number = 5) {
        const br = this._breaks.find(b => b.id === id);
        if (br) {
            setTimeout(() => {
                if (this.onReminder) this.onReminder(br);
            }, minutes * 60 * 1000);
        }
    }

    getBreaks() {
        return this._breaks;
    }

    private loadBreaks() {
        let data = this.context.globalState.get<BreakAction[]>('heartbeat.breaks');
        if (!data) {
            data = this.context.globalState.get<BreakAction[]>('takeABreak.breaks');
        }

        if (data) {
            this._breaks = data;
        }
    }

    private saveBreaks() {
        this.context.globalState.update('heartbeat.breaks', this._breaks);
    }

    private startReminders() {
        // Clear existing
        this._intervals.forEach(clearInterval);
        this._intervals = [];

        // Start new intervals
        this._breaks.forEach(br => {
            const ms = br.interval * 60 * 1000;
            const tId = setInterval(() => {
                if (this.onReminder) {
                    this.onReminder(br);
                }
            }, ms);
            this._intervals.push(tId);
        });
    }
}
