"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakReminders = void 0;
class BreakReminders {
    constructor(context) {
        this.context = context;
        this._breaks = [];
        this._intervals = [];
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
    addBreak(name, interval) {
        this._breaks.push({ id: Date.now().toString(), name, interval });
        this.saveBreaks();
        this.startReminders();
    }
    removeBreak(id) {
        this._breaks = this._breaks.filter(b => b.id !== id);
        this.saveBreaks();
        this.startReminders();
    }
    snoozeBreak(id, minutes = 5) {
        const br = this._breaks.find(b => b.id === id);
        if (br) {
            setTimeout(() => {
                if (this.onReminder)
                    this.onReminder(br);
            }, minutes * 60 * 1000);
        }
    }
    getBreaks() {
        return this._breaks;
    }
    loadBreaks() {
        const data = this.context.globalState.get('takeABreak.breaks');
        if (data) {
            this._breaks = data;
        }
    }
    saveBreaks() {
        this.context.globalState.update('takeABreak.breaks', this._breaks);
    }
    startReminders() {
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
exports.BreakReminders = BreakReminders;
//# sourceMappingURL=BreakReminders.js.map