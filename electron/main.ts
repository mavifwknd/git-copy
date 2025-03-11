import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import simpleGit from "simple-git";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
    // Set minimum window dimensions to ensure the side-by-side diff view works properly
    width: 1024,
    height: 768,
    minWidth: 900,
    minHeight: 600,
    // Center the window
    center: true,
    // Set a title for the window
    title: "Git Diff Viewer"
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  win.webContents.openDevTools();

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);

ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(win as BrowserWindow, {
    properties: ["openDirectory"],
  });
  const folder = result.filePaths[0];
  if (!folder) {
    return { error: "No folder selected." };
  }
  const git = simpleGit(folder);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    return { error: "Folder is not a git repository." };
  }
  const branch = await git.branchLocal();
  return {
    data: {
      path: folder,
      branch: branch.current
    }
  };
});

ipcMain.handle("commits", async (_, { path = "", page = 1, limit = 20 }) => {
  if (!path) return { data: [] };

  const git = simpleGit(path);
  try {
    const skip = (page - 1) * limit;
    const commits = await git.raw([
      "log",
      "--pretty=format:%H|%s|%cd|%ae",
      "--date=iso",
      `-n ${limit}`,
      `--skip=${skip}`,
    ]);

    if (!commits) return { data: [] };

    const data = commits.split("\n").map((line) => {
      const [hash, message, date, author] = line.split("|");
      return { hash, message, date, author };
    });

    return { data };
  } catch (err) {
    return { error: (err as Error).message };
  }
});

// get commit changes files
ipcMain.handle("changes", async (_, { path = "", commitHash = "" }) => {
  if (!path || !commitHash) return { data: [] };

  const git = simpleGit(path);
  try {
    // Using git show --binary instead of git diff
    const changes = await git.raw([
      "show",
      "--binary",
      commitHash
    ]);
    return { data: { changes, commitHash } };
  } catch (err) {
    return { error: (err as Error).message };
  }
});
