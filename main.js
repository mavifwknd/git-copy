const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const fse = require("fs-extra");
const simpleGit = require("simple-git");

let mainWindow;
let repoPath = process.cwd(); // default to current folder
let git = simpleGit(repoPath);

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile("index.html");
  mainWindow.setMenu(null);
  // mainWindow.webContents.openDevTools();
});

// Folder picker to choose a Git repository folder
ipcMain.handle("pick-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  repoPath = result.filePaths[0];
  // Reinitialize git instance with the new repo path
  git = simpleGit(repoPath);
  return repoPath;
});

// Fetch commit history from the currently selected repository
ipcMain.handle("get-commits", async (event, { page = 1, limit = 10 }) => {
  try {
    const skip = (page - 1) * limit;
    const commits = await git.raw([
      "log",
      "--pretty=format:%H|%s|%cd",
      "--date=iso",
      `-n ${limit}`,
      `--skip=${skip}`,
    ]);

    if (!commits) return [];

    return commits.split("\n").map((line) => {
      const [hash, message, date] = line.split("|");
      return { hash, message, date };
    });
  } catch (err) {
    console.error("Git Error:", err.message);
    return [];
  }
});

// Get changed files from selected commit hashes
ipcMain.handle("get-changed-files", async (event, commitHashes) => {
  if (!commitHashes.length) return "No commits selected.";

  try {
    let fileSet = new Set();
    for (const commit of commitHashes) {
      const diffOutput = await git.raw([
        "show",
        "--name-only",
        "--pretty=format:",
        commit,
      ]);
      diffOutput
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean)
        .forEach((file) => fileSet.add(file));
    }
    return Array.from(fileSet);
  } catch (err) {
    console.error("Git Error:", err);
    return [];
  }
});

// Copy the latest version of selected files from the repository to an output folder
ipcMain.handle("copy-changed-files", async (event, commitHashes) => {
  if (!commitHashes.length) return "No commits selected.";

  // Ask user for destination folder
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return "Copy operation canceled.";
  }

  const outputDir = result.filePaths[0];

  try {
    let fileSet = new Set();
    for (const commit of commitHashes) {
      const diffOutput = await git.raw([
        "show",
        "--name-only",
        "--pretty=format:",
        commit,
      ]);
      diffOutput
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean)
        .forEach((file) => fileSet.add(file));
    }

    for (const file of fileSet) {
      const sourcePath = path.join(repoPath, file);
      const destPath = path.join(outputDir, file);

      try {
        fse.ensureDirSync(path.dirname(destPath));
        fs.copyFileSync(sourcePath, destPath);
      } catch (err) {
        console.error(`Error copying ${file}:`, err);
      }
    }

    return `Copied ${fileSet.size} files to ${outputDir}`;
  } catch (err) {
    console.error("Git Error:", err);
    return `Error copying files: ${err.message}`;
  }
});

// Get available branches
ipcMain.handle("get-branches", async () => {
  try {
    const branches = await git.branchLocal();
    return branches.all; // List of branch names
  } catch (err) {
    console.error("Error getting branches:", err);
    return [];
  }
});

// Switch branch
ipcMain.handle("switch-branch", async (event, branchName) => {
  try {
    await git.checkout(branchName);
    return `Switched to branch: ${branchName}`;
  } catch (err) {
    console.error("Error switching branches:", err);
    return `Failed to switch to ${branchName}: ${err.message}`;
  }
});
