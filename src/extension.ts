import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { TaskReminders } from './features/TaskReminders';
import { BreakReminders } from './features/BreakReminders';
import { CodingTimeTracker } from './features/CodingTimeTracker';
import { SalahTime } from './features/SalahTime';
import { CalendarHolidays } from './features/CalendarHolidays';

export function activate(context: vscode.ExtensionContext) {
    // Instantiate features
    const taskReminders = new TaskReminders(context);
    const breakReminders = new BreakReminders(context);
    const codingTracker = new CodingTimeTracker(context);
    const salahTime = new SalahTime(context);
    const holidays = new CalendarHolidays();

    // Register the Sidebar Panel
    const sidebarProvider = new SidebarProvider(
        context.extensionUri,
        context,
        taskReminders,
        breakReminders,
        codingTracker,
        salahTime,
        holidays
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "timeout.sidebarView",
            sidebarProvider
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('timeout.refresh', () => {
            sidebarProvider.refresh();
            vscode.window.showInformationMessage('Timeout dashboard refreshed!');
        })
    );
}

export function deactivate() { }
