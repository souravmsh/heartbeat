import * as vscode from 'vscode';
import * as fs from 'fs';

export class CalendarHolidays {
    private _holidays: any[] = [];
    public onReminder?: (holiday: any) => void;

    constructor() {
        this.loadHolidays();
        // check daily
        setInterval(() => this.checkUpcomingHolidays(), 24 * 60 * 60 * 1000);
    }

    public async loadHolidays() {
        const config = vscode.workspace.getConfiguration('timeout');
        const sourceFilePath = config.get<string>('holidays.source');

        if (sourceFilePath && fs.existsSync(sourceFilePath)) {
            try {
                const fileContent = fs.readFileSync(sourceFilePath, 'utf-8');
                if (sourceFilePath.endsWith('.json')) {
                    this._holidays = JSON.parse(fileContent);
                } else if (sourceFilePath.endsWith('.csv')) {
                    // Simple CSV parsing
                    const lines = fileContent.split('\n');
                    this._holidays = lines.slice(1).map(line => {
                        const parts = line.split(',');
                        if (parts.length < 2) return null;
                        const [name, start, end] = parts;
                        return {
                            name: name.replace(/"/g, ''),
                            startDate: start.trim(),
                            endDate: (end || start).trim()
                        };
                    }).filter(Boolean);
                }
                this.checkUpcomingHolidays();
            } catch (e) {
                console.error("Failed to parse holidays file", e);
            }
        } else {
            this._holidays = [];
        }
    }

    private checkUpcomingHolidays() {
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

    public getHolidays() {
        return this._holidays;
    }
}
