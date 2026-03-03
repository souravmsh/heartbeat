"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const SidebarProvider_1 = require("./SidebarProvider");
const TaskReminders_1 = require("./features/TaskReminders");
const BreakReminders_1 = require("./features/BreakReminders");
const CodingTimeTracker_1 = require("./features/CodingTimeTracker");
const SalahTime_1 = require("./features/SalahTime");
const CalendarHolidays_1 = require("./features/CalendarHolidays");
function activate(context) {
    // Instantiate features
    const taskReminders = new TaskReminders_1.TaskReminders(context);
    const breakReminders = new BreakReminders_1.BreakReminders(context);
    const codingTracker = new CodingTimeTracker_1.CodingTimeTracker(context);
    const salahTime = new SalahTime_1.SalahTime(context);
    const holidays = new CalendarHolidays_1.CalendarHolidays();
    // Register the Sidebar Panel
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri, context, taskReminders, breakReminders, codingTracker, salahTime, holidays);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("heartbeat.sidebarView", sidebarProvider));
    context.subscriptions.push(vscode.commands.registerCommand('heartbeat.refresh', () => {
        sidebarProvider.refresh();
        vscode.window.showInformationMessage('Heartbeat dashboard refreshed!');
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map