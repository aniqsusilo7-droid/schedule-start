const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');

let tray = null;
let alarmWindow = null;

// Fungsi untuk membuat jendela alarm full screen
function triggerAlarm() {
  if (alarmWindow) return; // Jangan buat jika sudah ada

  alarmWindow = new BrowserWindow({
    fullscreen: true, // Membuatnya full screen
    alwaysOnTop: true, // Memaksa jendela berada di atas aplikasi lain
    skipTaskbar: true, // (Opsional) Tidak muncul di taskbar
    frame: false, // Menghilangkan border dan tombol close bawaan Windows
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  alarmWindow.loadFile('index.html');

  // Ketika jendela ditutup, hapus referensi
  alarmWindow.on('closed', () => {
    alarmWindow = null;
  });
}

app.whenReady().then(() => {
  // 1. Membuat System Tray (Ikon di pojok kanan bawah Windows)
  // Aplikasi berjalan di background meskipun tidak ada jendela yang terbuka
  tray = new Tray(path.join(__dirname, 'icon.png')); // Pastikan Anda memiliki file icon.png kecil (misal 16x16)
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Test Alarm (5 Detik)', click: () => {
        setTimeout(triggerAlarm, 5000); // Simulasi alarm menyala 5 detik kemudian
    }},
    { label: 'Keluar', click: () => {
        app.quit();
    }}
  ]);
  
  tray.setToolTip('Aplikasi Alarm Background');
  tray.setContextMenu(contextMenu);

  // 2. Simulasi: Anggap saja alarm diatur untuk menyala 10 detik setelah aplikasi dijalankan
  console.log("Aplikasi berjalan di background. Alarm akan menyala dalam 10 detik...");
  setTimeout(triggerAlarm, 10000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      // Tidak melakukan apa-apa saat di-klik, biarkan berjalan di background
    }
  });
});

// Mencegah aplikasi keluar ketika semua jendela ditutup (karena kita ingin berjalan di background)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Jangan panggil app.quit() di sini agar tetap hidup di system tray
  }
});

// Mendengarkan perintah dari tampilan HTML (tombol matikan alarm)
ipcMain.on('stop-alarm', () => {
  if (alarmWindow) {
    alarmWindow.close();
  }
});
