# Heartbeat - VS Code Extension

Heartbeat is a comprehensive Visual Studio Code extension designed to help developers manage productivity, health breaks, tasks, and daily activity directly from their editor.

## Features

- **Daily Task Reminders:** Create and manage a list of tasks with optional due dates and receive notifications.
- **Break Reminders:** Get recurring alerts to drink water, stretch, or take a custom break.
- **Calendar & Holidays:** View upcoming holidays imported from CSV or JSON. Receive alerts 1 day before a holiday starts.
- **Coding Time Tracker:** Automatically track your active coding session time inside VS Code.
- **Salah Time Watch:** Display current and upcoming prayer times, customizable directly from settings.
- **Sidebar Application UI:** A dedicated webview panel containing all features.

## Usage

1. Click on the **Heartbeat** icon (pulse) in the Activity Bar on the left side of your VS Code window.
2. The dashboard will open, showing your tasks, break reminders, coding time, Salah watch, and calendar.
3. **Configure Settings:** 
   Go to **Preferences: Open Settings** (or press `Ctrl+,`) and search for `Heartbeat` to customize:
   - `heartbeat.breaks.interval`: The interval for break reminders in minutes.
   - `heartbeat.holidays.source`: Absolute path to your custom `holidays.json` or `holidays.csv`.
   - `heartbeat.salah.method`: Method for calculating Salah times.

## How to Build from Git

Follow these steps to clone the repository, run the extension locally, or package it into an installable `.vsix` file.

### Prerequisites
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (which includes npm)
- [Visual Studio Code](https://code.visualstudio.com/)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd heartbeat
```

*(Note: If you have already created the folder, just navigate to it: `cd path/to/heartbeat`)*

### 2. Install Dependencies

```bash
npm install
```

### 3. Run and Debug Locally

1. Open the project folder in VS Code:
   ```bash
   code .
   ```
2. Press **F5** (or go to **Run > Start Debugging**).
3. This will compile the TypeScript code and launch a new **Extension Development Host** window.
4. In the new window, click the clock icon on the left Activity Bar to test the extension UI and functionality.

### 4. Package the Extension (for installation)

If you want to install it permanently or share it with others, you can create a `.vsix` package format payload:

1. Install `vsce` (the Visual Studio Code Extension publisher) globally:
   ```bash
   npm install -g @vscode/vsce
   ```
2. Run the packaging command in the project root:
   ```bash
   vsce package
   ```
   *Note: If `vsce` warns about a missing `repository` field in `package.json`, you can safely say "yes" (Y) to continue anyway.*
3. A file named `heartbeat-1.0.0.vsix` will be generated in your folder.
4. **To install it:** Open your regular VS Code, go to the **Extensions view** (`Ctrl+Shift+X`), click the **`...`** (more) menu in the top right of the sidebar, select **Install from VSIX...**, and then select the generated file.

## License
MIT
