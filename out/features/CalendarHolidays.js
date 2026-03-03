"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarHolidays = void 0;
const vscode = require("vscode");
const fs = require("fs");
class CalendarHolidays {
    constructor() {
        this._holidays = [];
        this.loadHolidays();
        // check daily
        setInterval(() => this.checkUpcomingHolidays(), 24 * 60 * 60 * 1000);
    }
    async loadHolidays() {
        const config = vscode.workspace.getConfiguration('heartbeat');
        const sourceFilePath = config.get('holidays.source');
        if (sourceFilePath && fs.existsSync(sourceFilePath)) {
            try {
                const fileContent = fs.readFileSync(sourceFilePath, 'utf-8');
                let rawHolidays = [];
                if (sourceFilePath.endsWith('.json')) {
                    rawHolidays = JSON.parse(fileContent);
                }
                else if (sourceFilePath.endsWith('.csv')) {
                    const lines = fileContent.split('\n');
                    rawHolidays = lines.slice(1).map(line => {
                        const parts = line.split(',');
                        if (parts.length < 2)
                            return null;
                        const [name, start, end] = parts;
                        return {
                            name: name.replace(/"/g, '').trim(),
                            startDate: start.trim(),
                            endDate: (end || start).trim()
                        };
                    }).filter(Boolean);
                }
                // Normalize dates to YYYY-MM-DD
                this._holidays = rawHolidays.map((h) => ({
                    ...h,
                    startDate: this.normalizeDate(h.startDate),
                    endDate: h.endDate ? this.normalizeDate(h.endDate) : this.normalizeDate(h.startDate)
                }));
                this.checkUpcomingHolidays();
            }
            catch (e) {
                console.error("Failed to parse holidays file", e);
            }
        }
        else {
            this._holidays = [];
        }
    }
    normalizeDate(dateStr) {
        if (!dateStr)
            return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const y = parts[0];
            const m = parts[1].padStart(2, '0');
            const d = parts[2].padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        return dateStr;
    }
    checkUpcomingHolidays() {
        const today = new Date();
        const tomorrowDate = new Date();
        tomorrowDate.setDate(today.getDate() + 1);
        const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
        this._holidays.forEach(holiday => {
            if (holiday.startDate === tomorrowStr && this.onReminder) {
                this.onReminder(holiday);
            }
        });
    }
    getHolidays() {
        return this._holidays;
    }
}
exports.CalendarHolidays = CalendarHolidays;
//# sourceMappingURL=CalendarHolidays.js.map