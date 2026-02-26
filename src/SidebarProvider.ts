import * as vscode from 'vscode';
import * as fs from 'fs';
import { TaskReminders } from './features/TaskReminders';
import { BreakReminders } from './features/BreakReminders';
import { CodingTimeTracker } from './features/CodingTimeTracker';
import { SalahTime } from './features/SalahTime';
import { CalendarHolidays } from './features/CalendarHolidays';

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext,
        private taskReminders: TaskReminders,
        private breakReminders: BreakReminders,
        private codingTimeTracker: CodingTimeTracker,
        private salahTime: SalahTime,
        private calendarHolidays: CalendarHolidays
    ) { }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'getState':
                    this.sendState();
                    break;
                case 'addTask':
                    this.taskReminders.addTask(data.value.name, data.value.date, data.value.highPriority);
                    this.sendState();
                    break;
                case 'removeTask':
                    this.taskReminders.removeTask(data.value);
                    this.sendState();
                    break;
                case 'editTask':
                    this.taskReminders.editTask(data.value.id, data.value.name, data.value.date, data.value.highPriority);
                    this.sendState();
                    break;
                case 'addBreak':
                    this.breakReminders.addBreak(data.value.name, data.value.interval);
                    this.sendState();
                    break;
                case 'removeBreak':
                    this.breakReminders.removeBreak(data.value);
                    this.sendState();
                    break;
                case 'toggleTimer':
                    this.codingTimeTracker.togglePause();
                    this.sendState();
                    break;
                case 'resetTimer':
                    this.codingTimeTracker.resetTime();
                    this.sendState();
                    break;
                case 'saveSettings':
                    this.saveSettings(data.value);
                    break;
                case 'browseHolidays':
                    this.browseHolidays();
                    break;
                case 'updateCardOrder':
                    this.updateCardOrder(data.value);
                    break;
                case 'downloadSample':
                    this.downloadSample();
                    break;
                case 'showNativeNotification':
                    vscode.window.showInformationMessage(data.value);
                    break;
                case 'toastAction':
                    this.handleToastAction(data.value);
                    break;
                case 'overlayAction':
                    this.handleOverlayAction(data.value);
                    break;
            }
        });

        // Break Reminder -> Webview Toast + Native
        this.breakReminders.onReminder = (br) => {
            const msg = `Time to ${br.name}!`;

            // 1. Show Native Notification
            vscode.window.showInformationMessage(msg, "Dismiss", "Snooze").then(selection => {
                if (selection === "Snooze") {
                    this.breakReminders.snoozeBreak(br.id);
                }
            });

            // 2. Show Sidebar Toast
            this._view?.webview.postMessage({
                type: 'showNotification',
                value: {
                    message: msg,
                    type: 'info',
                    actions: [
                        { id: 'dismiss', label: 'Dismiss', primary: false, actionId: 'dismiss', breakId: br.id },
                        { id: 'snooze', label: 'Snooze 5m', primary: true, actionId: 'snooze', breakId: br.id }
                    ]
                }
            });
        };

        // Send tick updates to webview
        setInterval(() => {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'tickTimer',
                    value: this.codingTimeTracker.getTrackerData()
                });
            }
        }, 1000);

        // Holiday Reminder -> Webview Toast + Native
        this.calendarHolidays.onReminder = (holiday) => {
            const msg = `Holiday Alert: ${holiday.name} starts tomorrow! glue`;
            vscode.window.showInformationMessage(msg);

            this._view?.webview.postMessage({
                type: 'showNotification',
                value: {
                    message: msg,
                    type: 'info'
                }
            });
        };
    }

    private async saveSettings(settings: any) {
        const config = vscode.workspace.getConfiguration('timeout');
        if (settings.type === 'calendar') {
            await config.update('holidays.source', settings.holidaysPath, vscode.ConfigurationTarget.Global);
            await config.update('calendar.weekends', settings.weekends, vscode.ConfigurationTarget.Global);
            await this.calendarHolidays.loadHolidays();
        } else if (settings.type === 'salah') {
            await config.update('salah.method', settings.salahMethod, vscode.ConfigurationTarget.Global);
            await config.update('salah.offsets', settings.salahOffsets, vscode.ConfigurationTarget.Global);
            this.salahTime.updateCalculation();
        }

        this._view?.webview.postMessage({
            type: 'showNotification',
            value: { message: 'Settings saved!', type: 'success' }
        });
        this.sendState();
    }

    private async browseHolidays() {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Select Holidays File',
            filters: {
                'JSON/CSV Files': ['json', 'csv']
            }
        };

        const fileUri = await vscode.window.showOpenDialog(options);
        if (fileUri && fileUri[0]) {
            const config = vscode.workspace.getConfiguration('timeout');
            await config.update('holidays.source', fileUri[0].fsPath, vscode.ConfigurationTarget.Global);
            await this.calendarHolidays.loadHolidays();

            this._view?.webview.postMessage({
                type: 'showNotification',
                value: { message: 'Holidays file updated!', type: 'success' }
            });
            this.sendState();
        }
    }

    private handleToastAction(value: any) {
        if (value.actionId === "snooze") {
            this.breakReminders.snoozeBreak(value.breakId);
        }
    }

    private async updateCardOrder(order: string[]) {
        await this._context.globalState.update('timeout.cardOrder', order);
    }

    private handleOverlayAction(action: string) {
        // This is handled inside showFullscreenAlert for specific break instance
        // but adding here for consistency if needed
    }

    private async downloadSample() {
        const sampleHolidays = [
            {
                "name": "New Year's Day",
                "startDate": "2026-01-01",
                "endDate": "2026-01-01"
            },
            {
                "name": "Eid-ul-Fitr",
                "startDate": "2026-03-20",
                "endDate": "2026-03-22"
            },
            {
                "name": "Independence Day",
                "startDate": "2026-03-26",
                "endDate": "2026-03-26"
            }
        ];

        const defaultUri = vscode.workspace.workspaceFolders
            ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'holidays_sample.json')
            : vscode.Uri.file('/tmp/holidays_sample.json');

        const uri = await vscode.window.showSaveDialog({
            defaultUri: defaultUri,
            filters: { 'JSON Files': ['json'] },
            title: 'Save Sample Holidays File'
        });

        if (uri) {
            fs.writeFileSync(uri.fsPath, JSON.stringify(sampleHolidays, null, 4));
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);
            this._view?.webview.postMessage({
                type: 'showNotification',
                value: { message: 'Sample holidays.json created!', type: 'success' }
            });
        }
    }

    public sendState() {
        if (!this._view) return;
        const config = vscode.workspace.getConfiguration('timeout');
        this._view.webview.postMessage({
            type: 'updateState',
            value: {
                tasks: this.taskReminders.getTasks(),
                breaks: this.breakReminders.getBreaks(),
                codingTimeMs: this.codingTimeTracker.getTrackerData().codingTimeMs,
                timerPaused: this.codingTimeTracker.isPaused(),
                holidays: this.calendarHolidays.getHolidays(),
                salahData: this.salahTime.getSalahData(),
                holidaysPath: config.get<string>('holidays.source'),
                weekends: config.get<number[]>('calendar.weekends'),
                cardOrder: this._context.globalState.get<string[]>('timeout.cardOrder')
            }
        });
    }

    public refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
            this.sendState();
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css"));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.js"));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "style.css"));
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, "media", "index.html");

        let html = fs.readFileSync(htmlPath.fsPath, 'utf-8');

        html = html.replace('${styleResetUri}', styleResetUri.toString())
            .replace('${styleVSCodeUri}', styleVSCodeUri.toString())
            .replace('${styleMainUri}', styleMainUri.toString())
            .replace('${scriptUri}', scriptUri.toString());

        return html;
    }
}
