import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'ROSE AI',
    backgroundColor: '#040814',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function formatBangladeshPhone(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (digits.startsWith('01') && digits.length === 11) {
    return `880${digits.slice(1)}`;
  }
  if (digits.startsWith('0')) {
    return `880${digits.slice(1)}`;
  }
  return digits;
}

async function pressEnterKey() {
  try {
    const nut = await import('@nut-tree-fork/nut-js');
    if (nut?.keyboard && nut?.Key) {
      await nut.keyboard.pressKey(nut.Key.Enter);
      await nut.keyboard.releaseKey(nut.Key.Enter);
      return;
    }
  } catch {
    // Fallback to PowerShell SendKeys on Windows if @nut-tree-fork/nut-js is not loaded
  }

  if (process.platform === 'win32') {
    const psCommand = `$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('{ENTER}')`;
    await new Promise((resolve, reject) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psCommand],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
    return;
  }

  throw new Error('@nut-tree-fork/nut-js keyboard automation is not available on this OS.');
}

async function typeTextWithNutOrFallback(text) {
  try {
    const nut = await import('@nut-tree-fork/nut-js');
    if (nut?.keyboard) {
      await nut.keyboard.type(String(text));
      return;
    }
  } catch {
    // Fallback to PowerShell SendKeys on Windows
  }

  if (process.platform === 'win32') {
    const escaped = String(text).replace(/'/g, "''");
    const psCommand = `$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${escaped}')`;
    await new Promise((resolve, reject) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psCommand],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
    return;
  }

  throw new Error('@nut-tree-fork/nut-js keyboard automation is not available on this OS.');
}

// Safe IPC handlers — Locked actions (delete files, payments, passwords, install/uninstall) are NEVER exposed.

ipcMain.handle('pc:status', async () => {
  return {
    connected: true,
    platform: process.platform,
  };
});

ipcMain.handle('pc:openExternal', async (_event, target) => {
  if (typeof target !== 'string' || !target.trim()) {
    throw new Error('Invalid target');
  }
  const cleanTarget = target.trim();
  if (/^https?:\/\//i.test(cleanTarget)) {
    await shell.openExternal(cleanTarget);
    return { ok: true };
  }
  const errMsg = await shell.openPath(cleanTarget);
  if (errMsg) {
    throw new Error(errMsg);
  }
  return { ok: true };
});

ipcMain.handle('pc:typeText', async (_event, text) => {
  if (typeof text !== 'string' || !text) {
    throw new Error('No text provided');
  }
  await typeTextWithNutOrFallback(text);
  return { ok: true };
});

ipcMain.handle('pc:readFile', async (_event, filePath) => {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new Error('Invalid file path');
  }
  const resolved = path.resolve(filePath.trim());
  const content = await fs.readFile(resolved, 'utf-8');
  return {
    ok: true,
    name: path.basename(resolved),
    content: content.slice(0, 100000),
  };
});

// 1. sendWhatsApp(phone, text): open whatsapp://send?phone=<880 format>&text=<encoded text> with shell.openExternal, wait ~4s, then press Enter.
ipcMain.handle('pc:sendWhatsApp', async (_event, phone, text) => {
  const formattedPhone = formatBangladeshPhone(phone);
  if (!formattedPhone) {
    throw new Error('সঠিক ফোন নম্বর দেওয়া হয়নি।');
  }
  const exactText = String(text ?? '');
  const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(exactText)}`;
  await shell.openExternal(url);
  await new Promise((resolve) => setTimeout(resolve, 4000));
  await pressEnterKey();
  return { ok: true, phone: formattedPhone };
});

// 2. sendMessenger(name, text): open https://www.messenger.com in a window, search the name, type the text and press Enter. If contact not found, stop and tell the user.
ipcMain.handle('pc:sendMessenger', async (_event, name, text) => {
  const contactName = String(name || '').trim();
  const exactText = String(text ?? '');
  if (!contactName) {
    throw new Error('মেসেঞ্জার কন্টাক্টের নাম দেওয়া হয়নি।');
  }

  const msgWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    title: `Messenger — ${contactName}`,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  await msgWindow.loadURL('https://www.messenger.com');
  await new Promise((resolve) => setTimeout(resolve, 3500));

  // Focus the search box in Messenger
  const searchFocused = await msgWindow.webContents.executeJavaScript(`
    (() => {
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"], input[aria-label*="Search"], input[aria-label*="সার্চ"]');
      if (!searchInput) return false;
      searchInput.focus();
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()
  `);

  if (!searchFocused) {
    throw new Error('Messenger সার্চ বক্স পাওয়া যায়নি (সম্ভবত লগইন করা নেই)।');
  }

  await typeTextWithNutOrFallback(contactName);
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Verify contact exists in search results and click it
  const contactFound = await msgWindow.webContents.executeJavaScript(`
    (() => {
      const target = ${JSON.stringify(contactName.toLowerCase())};
      const items = Array.from(document.querySelectorAll('[role="listbox"] [role="option"], [role="gridcell"] a, ul li a, [role="presentation"] a'));
      const match = items.find(el => (el.innerText || el.textContent || '').toLowerCase().includes(target));
      if (!match) return false;
      match.click();
      return true;
    })()
  `);

  if (!contactFound) {
    throw new Error(`Messenger-এ "${contactName}" নামের কোনো কন্টাক্ট পাওয়া যায়নি।`);
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Focus the message composer, type the exact approved text, and press Enter
  await msgWindow.webContents.executeJavaScript(`
    (() => {
      const box = document.querySelector('[role="textbox"][contenteditable="true"], div[aria-label*="Message"], div[aria-label*="মেসেজ"]');
      if (box) box.focus();
    })()
  `);

  await typeTextWithNutOrFallback(exactText);
  await new Promise((resolve) => setTimeout(resolve, 400));
  await pressEnterKey();

  return { ok: true, name: contactName };
});

// 3. playMedia(name): open YouTube search in the browser
ipcMain.handle('pc:playMedia', async (_event, name) => {
  const query = String(name || '').trim();
  if (!query) {
    throw new Error('গান বা ভিডিওর নাম দেওয়া হয়নি।');
  }
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  await shell.openExternal(url);
  return { ok: true, url };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
