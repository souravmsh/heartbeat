"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodingTimeTracker = void 0;
const vscode = require("vscode");
class CodingTimeTracker {
    constructor(context) {
        this.context = context;
        this._codingTime = 0;
        this._lastActiveTime = Date.now();
        this._timerPaused = false;
        const savedTime = context.globalState.get('takeABreak.codingTime');
        const savedDateStr = context.globalState.get('takeABreak.codingDate');
        const todayStr = new Date().toDateString();
        // Reset day if it's a new day
        if (savedDateStr !== todayStr) {
            this._codingTime = 0;
            context.globalState.update('takeABreak.codingDate', todayStr);
        }
        else if (savedTime) {
            this._codingTime = savedTime;
        }
        context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => this.updateActivity()), vscode.window.onDidChangeActiveTextEditor(() => this.updateActivity()));
        // Persist every minute
        this._saveInterval = setInterval(() => {
            this.context.globalState.update('takeABreak.codingTime', this._codingTime);
        }, 60000);
    }
    updateActivity() {
        if (this._timerPaused)
            return;
        const now = Date.now();
        // 5-minute inactivity threshold
        if (now - this._lastActiveTime < 300000) {
            this._codingTime += (now - this._lastActiveTime);
        }
        this._lastActiveTime = now;
    }
    getTrackerData() {
        this.updateActivity(); // Trigger calculation on fetch
        return {
            codingTimeMs: this._codingTime
        };
    }
    togglePause() {
        this._timerPaused = !this._timerPaused;
        if (!this._timerPaused) {
            this._lastActiveTime = Date.now(); // Reset baseline on resume
        }
    }
    isPaused() {
        return this._timerPaused;
    }
    resetTime() {
        this._codingTime = 0;
        this._lastActiveTime = Date.now();
        this.context.globalState.update('takeABreak.codingTime', this._codingTime);
    }
}
exports.CodingTimeTracker = CodingTimeTracker;
//# sourceMappingURL=CodingTimeTracker.js.map