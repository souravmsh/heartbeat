import * as vscode from 'vscode';

export class SalahTime {
    private salahData: any = {};

    constructor(private context: vscode.ExtensionContext) {
        this.updateCalculation();
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('timeout.salah.method')) {
                this.updateCalculation();
            }
        });
    }

    public updateCalculation() {
        const config = vscode.workspace.getConfiguration('timeout');
        const method = config.get<string>('salah.method');
        const offsets = config.get<any>('salah.offsets') || {};

        const baseTimes: any = {
            "Fajr": method === "ISNA" ? "05:15" : "05:30",
            "Dhuhr": "12:15",
            "Asr": method === "Jafari" ? "15:30" : "15:45",
            "Maghrib": "18:00",
            "Isha": method === "ISNA" ? "19:15" : "19:30"
        };

        const adjustedTimes: any = {};
        for (const [name, time] of Object.entries(baseTimes)) {
            const offset = offsets[name] || 0;
            if (offset === 0) {
                adjustedTimes[name] = time;
            } else {
                const [h, m] = (time as string).split(':').map(Number);
                const date = new Date(2000, 0, 1, h, m + offset);
                adjustedTimes[name] = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            }
        }

        this.salahData = {
            method,
            times: adjustedTimes,
            offsets
        };
    }

    public getSalahData() {
        return this.salahData;
    }
}
