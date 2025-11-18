// script.js - simulador de planificacion de disco

// estado global de la aplicacion
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
    allRequests: [], // todas las solicitudes generadas
    pendingRequests: [], // solicitudes pendientes de atender
    simulation: {
        isRunning: false,
        isPaused: false,
        currentRequestIndex: 0,
        currentCylinder: 20, // posicion inicial del cabezal
        direction: 1, // direccion del movimiento
        totalTracks: 0,
        directionChanges: 0,
        speed: 5,
        currentRound: 0
    },
    results: [],
    history: []
};

// descripciones de los algoritmos para mostrar al usuario
const algorithmDescriptions = {
    FCFS: 'First-Come, First-Served: Atiende las solicitudes en el orden exacto en que fueron recibidas. Es el mas simple pero puede ser ineficiente.',
    SSTF: 'Shortest Seek Time First: Selecciona la solicitud mas cercana a la posicion actual del cabezal. Reduce el tiempo de busqueda pero puede causar inanicion.',
    SCAN: 'Elevator Algorithm: El cabezal se mueve en una direccion atendiendo solicitudes hasta el final, luego cambia de direccion. Similar a un ascensor.',
    NSTEP: 'SCAN de N Pasos: Divide las solicitudes en grupos de tamaño N y aplica SCAN a cada grupo. Mejora la equidad sobre SCAN simple.',
    CSCAN: 'Circular SCAN: Version circular de SCAN donde el cabezal solo se mueve en una direccion, volviendo al inicio despues del final.',
    ESCHENBACH: 'Esquema Eschenbach: Algoritmo de optimizacion que busca minimizar el tiempo total de acceso considerando multiples factores.'
};

// inicializacion de la aplicacion
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    generateRequests();
    updateAlgorithmDescription();
});

// configuracion de todos los event listeners
function initializeEventListeners() {
    // listeners para seleccion de algoritmo
    document.querySelectorAll('input[name="algorithm"]').forEach(radio => {
        radio.addEventListener('change', function() {
            state.currentAlgorithm = this.value;
            updateAlgorithmDescription();
        });
    });

    // listeners para los botones de control
    document.getElementById('generateRequests').addEventListener('click', generateRequests);
    document.getElementById('clearHistory').addEventListener('click', clearHistory);
    document.getElementById('startSimulation').addEventListener('click', startSimulation);
    document.getElementById('pauseSimulation').addEventListener('click', togglePause);
    document.getElementById('resetSimulation').addEventListener('click', resetSimulation);
    
    // listener para control de velocidad de simulacion
    document.getElementById('speedControl').addEventListener('input', function() {
        state.simulation.speed = parseInt(this.value);
        updateSpeedDisplay();
    });
}

// actualiza la descripcion del algoritmo seleccionado
function updateAlgorithmDescription() {
    const descriptionElement = document.getElementById('algorithmDescription');
    descriptionElement.textContent = algorithmDescriptions[state.currentAlgorithm];
}

// genera 30 solicitudes aleatorias con los rangos especificados
function generateRequests() {
    state.allRequests = [];
    state.pendingRequests = [];
    const requestsBody = document.getElementById('requestsBody');
    requestsBody.innerHTML = '';

    // generar 30 solicitudes aleatorias
    for (let i = 0; i < 30; i++) {
        const request = {
            id: i + 1,
            cara: Math.floor(Math.random() * 10),      // rango 0-9
            cilindro: Math.floor(Math.random() * 40),  // rango 0-39
            sector: Math.floor(Math.random() * 16)     // rango 0-15
        };
        state.allRequests.push(request);

        const row = document.createElement('tr');
        
        // agregar separadores visuales entre rondas
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

        // colores diferentes para cada ronda
        row.className = i < 10 ? 'bg-blue-50' : i < 20 ? 'bg-green-50' : 'bg-yellow-50';
        row.innerHTML = `
            <td class="px-4 py-2 text-sm font-medium text-gray-900">${request.id}</td>
            <td class="px-4 py-2 text-sm text-gray-700">${request.cara}</td>
            <td class="px-4 py-2 text-sm text-gray-700">${request.cilindro}</td>
            <td class="px-4 py-2 text-sm text-gray-700">${request.sector}</td>
        `;
        requestsBody.appendChild(row);
    }

    // inicializar con solo las primeras 10 solicitudes
    state.pendingRequests = state.allRequests.slice(0, 10);

    addToLog('>> nuevas solicitudes generadas (30 solicitudes - 3 rondas)');
    
    // configurar scroll para la tabla de solicitudes
    const tableContainer = document.querySelector('.overflow-y-auto');
    if (tableContainer) {
        tableContainer.style.maxHeight = '400px';
        tableContainer.style.overflowY = 'auto';
        tableContainer.style.scrollbarWidth = 'thin';
        tableContainer.style.scrollbarColor = '#cbd5e0 #f7fafc';
    }
}

// limpia el historial de simulaciones
function clearHistory() {
    state.history = [];
    document.getElementById('historyBody').innerHTML = '';
    addToLog('>> historial de simulaciones limpiado');
}

// inicia la simulacion con el algoritmo seleccionado
function startSimulation() {
    if (state.simulation.isRunning) return;
    
    // reiniciar estado de simulacion
    state.simulation.isRunning = true;
    state.simulation.isPaused = false;
    state.simulation.currentRequestIndex = 0;
    state.simulation.totalTracks = 0;
    state.simulation.directionChanges = 0;
    state.simulation.currentRound = 1;
    state.simulation.currentCylinder = 20;
    state.simulation.direction = 0; // direccion neutral inicial
    
    // comenzar solo con ronda 1
    state.pendingRequests = state.allRequests.slice(0, 10);
    
    // actualizar estado de botones
    document.getElementById('startSimulation').disabled = true;
    document.getElementById('pauseSimulation').disabled = false;
    document.getElementById('resetSimulation').disabled = false;
    
    // limpiar resultados anteriores
    document.getElementById('resultsBody').innerHTML = '';
    state.results = [];
    
    addToLog(`>> iniciando simulacion con algoritmo ${state.currentAlgorithm}`);
    addToLog(`>> ronda 1 iniciada (solicitudes 1-10)`);
    
    // comenzar el procesamiento
    processNextRequest();
}

// pausa o reanuda la simulacion
function togglePause() {
    state.simulation.isPaused = !state.simulation.isPaused;
    const pauseBtn = document.getElementById('pauseSimulation');
    
    if (state.simulation.isPaused) {
        pauseBtn.innerHTML = '<i class="fas fa-play mr-2"></i>reanudar simulacion';
        addToLog('>> simulacion pausada');
    } else {
        pauseBtn.innerHTML = '<i class="fas fa-pause mr-2"></i>pausar simulacion';
        addToLog('>> simulacion reanudada');
        processNextRequest();
    }
}

// reinicia la simulacion a su estado inicial
function resetSimulation() {
    state.simulation.isRunning = false;
    state.simulation.isPaused = false;
    state.simulation.currentRequestIndex = 0;
    state.simulation.currentCylinder = 20;
    state.simulation.direction = 1;
    state.simulation.totalTracks = 0;
    state.simulation.directionChanges = 0;
    state.simulation.currentRound = 0;
    
    // restaurar botones a estado inicial
    document.getElementById('startSimulation').disabled = false;
    document.getElementById('pauseSimulation').disabled = true;
    document.getElementById('pauseSimulation').innerHTML = '<i class="fas fa-pause mr-2"></i>pausar simulacion';
    
    // actualizar interfaz
    updateMetrics();
    updateProgress();
    updateVisualization();
    
    addToLog('>> simulacion reiniciada');
}

// ============ implementacion de algoritmos de planificacion ============

// fcfs - first come first served
function executeFCFS(requests, currentCylinder) {
    return requests; // orden original de llegada
}

// sstf - shortest seek time first
function executeSSTF(requests, currentCylinder) {
    // ordenar por distancia al cilindro actual
    return requests.sort((a, b) => 
        Math.abs(a.cilindro - currentCylinder) - Math.abs(b.cilindro - currentCylinder)
    );
}

// scan - elevator algorithm
function executeSCAN(requests, currentCylinder, direction) {
    // dividir solicitudes en izquierda y derecha
    const left = requests.filter(r => r.cilindro <= currentCylinder)
                        .sort((a, b) => b.cilindro - a.cilindro);
    const right = requests.filter(r => r.cilindro > currentCylinder)
                         .sort((a, b) => a.cilindro - b.cilindro);
    
    // retornar segun direccion actual
    return direction === 1 ? [...right, ...left] : [...left, ...right];
}

// c-scan - circular scan
function executeCSCAN(requests, currentCylinder) {
    const sorted = [...requests].sort((a, b) => a.cilindro - b.cilindro);
    const right = sorted.filter(r => r.cilindro >= currentCylinder);
    const left = sorted.filter(r => r.cilindro < currentCylinder);
    
    // siempre en una direccion (circular)
    return [...right, ...left];
}

// scan de n pasos (n=5)
function executeNSTEP(requests, currentCylinder, direction) {
    const groupSize = 5;
    const groups = [];
    
    // dividir en grupos de tamaño n
    for (let i = 0; i < requests.length; i += groupSize) {
        groups.push(requests.slice(i, i + groupSize));
    }
    
    // aplicar scan a cada grupo
    const processedGroups = groups.map(group => 
        executeSCAN(group, currentCylinder, direction)
    );
    
    // concatenar resultados
    return processedGroups.flat();
}

// esquema eschenbach - optimizacion avanzada
function executeEschenbach(requests, currentCylinder, direction) {
    // priorizar solicitudes en direccion actual
    const inDirection = requests.filter(r => 
        direction === 1 ? r.cilindro >= currentCylinder : r.cilindro <= currentCylinder
    );
    
    const oppositeDirection = requests.filter(r => 
        direction === 1 ? r.cilindro < currentCylinder : r.cilindro > currentCylinder
    );
    
    // ordenar cada grupo por distancia
    inDirection.sort((a, b) => 
        Math.abs(a.cilindro - currentCylinder) - Math.abs(b.cilindro - currentCylinder)
    );
    
    oppositeDirection.sort((a, b) => 
        Math.abs(a.cilindro - currentCylinder) - Math.abs(b.cilindro - currentCylinder)
    );
    
    return [...inDirection, ...oppositeDirection];
}

// selecciona la siguiente solicitud segun el algoritmo
function getNextRequest() {
    if (state.pendingRequests.length === 0) return null;

    let sortedRequests = [];
    
    // aplicar algoritmo segun seleccion
    switch (state.currentAlgorithm) {
        case 'FCFS':
            sortedRequests = executeFCFS([...state.pendingRequests], state.simulation.currentCylinder);
            break;
        case 'SSTF':
            sortedRequests = executeSSTF([...state.pendingRequests], state.simulation.currentCylinder);
            break;
        case 'SCAN':
            sortedRequests = executeSCAN([...state.pendingRequests], state.simulation.currentCylinder, state.simulation.direction);
            break;
        case 'CSCAN':
            sortedRequests = executeCSCAN([...state.pendingRequests], state.simulation.currentCylinder);
            break;
        case 'NSTEP':
            sortedRequests = executeNSTEP([...state.pendingRequests], state.simulation.currentCylinder, state.simulation.direction);
            break;
        case 'ESCHENBACH':
            sortedRequests = executeEschenbach([...state.pendingRequests], state.simulation.currentCylinder, state.simulation.direction);
            break;
        default:
            sortedRequests = [...state.pendingRequests];
    }
    
    return sortedRequests.length > 0 ? sortedRequests[0] : null;
}

// procesa la siguiente solicitud en la simulacion
function processNextRequest() {
    if (!state.simulation.isRunning || state.simulation.isPaused) return;

    // verificar transiciones entre rondas
    checkRoundTransition();

    // finalizar si no hay mas solicitudes
    if (state.pendingRequests.length === 0) {
        state.simulation.currentRequestIndex = 30;
        state.simulation.currentRound = 3;
        updateMetrics();
        updateProgress();
        finishSimulation();
        return;
    }

    // obtener siguiente solicitud segun algoritmo
    const nextRequest = getNextRequest();
    
    if (!nextRequest) {
        finishSimulation();
        return;
    }

    const targetCylinder = nextRequest.cilindro;
    
    // calcular distancia recorrida
    const distance = Math.abs(targetCylinder - state.simulation.currentCylinder);
    state.simulation.totalTracks += distance;
    
    // deteccion de cambios de direccion
    let directionChanged = false;
    const previousDirection = state.simulation.direction;

    // determinar nueva direccion basada en movimiento
    if (targetCylinder > state.simulation.currentCylinder) {
        state.simulation.direction = 1;
    } else if (targetCylinder < state.simulation.currentCylinder) {
        state.simulation.direction = -1;
    }

    // verificar si hubo cambio real de direccion
    if (state.simulation.direction !== previousDirection && previousDirection !== 0) {
        state.simulation.directionChanges++;
        directionChanged = true;
        addToLog(`>>> cambio de direccion detectado: ${previousDirection === 1 ? '→ aumentando' : '← disminuyendo'} a ${state.simulation.direction === 1 ? '→ aumentando' : '← disminuyendo'}`);
    }
    
    // actualizar posicion del cabezal
    state.simulation.currentCylinder = targetCylinder;
    
    // registrar resultado de esta solicitud
    const result = {
        requestId: nextRequest.id,
        tracks: distance,
        directionChanged: directionChanged
    };
    state.results.push(result);
    
    // remover solicitud procesada
    const requestIndex = state.pendingRequests.findIndex(r => r.id === nextRequest.id);
    if (requestIndex > -1) {
        state.pendingRequests.splice(requestIndex, 1);
    }
    
    // actualizar interfaz de usuario
    updateResultsTable(result);
    updateMetrics();
    updateProgress();
    updateVisualization();
    
    // registrar en log
    addToLog(`>> [${state.currentAlgorithm}] atendiendo solicitud ${nextRequest.id}: cilindro ${targetCylinder} (${distance} pistas)`);
    
    state.simulation.currentRequestIndex++;
    
    // programar siguiente solicitud con delay segun velocidad
    const speedDelay = 1500 - ((state.simulation.speed - 1) * 300);
    setTimeout(processNextRequest, speedDelay);
}

// controla las transiciones entre rondas de solicitudes
function checkRoundTransition() {
    const totalAttended = state.simulation.currentRequestIndex;

    // ronda 2: despues de 5 atenciones
    if (totalAttended === 5 && state.simulation.currentRound === 1) {
        const round2Requests = state.allRequests.slice(10, 20);
        state.pendingRequests = state.pendingRequests.concat(round2Requests);
        state.simulation.currentRound = 2;
        document.getElementById('currentRound').textContent = '2';
        addToLog('>> ¡nuevas solicitudes! ronda 2 iniciada (solicitudes 11-20)');
        addToLog(`>> ahora hay ${state.pendingRequests.length} solicitudes pendientes`);
    }

    // ronda 3: despues de 15 atenciones totales
    if (totalAttended === 15 && state.simulation.currentRound === 2) {
        const round3Requests = state.allRequests.slice(20, 30);
        state.pendingRequests = state.pendingRequests.concat(round3Requests);
        state.simulation.currentRound = 3;
        document.getElementById('currentRound').textContent = '3';
        addToLog('>> ¡nuevas solicitudes! ronda 3 iniciada (solicitudes 21-30)');
        addToLog(`>> ahora hay ${state.pendingRequests.length} solicitudes pendientes`);
    }
}

// finaliza la simulacion y guarda resultados
function finishSimulation() {
    // forzar valores finales
    state.simulation.currentRequestIndex = 30;
    state.simulation.currentRound = 3;
    
    // actualizar interfaz final
    updateMetrics();
    updateProgress();

    state.simulation.isRunning = false;
  
    // restaurar controles
    document.getElementById('startSimulation').disabled = false;
    document.getElementById('pauseSimulation').disabled = true;
    
    // guardar en historial
    const historyEntry = {
        algorithm: state.currentAlgorithm,
        totalTracks: state.simulation.totalTracks,
        totalDirectionChanges: state.simulation.directionChanges,
        timestamp: new Date().toLocaleTimeString()
    };
    state.history.push(historyEntry);
    updateHistoryTable();
    
    addToLog('>> simulacion completada');
    addToLog(`>> resumen: ${state.simulation.totalTracks} pistas recorridas, ${state.simulation.directionChanges} cambios de direccion`);
}

// ============ funciones de actualizacion de interfaz ============

// actualiza la tabla de resultados de la simulacion actual
function updateResultsTable(result) {
    const resultsBody = document.getElementById('resultsBody');
    const row = document.createElement('tr');
    
    // resaltar filas con cambio de direccion
    row.className = result.directionChanged ? 'bg-yellow-50' : '';
    row.innerHTML = `
        <td class="px-4 py-2 text-sm font-medium text-gray-900">${result.requestId}</td>
        <td class="px-4 py-2 text-sm text-gray-700">${result.tracks}</td>
        <td class="px-4 py-2 text-sm text-gray-700">
            ${result.directionChanged ? 
                '<span class="text-red-600 font-bold">SI</span>' : 
                '<span class="text-green-600">no</span>'}
        </td>
    `;
    
    resultsBody.appendChild(row);
}

// actualiza la tabla de historial de simulaciones
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

// actualiza las metricas en tiempo real
function updateMetrics() {
    document.getElementById('totalTracks').textContent = state.simulation.totalTracks;
    document.getElementById('directionChanges').textContent = state.simulation.directionChanges;
    
    // asegurar que se muestre 30/30 al finalizar
    const processedCount = state.simulation.currentRequestIndex >= 30 ? 30 : state.simulation.currentRequestIndex;
    document.getElementById('requestsProcessed').textContent = `${processedCount}/30`;
    
    document.getElementById('currentCylinder').textContent = state.simulation.currentCylinder;
    document.getElementById('currentRound').textContent = state.simulation.currentRound || '-';
}

// actualiza la barra de progreso
function updateProgress() {
    const totalRequests = 30;
    const progress = (state.simulation.currentRequestIndex / totalRequests) * 100;
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    
    // asegurar progreso exacto hasta 100%
    const exactProgress = Math.min(100, (state.simulation.currentRequestIndex / totalRequests) * 100);
    
    progressFill.style.width = `${exactProgress}%`;
    progressPercentage.textContent = `${Math.round(exactProgress)}%`;
}

// actualiza la visualizacion grafica del disco
function updateVisualization() {
    const visualContent = document.getElementById('visualContent');
    
    let visualization = `
        <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
                <span class="text-blue-300">cilindro 0</span>
                <span class="text-green-300">cabezal: cilindro ${state.simulation.currentCylinder}</span>
                <span class="text-blue-300">cilindro 39</span>
            </div>
            <div class="bg-gray-800 h-4 rounded-full relative">
                <div class="absolute top-0 left-0 h-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full" 
                     style="width: ${(state.simulation.currentCylinder / 39) * 100}%"></div>
                <div class="absolute top-0 left-0 w-3 h-6 bg-yellow-400 rounded-full -mt-1 -ml-1.5 shadow-lg"
                     style="left: ${(state.simulation.currentCylinder / 39) * 100}%"></div>
            </div>
        </div>
        <div class="grid grid-cols-4 gap-2 text-xs">
            <div class="text-center p-2 bg-blue-500 rounded">algoritmo: ${state.currentAlgorithm}</div>
            <div class="text-center p-2 bg-green-500 rounded">direccion: ${state.simulation.direction === 1 ? '→' : '←'}</div>
            <div class="text-center p-2 bg-purple-500 rounded">ronda: ${state.simulation.currentRound}</div>
            <div class="text-center p-2 bg-red-500 rounded">pendientes: ${state.pendingRequests.length}</div>
        </div>
    `;
    
    visualContent.innerHTML = visualization;
}

// actualiza la etiqueta de velocidad
function updateSpeedDisplay() {
    const speedValue = document.getElementById('speedValue');
    const speeds = ['muy lento', 'lento', 'normal', 'rapido', 'muy rapido'];
    speedValue.textContent = speeds[state.simulation.speed - 1];
}

// agrega una entrada al log de eventos
function addToLog(message) {
    const logContainer = document.getElementById('eventLog');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry mb-1';
    logEntry.textContent = message;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// interfaz global para debugging
window.simulator = {
    state,
    generateRequests,
    startSimulation,
    resetSimulation
};