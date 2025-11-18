// script.js - Simulador de Planificación de Disco

// Estado global de la aplicación
const state = {
    algorithms: {
        FCFS: 'First-Come, First-Served',
        SSTF: 'Shortest Seek Time First', 
        SCAN: 'Elevator Algorithm',
        NSTEP: 'SCAN de N Pasos',
        CSCAN: 'Circular SCAN',
        ESCHENBACH: 'Esquema Eschenbach'
    },
    currentAlgorithm: 'FCFS',
    requests: [],
    simulation: {
        isRunning: false,
        isPaused: false,
        currentRequestIndex: 0,
        currentCylinder: 20, // Empezar en el cilindro 20 (medio)
        direction: 1, // 1 = hacia cilindros mayores, -1 = hacia menores
        totalTracks: 0,
        directionChanges: 0,
        speed: 5,
        currentRound: 0
    },
    results: [],
    history: []
};

// Descripciones detalladas de los algoritmos
const algorithmDescriptions = {
    FCFS: 'First-Come, First-Served: Atiende las solicitudes en el orden exacto en que fueron recibidas. Es el más simple pero puede ser ineficiente.',
    SSTF: 'Shortest Seek Time First: Selecciona la solicitud más cercana a la posición actual del cabezal. Reduce el tiempo de búsqueda pero puede causar inanición.',
    SCAN: 'Elevator Algorithm: El cabezal se mueve en una dirección atendiendo solicitudes hasta el final, luego cambia de dirección. Similar a un ascensor.',
    NSTEP: 'SCAN de N Pasos: Divide las solicitudes en grupos de tamaño N y aplica SCAN a cada grupo. Mejora la equidad sobre SCAN simple.',
    CSCAN: 'Circular SCAN: Versión circular de SCAN donde el cabezal solo se mueve en una dirección, volviendo al inicio después del final.',
    ESCHENBACH: 'Esquema Eschenbach: Algoritmo de optimización que busca minimizar el tiempo total de acceso considerando múltiples factores.'
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    generateRequests();
    updateAlgorithmDescription();
});

// Configurar event listeners
function initializeEventListeners() {
    // Listeners para algoritmos
    document.querySelectorAll('input[name="algorithm"]').forEach(radio => {
        radio.addEventListener('change', function() {
            state.currentAlgorithm = this.value;
            updateAlgorithmDescription();
        });
    });

    // Listeners para botones
    document.getElementById('generateRequests').addEventListener('click', generateRequests);
    document.getElementById('clearHistory').addEventListener('click', clearHistory);
    document.getElementById('startSimulation').addEventListener('click', startSimulation);
    document.getElementById('pauseSimulation').addEventListener('click', togglePause);
    document.getElementById('resetSimulation').addEventListener('click', resetSimulation);
    
    // Listener para control de velocidad
    document.getElementById('speedControl').addEventListener('input', function() {
        state.simulation.speed = parseInt(this.value);
        updateSpeedDisplay();
    });
}

// Actualizar descripción del algoritmo
function updateAlgorithmDescription() {
    const descriptionElement = document.getElementById('algorithmDescription');
    descriptionElement.textContent = algorithmDescriptions[state.currentAlgorithm];
}

// Generar solicitudes aleatorias
function generateRequests() {
    state.requests = [];
    const requestsBody = document.getElementById('requestsBody');
    requestsBody.innerHTML = '';

    for (let i = 0; i < 30; i++) {
        const request = {
            id: i + 1,
            cara: Math.floor(Math.random() * 10),      // 0-9
            cilindro: Math.floor(Math.random() * 40),  // 0-39
            sector: Math.floor(Math.random() * 16)     // 0-15
        };
        state.requests.push(request);

        // Crear fila de tabla
        const row = document.createElement('tr');
        
        // Añadir separador de rondas cada 10 solicitudes
        if (i === 10 || i === 20) {
            const dividerRow = document.createElement('tr');
            dividerRow.className = 'bg-red-100 border-t-2 border-red-300';
            dividerRow.innerHTML = `
                <td colspan="4" class="px-4 py-2 text-center text-red-700 font-bold">
                    RONDA ${i === 10 ? '2' : '3'} - NUEVAS SOLICITUDES
                </td>
            `;
            requestsBody.appendChild(dividerRow);
        }

        row.className = i < 10 ? 'bg-blue-50' : i < 20 ? 'bg-green-50' : 'bg-yellow-50';
        row.innerHTML = `
            <td class="px-4 py-2 text-sm font-medium text-gray-900">${request.id}</td>
            <td class="px-4 py-2 text-sm text-gray-700">${request.cara}</td>
            <td class="px-4 py-2 text-sm text-gray-700">${request.cilindro}</td>
            <td class="px-4 py-2 text-sm text-gray-700">${request.sector}</td>
        `;
        requestsBody.appendChild(row);
    }

    addToLog('>> Nuevas solicitudes generadas (30 solicitudes - 3 rondas)');
    
    const tableContainer = document.querySelector('.overflow-y-auto');
    if (tableContainer) {
        tableContainer.style.maxHeight = '400px';
        tableContainer.style.overflowY = 'auto';
        
        // Estilos personalizados para el scrollbar
        tableContainer.style.scrollbarWidth = 'thin';
        tableContainer.style.scrollbarColor = '#cbd5e0 #f7fafc';
    }
}

// Limpiar historial
function clearHistory() {
    state.history = [];
    document.getElementById('historyBody').innerHTML = '';
    addToLog('>> Historial de simulaciones limpiado');
}

// Iniciar simulación
function startSimulation() {
    if (state.simulation.isRunning) return;
    
    state.simulation.isRunning = true;
    state.simulation.isPaused = false;
    state.simulation.currentRequestIndex = 0;
    state.simulation.totalTracks = 0;
    state.simulation.directionChanges = 0;
    state.simulation.currentRound = 1;
    
    // Actualizar UI
    document.getElementById('startSimulation').disabled = true;
    document.getElementById('pauseSimulation').disabled = false;
    document.getElementById('resetSimulation').disabled = false;
    
    // Limpiar resultados anteriores
    document.getElementById('resultsBody').innerHTML = '';
    state.results = [];
    
    addToLog(`>> Iniciando simulación con algoritmo ${state.currentAlgorithm}`);
    addToLog(`>> Ronda 1 iniciada (solicitudes 1-10)`);
    
    // Iniciar procesamiento
    processNextRequest();
}

// Pausar/Reanudar simulación
function togglePause() {
    state.simulation.isPaused = !state.simulation.isPaused;
    const pauseBtn = document.getElementById('pauseSimulation');
    
    if (state.simulation.isPaused) {
        pauseBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Reanudar Simulación';
        addToLog('>> Simulación pausada');
    } else {
        pauseBtn.innerHTML = '<i class="fas fa-pause mr-2"></i>Pausar Simulación';
        addToLog('>> Simulación reanudada');
        processNextRequest();
    }
}

// Reiniciar simulación
function resetSimulation() {
    state.simulation.isRunning = false;
    state.simulation.isPaused = false;
    state.simulation.currentRequestIndex = 0;
    state.simulation.currentCylinder = 20;
    state.simulation.direction = 1;
    state.simulation.totalTracks = 0;
    state.simulation.directionChanges = 0;
    state.simulation.currentRound = 0;
    
    // Actualizar UI
    document.getElementById('startSimulation').disabled = false;
    document.getElementById('pauseSimulation').disabled = true;
    document.getElementById('pauseSimulation').innerHTML = '<i class="fas fa-pause mr-2"></i>Pausar Simulación';
    
    updateMetrics();
    updateProgress();
    updateVisualization();
    
    addToLog('>> Simulación reiniciada');
}

// Procesar siguiente solicitud
function processNextRequest() {
    if (!state.simulation.isRunning || state.simulation.isPaused) return;
    
    if (state.simulation.currentRequestIndex >= state.requests.length) {
        finishSimulation();
        return;
    }
    
    // Verificar cambio de ronda
    checkRoundTransition();
    
    const currentRequest = state.requests[state.simulation.currentRequestIndex];
    const targetCylinder = currentRequest.cilindro;
    
    // Calcular distancia recorrida
    const distance = Math.abs(targetCylinder - state.simulation.currentCylinder);
    state.simulation.totalTracks += distance;
    
    // Verificar cambio de dirección
    let directionChanged = false;
    if ((targetCylinder > state.simulation.currentCylinder && state.simulation.direction === -1) ||
        (targetCylinder < state.simulation.currentCylinder && state.simulation.direction === 1)) {
        state.simulation.directionChanges++;
        state.simulation.direction *= -1;
        directionChanged = true;
    }
    
    // Actualizar cilindro actual
    state.simulation.currentCylinder = targetCylinder;
    
    // Registrar resultado
    const result = {
        requestId: currentRequest.id,
        tracks: distance,
        directionChanged: directionChanged
    };
    state.results.push(result);
    
    // Actualizar UI
    updateResultsTable(result);
    updateMetrics();
    updateProgress();
    updateVisualization();
    
    // Log del evento
    addToLog(`>> Atendiendo solicitud ${currentRequest.id}: Cilindro ${targetCylinder} (${distance} pistas)`);
    if (directionChanged) {
        addToLog(`>>> Cambio de dirección: ${state.simulation.direction === 1 ? '→ AUMENTANDO' : '← DISMINUYENDO'}`);
    }
    
    state.simulation.currentRequestIndex++;
    
    // Programar siguiente solicitud según velocidad
    const speedDelay = 1000 - ((state.simulation.speed - 1) * 100); // 100ms a 1000ms
    setTimeout(processNextRequest, speedDelay);
}

// Verificar transición entre rondas
function checkRoundTransition() {
    const newRound = Math.floor(state.simulation.currentRequestIndex / 10) + 1;
    
    if (newRound !== state.simulation.currentRound) {
        state.simulation.currentRound = newRound;
        document.getElementById('currentRound').textContent = state.simulation.currentRound;
        
        if (state.simulation.currentRound === 2) {
            addToLog('>> ¡NUEVAS SOLICITUDES! Ronda 2 iniciada (solicitudes 11-20)');
        } else if (state.simulation.currentRound === 3) {
            addToLog('>> ¡NUEVAS SOLICITUDES! Ronda 3 iniciada (solicitudes 21-30)');
        }
    }
}

// Finalizar simulación
function finishSimulation() {
    state.simulation.isRunning = false;
    
    // Actualizar UI
    document.getElementById('startSimulation').disabled = false;
    document.getElementById('pauseSimulation').disabled = true;
    
    // Agregar al historial
    const historyEntry = {
        algorithm: state.currentAlgorithm,
        totalTracks: state.simulation.totalTracks,
        totalDirectionChanges: state.simulation.directionChanges,
        timestamp: new Date().toLocaleTimeString()
    };
    state.history.push(historyEntry);
    updateHistoryTable();
    
    addToLog('>> Simulación completada');
    addToLog(`>> Resumen: ${state.simulation.totalTracks} pistas recorridas, ${state.simulation.directionChanges} cambios de dirección`);
}

// Actualizar tabla de resultados
function updateResultsTable(result) {
    const resultsBody = document.getElementById('resultsBody');
    const row = document.createElement('tr');
    
    row.className = result.directionChanged ? 'bg-yellow-50' : '';
    row.innerHTML = `
        <td class="px-4 py-2 text-sm font-medium text-gray-900">${result.requestId}</td>
        <td class="px-4 py-2 text-sm text-gray-700">${result.tracks}</td>
        <td class="px-4 py-2 text-sm text-gray-700">
            ${result.directionChanged ? 
                '<span class="text-red-600 font-bold">SÍ</span>' : 
                '<span class="text-green-600">No</span>'}
        </td>
    `;
    
    resultsBody.appendChild(row);
}

// Actualizar tabla de historial
function updateHistoryTable() {
    const historyBody = document.getElementById('historyBody');
    historyBody.innerHTML = '';
    
    state.history.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-2 text-sm font-medium text-gray-900">${entry.algorithm}</td>
            <td class="px-4 py-2 text-sm text-gray-700">${entry.totalTracks}</td>
            <td class="px-4 py-2 text-sm text-gray-700">${entry.totalDirectionChanges}</td>
        `;
        historyBody.appendChild(row);
    });
}

// Actualizar métricas en tiempo real
function updateMetrics() {
    document.getElementById('totalTracks').textContent = state.simulation.totalTracks;
    document.getElementById('directionChanges').textContent = state.simulation.directionChanges;
    document.getElementById('requestsProcessed').textContent = 
        `${state.simulation.currentRequestIndex}/30`;
    document.getElementById('currentCylinder').textContent = state.simulation.currentCylinder;
    document.getElementById('currentRound').textContent = state.simulation.currentRound || '-';
}

// Actualizar barra de progreso
function updateProgress() {
    const progress = (state.simulation.currentRequestIndex / 30) * 100;
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    
    progressFill.style.width = `${progress}%`;
    progressPercentage.textContent = `${Math.round(progress)}%`;
}

// Actualizar visualización del disco
function updateVisualization() {
    const visualContent = document.getElementById('visualContent');
    
    // Crear representación visual simple de los cilindros
    let visualization = `
        <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
                <span class="text-blue-300">Cilindro 0</span>
                <span class="text-green-300">Cabezal: Cilindro ${state.simulation.currentCylinder}</span>
                <span class="text-blue-300">Cilindro 39</span>
            </div>
            <div class="bg-gray-800 h-4 rounded-full relative">
                <div class="absolute top-0 left-0 h-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full" 
                     style="width: ${(state.simulation.currentCylinder / 39) * 100}%"></div>
                <div class="absolute top-0 left-0 w-3 h-6 bg-yellow-400 rounded-full -mt-1 -ml-1.5 shadow-lg"
                     style="left: ${(state.simulation.currentCylinder / 39) * 100}%"></div>
            </div>
        </div>
        <div class="grid grid-cols-4 gap-2 text-xs">
            <div class="text-center p-2 bg-blue-500 rounded">Algoritmo: ${state.currentAlgorithm}</div>
            <div class="text-center p-2 bg-green-500 rounded">Dirección: ${state.simulation.direction === 1 ? '→' : '←'}</div>
            <div class="text-center p-2 bg-purple-500 rounded">Ronda: ${state.simulation.currentRound}</div>
            <div class="text-center p-2 bg-red-500 rounded">Activas: ${30 - state.simulation.currentRequestIndex}</div>
        </div>
    `;
    
    visualContent.innerHTML = visualization;
}

// Actualizar display de velocidad
function updateSpeedDisplay() {
    const speedValue = document.getElementById('speedValue');
    const speeds = ['Muy Lento', 'Lento', 'Normal', 'Rápido', 'Muy Rápido'];
    speedValue.textContent = speeds[state.simulation.speed - 1] || 'Normal';
}

// Agregar entrada al log
function addToLog(message) {
    const logContainer = document.getElementById('eventLog');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry mb-1';
    logEntry.textContent = message;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Algoritmos de planificación (para futura implementación completa)
function executeFCFS(requests, currentCylinder) {
    // Implementación básica - ya estamos usando FCFS por defecto
    return requests;
}

function executeSSTF(requests, currentCylinder) {
    return requests.sort((a, b) => 
        Math.abs(a.cilindro - currentCylinder) - Math.abs(b.cilindro - currentCylinder)
    );
}

function executeSCAN(requests, currentCylinder, direction) {
    // Implementación simplificada de SCAN
    const left = requests.filter(r => r.cilindro <= currentCylinder).sort((a, b) => b.cilindro - a.cilindro);
    const right = requests.filter(r => r.cilindro > currentCylinder).sort((a, b) => a.cilindro - b.cilindro);
    
    return direction === 1 ? [...right, ...left] : [...left, ...right];
}

// Exportar funciones para uso global (si es necesario)
window.simulator = {
    state,
    generateRequests,
    startSimulation,
    resetSimulation
};