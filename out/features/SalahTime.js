"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalahTime = void 0;
const vscode = require("vscode");
class SalahTime {
    constructor(context) {
        this.context = context;
        this.salahData = {};
        this.updateCalculation();
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('heartbeat.salah.method')) {
                this.updateCalculation();
            }
        });
    }
    updateCalculation() {
        const config = vscode.workspace.getConfiguration('heartbeat');
        const method = config.get('salah.method');
        const offsets = config.get('salah.offsets') || {};
        const baseTimes = {
            "Fajr": method === "ISNA" ? "05:15" : "05:30",
            "Dhuhr": "12:15",
            "Asr": method === "Jafari" ? "15:30" : "15:45",
            "Maghrib": "18:00",
            "Isha": method === "ISNA" ? "19:15" : "19:30"
        };
        const adjustedTimes = {};
        for (const [name, time] of Object.entries(baseTimes)) {
            const offset = offsets[name] || 0;
            if (offset === 0) {
                adjustedTimes[name] = time;
            }
            else {
                const [h, m] = time.split(':').map(Number);
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
    getSalahData() {
        return this.salahData;
    }
}
exports.SalahTime = SalahTime;
//# sourceMappingURL=SalahTime.js.map