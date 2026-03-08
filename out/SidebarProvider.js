"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarProvider = void 0;
const vscode = require("vscode");
const fs = require("fs");
class SidebarProvider {
    constructor(_extensionUri, _context, taskReminders, breakReminders, codingTimeTracker, salahTime, calendarHolidays, dailyReminders) {
        this._extensionUri = _extensionUri;
        this._context = _context;
        this.taskReminders = taskReminders;
        this.breakReminders = breakReminders;
        this.codingTimeTracker = codingTimeTracker;
        this.salahTime = salahTime;
        this.calendarHolidays = calendarHolidays;
        this.dailyReminders = dailyReminders;
    }
    resolveWebviewView(webviewView) {
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
                    this.taskReminders.addTask(data.value.title, data.value.content, data.value.date, data.value.highPriority, data.value.time, data.value.secret);
                    this.sendState();
                    break;
                case 'removeTask':
                    this.taskReminders.removeTask(data.value);
                    this.sendState();
                    break;
                case 'editTask':
                    this.taskReminders.editTask(data.value.id, data.value.title, data.value.content, data.value.date, data.value.highPriority, data.value.time, data.value.secret);
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
                case 'addDailyReminder':
                    this.dailyReminders.addReminder(data.value.name, data.value.time, data.value.date);
                    this.sendState();
                    break;
                case 'removeDailyReminder':
                    this.dailyReminders.removeReminder(data.value);
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
                case 'exportSettings':
                    this.exportSettings();
                    break;
                case 'importSettings':
                    this.importSettings();
                    break;
                case 'browseCentralFile':
                    this.browseCentralFile();
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
        // Sync with central file on startup if configured
        this.syncWithCentralFile();
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
        // Task Reminder (Meeting) -> Webview Toast + Native
        this.taskReminders.onReminder = (task) => {
            const msg = `Meeting Reminder: ${task.title}`;
            vscode.window.showInformationMessage(msg);
            this._view?.webview.postMessage({
                type: 'showNotification',
                value: { message: msg, type: 'warning' }
            });
        };
        // Daily Reminder -> Webview Toast + Native
        this.dailyReminders.onReminder = (dr) => {
            const msg = `Daily Reminder: ${dr.name}`;
            vscode.window.showInformationMessage(msg);
            this._view?.webview.postMessage({
                type: 'showNotification',
                value: { message: msg, type: 'info' }
            });
        };
        this.taskReminders.onSchedulePreview = (tasks) => {
            const list = tasks.map(t => `- ${t.time || 'All day'}: ${t.title}`).join('\n');
            const msg = `Schedule for Tomorrow:\n${list}`;
            vscode.window.showInformationMessage(msg);
            this._view?.webview.postMessage({
                type: 'showNotification',
                value: { message: msg, type: 'info' }
            });
        };
    }
    async syncWithCentralFile() {
        const config = vscode.workspace.getConfiguration('heartbeat');
        const centralFile = config.get('settings.centralFile');
        if (centralFile && fs.existsSync(centralFile)) {
            try {
                const content = fs.readFileSync(centralFile, 'utf-8');
                const data = JSON.parse(content);
                await this.applySettings(data, false); // Don't notify on auto-load
            }
            catch (err) {
                console.error('Failed to sync with central file:', err);
            }
        }
    }
    async exportSettings() {
        const config = vscode.workspace.getConfiguration('heartbeat');
        const data = {
            tasks: this.taskReminders.getTasks(),
            breaks: this.breakReminders.getBreaks(),
            codingTime: this._context.globalState.get('heartbeat.codingTime'),
            codingDate: this._context.globalState.get('heartbeat.codingDate'),
            cardOrder: this._context.globalState.get('heartbeat.cardOrder'),
            settings: {
                breaksInterval: config.get('breaks.interval'),
                salahMethod: config.get('salah.method'),
                holidaysSource: config.get('holidays.source'),
                calendarWeekends: config.get('calendar.weekends'),
                salahOffsets: config.get('salah.offsets'),
                centralFile: config.get('settings.centralFile')
            }
        };
        const uri = await vscode.window.showSaveDialog({
            filters: { 'JSON Files': ['json'] },
            title: 'Export Heartbeat Settings'
        });
        if (uri) {
            fs.writeFileSync(uri.fsPath, JSON.stringify(data, null, 4));
            this._view?.webview.postMessage({
                type: 'showNotification',
                value: { message: 'Settings exported successfully!', type: 'success' }
            });
        }
    }
    async importSettings() {
        const uri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { 'JSON Files': ['json'] },
            title: 'Import Heartbeat Settings'
        });
        if (uri && uri[0]) {
            try {
                const content = fs.readFileSync(uri[0].fsPath, 'utf-8');
                const data = JSON.parse(content);
                await this.applySettings(data);
                this._view?.webview.postMessage({
                    type: 'showNotification',
                    value: { message: 'Settings imported successfully!', type: 'success' }
                });
                this.sendState();
            }
            catch (err) {
                vscode.window.showErrorMessage('Failed to import settings: ' + err);
            }
        }
    }
    async applySettings(data, notify = true) {
        if (data.tasks)
            await this._context.globalState.update('heartbeat.tasks.v3', data.tasks);
        if (data.breaks)
            await this._context.globalState.update('heartbeat.breaks', data.breaks);
        if (data.dailyReminders)
            await this._context.globalState.update('heartbeat.dailyReminders', data.dailyReminders);
        if (data.schedulePreviewTime) {
            this.taskReminders.schedulePreviewTime = data.schedulePreviewTime;
            await this._context.globalState.update('heartbeat.schedulePreviewTime', data.schedulePreviewTime);
        }
        if (data.codingTime !== undefined)
            await this._context.globalState.update('heartbeat.codingTime', data.codingTime);
        if (data.codingDate)
            await this._context.globalState.update('heartbeat.codingDate', data.codingDate);
        if (data.cardOrder)
            await this._context.globalState.update('heartbeat.cardOrder', data.cardOrder);
        if (data.settings) {
            const config = vscode.workspace.getConfiguration('heartbeat');
            if (data.settings.breaksInterval !== undefined)
                await config.update('breaks.interval', data.settings.breaksInterval, vscode.ConfigurationTarget.Global);
            if (data.settings.salahMethod)
                await config.update('salah.method', data.settings.salahMethod, vscode.ConfigurationTarget.Global);
            if (data.settings.holidaysSource)
                await config.update('holidays.source', data.settings.holidaysSource, vscode.ConfigurationTarget.Global);
            if (data.settings.calendarWeekends)
                await config.update('calendar.weekends', data.settings.calendarWeekends, vscode.ConfigurationTarget.Global);
            if (data.settings.salahOffsets)
                await config.update('salah.offsets', data.settings.salahOffsets, vscode.ConfigurationTarget.Global);
            if (data.settings.centralFile !== undefined)
                await config.update('settings.centralFile', data.settings.centralFile, vscode.ConfigurationTarget.Global);
        }
        // Reload data in features
        this.taskReminders.loadTasks();
        this.breakReminders.loadBreaks();
        this.codingTimeTracker.loadTime();
        this.salahTime.updateCalculation();
        await this.calendarHolidays.loadHolidays();
        this.dailyReminders.loadReminders();
    }
    async browseCentralFile() {
        const options = {
            canSelectMany: false,
            openLabel: 'Select Central Settings File',
            filters: { 'JSON Files': ['json'] }
        };
        const fileUri = await vscode.window.showOpenDialog(options);
        if (fileUri && fileUri[0]) {
            const config = vscode.workspace.getConfiguration('heartbeat');
            await config.update('settings.centralFile', fileUri[0].fsPath, vscode.ConfigurationTarget.Global);
            // Optionally load from it immediately
            await this.syncWithCentralFile();
            this._view?.webview.postMessage({
                type: 'showNotification',
                value: { message: 'Central settings file updated!', type: 'success' }
            });
            this.sendState();
        }
    }
    async saveSettings(settings) {
        const config = vscode.workspace.getConfiguration('heartbeat');
        if (settings.type === 'calendar') {
            await config.update('holidays.source', settings.holidaysPath, vscode.ConfigurationTarget.Global);
            await config.update('calendar.weekends', settings.weekends, vscode.ConfigurationTarget.Global);
            await this.calendarHolidays.loadHolidays();
        }
        else if (settings.type === 'salah') {
            await config.update('salah.method', settings.salahMethod, vscode.ConfigurationTarget.Global);
            await config.update('salah.offsets', settings.salahOffsets, vscode.ConfigurationTarget.Global);
            this.salahTime.updateCalculation();
        }
        else if (settings.type === 'general') {
            await config.update('settings.centralFile', settings.centralFile, vscode.ConfigurationTarget.Global);
            await this.syncWithCentralFile();
        }
        this._view?.webview.postMessage({
            type: 'showNotification',
            value: { message: 'Settings saved!', type: 'success' }
        });
        this.sendState();
    }
    async browseHolidays() {
        const options = {
            canSelectMany: false,
            openLabel: 'Select Holidays File',
            filters: {
                'JSON/CSV Files': ['json', 'csv']
            }
        };
        const fileUri = await vscode.window.showOpenDialog(options);
        if (fileUri && fileUri[0]) {
            const config = vscode.workspace.getConfiguration('heartbeat');
            await config.update('holidays.source', fileUri[0].fsPath, vscode.ConfigurationTarget.Global);
            await this.calendarHolidays.loadHolidays();
            this._view?.webview.postMessage({
                type: 'showNotification',
                value: { message: 'Holidays file updated!', type: 'success' }
            });
            this.sendState();
        }
    }
    handleToastAction(value) {
        if (value.actionId === "snooze") {
            this.breakReminders.snoozeBreak(value.breakId);
        }
    }
    async updateCardOrder(order) {
        await this._context.globalState.update('heartbeat.cardOrder', order);
    }
    handleOverlayAction(action) {
        // This is handled inside showFullscreenAlert for specific break instance
        // but adding here for consistency if needed
    }
    async downloadSample() {
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
    sendState() {
        if (!this._view)
            return;
        const config = vscode.workspace.getConfiguration('heartbeat');
        this._view.webview.postMessage({
            type: 'updateState',
            value: {
                tasks: this.taskReminders.getTasks(),
                breaks: this.breakReminders.getBreaks(),
                dailyReminders: this.dailyReminders.getReminders(),
                codingTimeMs: this.codingTimeTracker.getTrackerData().codingTimeMs,
                timerPaused: this.codingTimeTracker.isPaused(),
                holidays: this.calendarHolidays.getHolidays(),
                salahData: this.salahTime.getSalahData(),
                holidaysPath: config.get('holidays.source'),
                weekends: config.get('calendar.weekends'),
                centralFile: config.get('settings.centralFile'),
                cardOrder: this._context.globalState.get('heartbeat.cardOrder') || this._context.globalState.get('timeout.cardOrder'),
                schedulePreviewTime: this.taskReminders.schedulePreviewTime
            }
        });
    }
    refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
            this.sendState();
        }
    }
    _getHtmlForWebview(webview) {
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
exports.SidebarProvider = SidebarProvider;
//# sourceMappingURL=SidebarProvider.js.map