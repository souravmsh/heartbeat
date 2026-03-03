import * as vscode from 'vscode';

export class CodingTimeTracker {
    private _codingTime: number = 0;
    private _lastActiveTime: number = Date.now();
    private _timerPaused: boolean = false;
    private _saveInterval?: NodeJS.Timeout;

    constructor(private context: vscode.ExtensionContext) {
        let savedTime = context.globalState.get<number>('heartbeat.codingTime');
        if (savedTime === undefined) savedTime = context.globalState.get<number>('takeABreak.codingTime');

        let savedDateStr = context.globalState.get<string>('heartbeat.codingDate');
        if (savedDateStr === undefined) savedDateStr = context.globalState.get<string>('takeABreak.codingDate');

        const todayStr = new Date().toDateString();

        // Reset day if it's a new day
        if (savedDateStr !== todayStr) {
            this._codingTime = 0;
            context.globalState.update('heartbeat.codingDate', todayStr);
        } else if (savedTime) {
            this._codingTime = savedTime;
        }

        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(() => this.updateActivity()),
            vscode.window.onDidChangeActiveTextEditor(() => this.updateActivity())
        );

        // Persist every minute
        this._saveInterval = setInterval(() => {
            this.context.globalState.update('heartbeat.codingTime', this._codingTime);
        }, 60000);
    }

    private updateActivity() {
        if (this._timerPaused) return;

        const now = Date.now();
        // 5-minute inactivity threshold
        if (now - this._lastActiveTime < 300000) {
            this._codingTime += (now - this._lastActiveTime);
        }
        this._lastActiveTime = now;
    }

    public getTrackerData() {
        this.updateActivity(); // Trigger calculation on fetch
        return {
            codingTimeMs: this._codingTime
        };
    }

    public togglePause() {
        this._timerPaused = !this._timerPaused;
        if (!this._timerPaused) {
            this._lastActiveTime = Date.now(); // Reset baseline on resume
        }
    }

    public isPaused() {
        return this._timerPaused;
    }

    public resetTime() {
        this._codingTime = 0;
        this._lastActiveTime = Date.now();
        this.context.globalState.update('heartbeat.codingTime', this._codingTime);
    }
}
