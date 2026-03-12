// Escuchar cuando la alarma se active
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "alarmaYoutube") {
    
    // Consultamos la URL que guardamos en el storage
    chrome.storage.local.get(['youtubeUrl'], (result) => {
      if (result.youtubeUrl) {
        // Abrir una nueva pestaña con el video de YouTube
        chrome.tabs.create({ url: result.youtubeUrl });
      }
    });
  }
});