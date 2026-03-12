// --- LÓGICA DE NOTIFICACIONES (REFACTORIZADA) ---
function showNotify(title, msg, type = 'error') {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    // 1. Limpieza total de clases previas para evitar el "efecto verde"
    toast.className = ''; 
    toast.textContent = `${title}: ${msg}`;
    
    // 2. Pequeño hack para que el navegador reinicie el estado del elemento
    void toast.offsetWidth; 

    // 3. Aplicar el color y la visibilidad según el tipo
    const colorClass = (type === 'success') ? 'toast-success' : 'toast-error';
    toast.classList.add(colorClass, 'toast-visible');
    
    // 4. Timer para esconder y limpiar
    setTimeout(() => {
        toast.classList.remove('toast-visible');
    }, 3500);
}

// --- LÓGICA DEL RELOJ ---
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const clockElement = document.getElementById('currentTime');
    if (clockElement) {
        clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
}
setInterval(updateClock, 1000);
updateClock();

// --- ELEMENTOS DEL DOM ---
const btnOn = document.getElementById('btnOn');
const btnOff = document.getElementById('btnOff');
const minutesInput = document.getElementById('minutes');
const soundInput = document.getElementById('soundSource');
const hourlyCheck = document.getElementById('hourlyCheck');

// --- INICIALIZACIÓN ---
chrome.storage.local.get(['savedMinutes', 'youtubeUrl', 'isActive', 'isHourly'], (result) => {
    if (result.savedMinutes) minutesInput.value = result.savedMinutes;
    if (result.youtubeUrl) soundInput.value = result.youtubeUrl;
    if (result.isHourly) {
        hourlyCheck.checked = true;
        minutesInput.disabled = true;
    }
    updateHeaderStatus(result.isActive);
    updateUIState(result.isActive);
});

// Activar alarma si se marca el check
hourlyCheck.addEventListener('change', () => {
    if (hourlyCheck.checked) {
        activarAlarma(); 
    } else {
        minutesInput.disabled = false;
    }
});

// --- FUNCIONES DE APOYO ---
function formatTimeMessage(totalMinutes) {
    if (totalMinutes < 1) {
        return `${Math.round(totalMinutes * 60)} seconds`;
    }
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.round(totalMinutes % 60);
        return `${hours === 1 ? "1 hour" : hours + " hours"}${mins > 0 ? " and " + mins + " minutes" : ""}`;
    }
    return `${totalMinutes} minutes`;
}

function updateUIState(isActive) {
    const clock = document.getElementById('currentTime');
    if (clock) {
        isActive ? clock.classList.add('active') : clock.classList.remove('active');
    }
    updateHeaderStatus(isActive);
}

function updateHeaderStatus(isActive) {
    const header = document.querySelector('.header');
    if (header) {
        if (isActive) {
            header.classList.add('active-status');
        } else {
            header.classList.remove('active-status');
        }
    }
}

// --- LÓGICA DE ACTIVACIÓN ---
function activarAlarma() {
    let url = soundInput.value.trim();
    const isHourly = hourlyCheck.checked;
    let mins;

    // Validación de URL vacía
    if (url === "") {
        showNotify("Missing Link", "Please enter a URL or video link.", "error"); 
        if (isHourly) {
            hourlyCheck.checked = false;
            minutesInput.disabled = false;
        }
        return;
    }

    if (!url.startsWith('http')) url = 'https://' + url;

    // Validación de formato YouTube
    if (!(url.includes("youtube.com") || url.includes("youtu.be"))) {
        showNotify("Invalid Link", "Please enter a valid YouTube URL.", "error");
        if (isHourly) {
            hourlyCheck.checked = false;
            minutesInput.disabled = false;
        }
        return;
    }

    // Validación de tiempo
    if (isHourly) {
        const now = new Date();
        mins = 60 - now.getMinutes(); 
    } else {
        mins = parseFloat(minutesInput.value);
    }

    if (isNaN(mins) || mins <= 0) {
        showNotify("Invalid Time", "Please enter a number greater than 0.", "error");
        if (isHourly) {
            hourlyCheck.checked = false;
            minutesInput.disabled = false;
        }
        return;
    }

    // Proceso de activación exitosa
    minutesInput.disabled = isHourly;

    chrome.storage.local.set({ 
        'savedMinutes': minutesInput.value, 
        'youtubeUrl': url, 
        'isActive': true,
        'isHourly': isHourly
    }, () => {
        const period = isHourly ? 60 : mins;
        chrome.alarms.create("alarmaYoutube", { delayInMinutes: mins, periodInMinutes: period });
        
        const mensaje = isHourly ? "the top of the hour (:00)" : formatTimeMessage(mins);
        showNotify("Alarm Activated", `Set for ${mensaje}`, "success"); 
        updateUIState(true);
    });
}

btnOn.addEventListener('click', activarAlarma);

// --- LÓGICA DE DESACTIVACIÓN ---

btnOff.addEventListener('click', () => {
    chrome.alarms.clear("alarmaYoutube", () => {
        chrome.storage.local.set({ 
            'isActive': false,
            'isHourly': false 
        }, () => {
            hourlyCheck.checked = false;
            minutesInput.disabled = false;
            
            // CAMBIO AQUÍ: Cambiamos "success" por "error" para que salga en ROJO 🔴
            showNotify("Alarm Status", "Alarm deactivated", "error"); 
            
            updateUIState(false);
        });
    });
});

// Presets
document.querySelectorAll('.preset-btn').forEach(button => {
    button.addEventListener('click', () => {
        if (!hourlyCheck.checked) {
            minutesInput.value = button.getAttribute('data-mins');
        }
    });
});