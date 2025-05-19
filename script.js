// Global variables
let processes = [];
let ganttChartData = [];

// Show/hide form fields based on algorithm selection
function handleAlgorithmChange() {
    const algorithm = document.getElementById('algorithm').value;
    const quantumContainer = document.getElementById('quantum-container');
    const priorityContainer = document.getElementById('priority-container');
    
    // Show/hide time quantum input for Round Robin
    if (algorithm === 'roundRobin') {
        quantumContainer.style.display = 'block';
    } else {
        quantumContainer.style.display = 'none';
    }
    
    // Show/hide priority input for Priority algorithms
    if (algorithm === 'priorityNonPreemptive' || algorithm === 'priorityPreemptive') {
        priorityContainer.style.display = 'block';
    } else {
        priorityContainer.style.display = 'none';
    }
}


function resetForm() {
    document.getElementById('arrival_time').value = '';
    document.getElementById('burst_time').value = '';
    document.getElementById('priority').value = '';
    document.getElementById('time_quantum').value = '2';
    document.getElementById('results-section').style.display = 'none';
}

// Parse input values from the form
function parseInputValues() {
    const arrivalTimeStr = document.getElementById('arrival_time').value.trim();
    const burstTimeStr = document.getElementById('burst_time').value.trim();
    const priorityStr = document.getElementById('priority').value.trim();
    
    const arrivalTimes = arrivalTimeStr.split(/\s+/).map(Number);
    const burstTimes = burstTimeStr.split(/\s+/).map(Number);
    const priorities = priorityStr ? priorityStr.split(/\s+/).map(Number) : [];
    
    // Validate inputs
    if (arrivalTimes.length === 0 || burstTimes.length === 0) {
        alert('Please enter arrival and burst times');
        return null;
    }
    
    if (arrivalTimes.length !== burstTimes.length) {
        alert('Number of arrival times must match number of burst times');
        return null;
    }
    
    if (burstTimes.some(time => time <= 0)) {
        alert('Burst times must be greater than zero');
        return null;
    }
    
    const algorithm = document.getElementById('algorithm').value;
    if ((algorithm === 'priorityNonPreemptive' || algorithm === 'priorityPreemptive') && 
        (priorities.length === 0 || priorities.length !== arrivalTimes.length)) {
        alert('Please enter priority values for all processes');
        return null;
    }
    
    // Create process objects
    const processCount = arrivalTimes.length;
    const processes = [];
    
    for (let i = 0; i < processCount; i++) {
        processes.push({
            id: i + 1,
            arrivalTime: arrivalTimes[i],
            burstTime: burstTimes[i],
            priority: priorities[i] || 0,
            remainingTime: burstTimes[i],
            startTime: -1,
            finishTime: -1,
            waitingTime: -1,
            turnaroundTime: -1,
            responseTime: -1
        });
    }
    
    return processes;
}

// Calculate scheduling based on selected algorithm
function calculateScheduling() {
    // Parse input values
    processes = parseInputValues();
    if (!processes) return;
    
    const algorithm = document.getElementById('algorithm').value;
    
    // Run the selected scheduling algorithm
    switch (algorithm) {
        case 'fcfs':
            fcfs();
            break;
        case 'sjfNonPreemptive':
            sjfNonPreemptive();
            break;
        case 'sjfPreemptive':
            sjfPreemptive();
            break;
        case 'ljfNonPreemptive':
            ljfNonPreemptive();
            break;
        case 'ljfPreemptive':
            ljfPreemptive();
            break;
        case 'priorityNonPreemptive':
            priorityNonPreemptive();
            break;
        case 'priorityPreemptive':
            priorityPreemptive();
            break;
        case 'roundRobin':
            const quantum = parseInt(document.getElementById('time_quantum').value);
            if (quantum <= 0) {
                alert('Time quantum must be greater than zero');
                return;
            }
            roundRobin(quantum);
            break;
    }
    
    
    calculateMetrics();
    
    
    displayResults();
}

// First Come First Serve (FCFS) algorithm
function fcfs() {
    
    processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    let currentTime = 0;
    ganttChartData = [];
    
    for (let i = 0; i < processes.length; i++) {
        const process = processes[i];
        
        // Update current time if there's a gap
        if (currentTime < process.arrivalTime) {
            ganttChartData.push({ id: 'idle', start: currentTime, end: process.arrivalTime });
            currentTime = process.arrivalTime;
        }
        
        process.startTime = currentTime;
        process.finishTime = currentTime + process.burstTime;
        currentTime = process.finishTime;
        
        ganttChartData.push({ id: process.id, start: process.startTime, end: process.finishTime });
    }
}

// Shortest Job First (Non-Preemptive) algorithm
function sjfNonPreemptive() {
    // Create a copy of processes to work with
    const processQueue = [...processes];
    processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    let currentTime = 0;
    let completed = 0;
    const n = processes.length;
    ganttChartData = [];
    
    // Keep track of which processes have been scheduled
    const scheduled = new Array(n).fill(false);
    
    while (completed < n) {
        // Find arrived and unscheduled process with shortest burst time
        let shortestJob = -1;
        let shortestBurstTime = Infinity;
        
        for (let i = 0; i < n; i++) {
            const process = processQueue[i];
            if (!scheduled[i] && process.arrivalTime <= currentTime && process.burstTime < shortestBurstTime) {
                shortestJob = i;
                shortestBurstTime = process.burstTime;
            }
        }
        
        // If no process is available at current time, jump to next arrival
        if (shortestJob === -1) {
            // Find the next arriving process
            let nextArrival = Infinity;
            let nextProcess = -1;
            for (let i = 0; i < n; i++) {
                if (!scheduled[i] && processQueue[i].arrivalTime < nextArrival) {
                    nextArrival = processQueue[i].arrivalTime;
                    nextProcess = i;
                }
            }
            
            // Add idle time to Gantt chart
            if (nextProcess !== -1) {
                ganttChartData.push({ id: 'idle', start: currentTime, end: nextArrival });
                currentTime = nextArrival;
            } else {
                
                break;
            }
            continue;
        }
        
        // Schedule the shortest job
        const process = processQueue[shortestJob];
        process.startTime = currentTime;
        process.finishTime = currentTime + process.burstTime;
        
        // Add to Gantt chart
        ganttChartData.push({ id: process.id, start: process.startTime, end: process.finishTime });
        
        currentTime = process.finishTime;
        scheduled[shortestJob] = true;
        completed++;
    }
    
    // Update the original processes array with calculated times
    for (const process of processQueue) {
        const original = processes.find(p => p.id === process.id);
        original.startTime = process.startTime;
        original.finishTime = process.finishTime;
    }
}

// Shortest Job First (Preemptive) algorithm - Shortest Remaining Time First
function sjfPreemptive() {
    // Create a deep copy of processes
    const processCopy = processes.map(p => ({...p}));
    processCopy.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    const n = processCopy.length;
    let currentTime = 0;
    let completedProcesses = 0;
    ganttChartData = [];
    
    
    let currentProcess = null;
    let processStartTime = 0;
    
    while (completedProcesses < n) {
        // Find the process with shortest remaining time among arrived processes
        let shortestRemainingTime = Infinity;
        let shortestProcessIndex = -1;
        
        for (let i = 0; i < n; i++) {
            const process = processCopy[i];
            if (process.remainingTime > 0 && process.arrivalTime <= currentTime && 
                process.remainingTime < shortestRemainingTime) {
                shortestRemainingTime = process.remainingTime;
                shortestProcessIndex = i;
            }
        }
        
        // If no process available, jump to next arrival time
        if (shortestProcessIndex === -1) {
            // Find next arriving process
            let nextArrivalTime = Infinity;
            for (const process of processCopy) {
                if (process.remainingTime > 0 && process.arrivalTime > currentTime && 
                    process.arrivalTime < nextArrivalTime) {
                    nextArrivalTime = process.arrivalTime;
                }
            }
            
            // Add idle time to Gantt chart if there was a running process
            if (currentProcess !== null) {
                ganttChartData.push({ 
                    id: currentProcess.id, 
                    start: processStartTime, 
                    end: currentTime 
                });
                currentProcess = null;
            }
            
            // Add idle time
            if (nextArrivalTime !== Infinity) {
                ganttChartData.push({ id: 'idle', start: currentTime, end: nextArrivalTime });
                currentTime = nextArrivalTime;
            } else {
                break; 
            }
            continue;
        }
        
        const nextProcess = processCopy[shortestProcessIndex];
        
        // If process changes, add previous process execution to Gantt chart
        if (currentProcess === null || currentProcess.id !== nextProcess.id) {
            if (currentProcess !== null) {
                ganttChartData.push({ 
                    id: currentProcess.id, 
                    start: processStartTime, 
                    end: currentTime 
                });
            }
            
            // Record start time if first execution of this process
            if (nextProcess.startTime === -1) {
                nextProcess.startTime = currentTime;
                // Update in the original processes array
                const original = processes.find(p => p.id === nextProcess.id);
                original.startTime = currentTime;
            }
            
            currentProcess = nextProcess;
            processStartTime = currentTime;
        }
        
        // Execute for 1 time unit
        currentTime++;
        nextProcess.remainingTime--;
        
        // If process completes
        if (nextProcess.remainingTime === 0) {
            nextProcess.finishTime = currentTime;
            
            // Update in the original processes array
            const original = processes.find(p => p.id === nextProcess.id);
            original.finishTime = currentTime;
            
            completedProcesses++;
            
            // Add process to Gantt chart
            ganttChartData.push({ 
                id: currentProcess.id, 
                start: processStartTime, 
                end: currentTime 
            });
            
            currentProcess = null;
        }
    }
}

// Longest Job First (Non-Preemptive) algorithm
function ljfNonPreemptive() {
    // Create a copy of processes to work with
    const processQueue = [...processes];
    processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    let currentTime = 0;
    let completed = 0;
    const n = processes.length;
    ganttChartData = [];
    
    // Keep track of which processes have been scheduled
    const scheduled = new Array(n).fill(false);
    
    while (completed < n) {
        // Find arrived and unscheduled process with longest burst time
        let longestJob = -1;
        let longestBurstTime = -1;
        
        for (let i = 0; i < n; i++) {
            const process = processQueue[i];
            if (!scheduled[i] && process.arrivalTime <= currentTime && process.burstTime > longestBurstTime) {
                longestJob = i;
                longestBurstTime = process.burstTime;
            }
        }
        
        // If no process is available at current time, jump to next arrival
        if (longestJob === -1) {
            // Find the next arriving process
            let nextArrival = Infinity;
            let nextProcess = -1;
            for (let i = 0; i < n; i++) {
                if (!scheduled[i] && processQueue[i].arrivalTime < nextArrival) {
                    nextArrival = processQueue[i].arrivalTime;
                    nextProcess = i;
                }
            }
            
            // Add idle time to Gantt chart
            if (nextProcess !== -1) {
                ganttChartData.push({ id: 'idle', start: currentTime, end: nextArrival });
                currentTime = nextArrival;
            } else {
                break; 
            }
            continue;
        }
        
        // Schedule the longest job
        const process = processQueue[longestJob];
        process.startTime = currentTime;
        process.finishTime = currentTime + process.burstTime;
        
        // Add to Gantt chart
        ganttChartData.push({ id: process.id, start: process.startTime, end: process.finishTime });
        
        currentTime = process.finishTime;
        scheduled[longestJob] = true;
        completed++;
    }
    
    // Update the original processes array with calculated times
    for (const process of processQueue) {
        const original = processes.find(p => p.id === process.id);
        original.startTime = process.startTime;
        original.finishTime = process.finishTime;
    }
}

// Longest Job First (Preemptive) algorithm
function ljfPreemptive() {
    // Create a deep copy of processes
    const processCopy = processes.map(p => ({...p}));
    processCopy.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    const n = processCopy.length;
    let currentTime = 0;
    let completedProcesses = 0;
    ganttChartData = [];
    
    // Track the current running process
    let currentProcess = null;
    let processStartTime = 0;
    
    while (completedProcesses < n) {
        // Find the process with longest remaining time among arrived processes
        let longestRemainingTime = -1;
        let longestProcessIndex = -1;
        
        for (let i = 0; i < n; i++) {
            const process = processCopy[i];
            if (process.remainingTime > 0 && process.arrivalTime <= currentTime && 
                process.remainingTime > longestRemainingTime) {
                longestRemainingTime = process.remainingTime;
                longestProcessIndex = i;
            }
        }
        
        // If no process available, jump to next arrival time
        if (longestProcessIndex === -1) {
            // Find next arriving process
            let nextArrivalTime = Infinity;
            for (const process of processCopy) {
                if (process.remainingTime > 0 && process.arrivalTime > currentTime && 
                    process.arrivalTime < nextArrivalTime) {
                    nextArrivalTime = process.arrivalTime;
                }
            }
            
            // Add current process to Gantt chart if there was one running
            if (currentProcess !== null) {
                ganttChartData.push({ 
                    id: currentProcess.id, 
                    start: processStartTime, 
                    end: currentTime 
                });
                currentProcess = null;
            }
            
            // Add idle time
            if (nextArrivalTime !== Infinity) {
                ganttChartData.push({ id: 'idle', start: currentTime, end: nextArrivalTime });
                currentTime = nextArrivalTime;
            } else {
                break; 
            }
            continue;
        }
        
        const nextProcess = processCopy[longestProcessIndex];
        
        // If process changes, add previous process execution to Gantt chart
        if (currentProcess === null || currentProcess.id !== nextProcess.id) {
            if (currentProcess !== null) {
                ganttChartData.push({ 
                    id: currentProcess.id, 
                    start: processStartTime, 
                    end: currentTime 
                });
            }
            
            // Record start time if first execution of this process
            if (nextProcess.startTime === -1) {
                nextProcess.startTime = currentTime;
                // Update in the original processes array
                const original = processes.find(p => p.id === nextProcess.id);
                original.startTime = currentTime;
            }
            
            currentProcess = nextProcess;
            processStartTime = currentTime;
        }
        
        // Execute for 1 time unit
        currentTime++;
        nextProcess.remainingTime--;
        
        // If process completes
        if (nextProcess.remainingTime === 0) {
            nextProcess.finishTime = currentTime;
            
            // Update in the original processes array
            const original = processes.find(p => p.id === nextProcess.id);
            original.finishTime = currentTime;
            
            completedProcesses++;
            
            // Add to Gantt chart
            ganttChartData.push({ 
                id: currentProcess.id, 
                start: processStartTime, 
                end: currentTime 
            });
            
            currentProcess = null;
        }
    }
}

// Priority Scheduling (Non-Preemptive) algorithm
function priorityNonPreemptive() {
    // Create a copy of processes to work with
    const processQueue = [...processes];
    processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    let currentTime = 0;
    let completed = 0;
    const n = processes.length;
    ganttChartData = [];
    
    // Keep track of which processes have been scheduled
    const scheduled = new Array(n).fill(false);
    
    while (completed < n) {
        // Find arrived and unscheduled process with highest priority (lowest value)
        let highestPriorityJob = -1;
        let highestPriority = Infinity;
        
        for (let i = 0; i < n; i++) {
            const process = processQueue[i];
            if (!scheduled[i] && process.arrivalTime <= currentTime && process.priority < highestPriority) {
                highestPriorityJob = i;
                highestPriority = process.priority;
            }
        }
        
        // If no process is available at current time, jump to next arrival
        if (highestPriorityJob === -1) {
            // Find the next arriving process
            let nextArrival = Infinity;
            let nextProcess = -1;
            for (let i = 0; i < n; i++) {
                if (!scheduled[i] && processQueue[i].arrivalTime < nextArrival) {
                    nextArrival = processQueue[i].arrivalTime;
                    nextProcess = i;
                }
            }
            
            // Add idle time to Gantt chart
            if (nextProcess !== -1) {
                ganttChartData.push({ id: 'idle', start: currentTime, end: nextArrival });
                currentTime = nextArrival;
            } else {
                break; // Should not happen
            }
            continue;
        }
        
        // Schedule the process with highest priority
        const process = processQueue[highestPriorityJob];
        process.startTime = currentTime;
        process.finishTime = currentTime + process.burstTime;
        
        // Add to Gantt chart
        ganttChartData.push({ id: process.id, start: process.startTime, end: process.finishTime });
        
        currentTime = process.finishTime;
        scheduled[highestPriorityJob] = true;
        completed++;
    }
    
    // Update the original processes array with calculated times
    for (const process of processQueue) {
        const original = processes.find(p => p.id === process.id);
        original.startTime = process.startTime;
        original.finishTime = process.finishTime;
    }
}

// Priority Scheduling (Preemptive) algorithm
function priorityPreemptive() {
    // Create a deep copy of processes
    const processCopy = processes.map(p => ({...p}));
    processCopy.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    const n = processCopy.length;
    let currentTime = 0;
    let completedProcesses = 0;
    ganttChartData = [];
    
    // Track the current running process
    let currentProcess = null;
    let processStartTime = 0;
    
    while (completedProcesses < n) {
        // Find the process with highest priority among arrived processes
        let highestPriority = Infinity;
        let highestPriorityIndex = -1;
        
        for (let i = 0; i < n; i++) {
            const process = processCopy[i];
            if (process.remainingTime > 0 && process.arrivalTime <= currentTime && 
                process.priority < highestPriority) {
                highestPriority = process.priority;
                highestPriorityIndex = i;
            }
        }
        
        // If no process available, jump to next arrival time
        if (highestPriorityIndex === -1) {
            // Find next arriving process
            let nextArrivalTime = Infinity;
            for (const process of processCopy) {
                if (process.remainingTime > 0 && process.arrivalTime > currentTime && 
                    process.arrivalTime < nextArrivalTime) {
                    nextArrivalTime = process.arrivalTime;
                }
            }
            
            // Add current process to Gantt chart if there was one running
            if (currentProcess !== null) {
                ganttChartData.push({ 
                    id: currentProcess.id, 
                    start: processStartTime, 
                    end: currentTime 
                });
                currentProcess = null;
            }
            
            // Add idle time
            if (nextArrivalTime !== Infinity) {
                ganttChartData.push({ id: 'idle', start: currentTime, end: nextArrivalTime });
                currentTime = nextArrivalTime;
            } else {
                break; 
            }
            continue;
        }
        
        const nextProcess = processCopy[highestPriorityIndex];
        
        // If process changes, add previous process execution to Gantt chart
        if (currentProcess === null || currentProcess.id !== nextProcess.id) {
            if (currentProcess !== null) {
                ganttChartData.push({ 
                    id: currentProcess.id, 
                    start: processStartTime, 
                    end: currentTime 
                });
            }
            
            // Record start time if first execution of this process
            if (nextProcess.startTime === -1) {
                nextProcess.startTime = currentTime;
                // Update in the original processes array
                const original = processes.find(p => p.id === nextProcess.id);
                original.startTime = currentTime;
            }
            
            currentProcess = nextProcess;
            processStartTime = currentTime;
        }
        
        // Execute for 1 time unit
        currentTime++;
        nextProcess.remainingTime--;
        
        // If process completes
        if (nextProcess.remainingTime === 0) {
            nextProcess.finishTime = currentTime;
            
            // Update in the original processes array
            const original = processes.find(p => p.id === nextProcess.id);
            original.finishTime = currentTime;
            
            completedProcesses++;
            
            // Add to Gantt chart
            ganttChartData.push({ 
                id: currentProcess.id, 
                start: processStartTime, 
                end: currentTime 
            });
            
            currentProcess = null;
        }
    }
}

// Round Robin algorithm
function roundRobin(quantum) {
    // Create a deep copy of processes
    const processCopy = processes.map(p => ({...p}));
    processCopy.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    const n = processCopy.length;
    let currentTime = 0;
    let completedProcesses = 0;
    ganttChartData = [];
    
    // Create a ready queue
    const readyQueue = [];
    let i = 0;
    
    // Continue until all processes are completed
    while (completedProcesses < n) {
        // Add newly arrived processes to the ready queue
        while (i < n && processCopy[i].arrivalTime <= currentTime) {
            readyQueue.push(i);
            i++;
        }
        
        // If ready queue is empty, jump to next process arrival
        if (readyQueue.length === 0) {
            if (i < n) {
                ganttChartData.push({ id: 'idle', start: currentTime, end: processCopy[i].arrivalTime });
                currentTime = processCopy[i].arrivalTime;
            } else {
                break; // All processes have completed
            }
            continue;
        }
        
        // Get next process from ready queue
        const processIndex = readyQueue.shift();
        const process = processCopy[processIndex];
        
        // If this is the first time this process runs, record start time
        if (process.startTime === -1) {
            process.startTime = currentTime;
            // Update in the original processes array
            const original = processes.find(p => p.id === process.id);
            original.startTime = currentTime;
        }
        
        // Calculate execution time for this time slice
        const executeTime = Math.min(quantum, process.remainingTime);
        
        // Add to Gantt chart
        ganttChartData.push({ 
            id: process.id, 
            start: currentTime, 
            end: currentTime + executeTime 
        });
        
        // Update current time and remaining time
        currentTime += executeTime;
        process.remainingTime -= executeTime;
        
        // Add newly arrived processes during this time slice
        while (i < n && processCopy[i].arrivalTime <= currentTime) {
            readyQueue.push(i);
            i++;
        }
        
        // If process completed
        if (process.remainingTime === 0) {
            process.finishTime = currentTime;
            // Update in the original processes array
            const original = processes.find(p => p.id === process.id);
            original.finishTime = currentTime;
            completedProcesses++;
        } else {
            // Put the process back in the ready queue
            readyQueue.push(processIndex);
        }
    }
}

// Calculate waiting time, turnaround time, etc.
function calculateMetrics() {
    for (const process of processes) {
        // Calculate turnaround time = completion time - arrival time
        process.turnaroundTime = process.finishTime - process.arrivalTime;
        
        // Calculate waiting time = turnaround time - burst time
        process.waitingTime = process.turnaroundTime - process.burstTime;
        
        // Calculate response time = first time CPU - arrival time
        process.responseTime = process.startTime - process.arrivalTime;
    }
}

// Display results in the UI
function displayResults() {
    // Calculate average waiting time and turnaround time
    let totalWaitingTime = 0;
    let totalTurnaroundTime = 0;
    
    for (const process of processes) {
        totalWaitingTime += process.waitingTime;
        totalTurnaroundTime += process.turnaroundTime;
    }
    
    const avgWaitingTime = totalWaitingTime / processes.length;
    const avgTurnaroundTime = totalTurnaroundTime / processes.length;
    
    // Update metrics display
    document.getElementById('avg_waiting_time').textContent = avgWaitingTime.toFixed(2);
    document.getElementById('avg_turnaround_time').textContent = avgTurnaroundTime.toFixed(2);
    
    // Create process table
    const tableContainer = document.getElementById('process-table');
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Process</th>
                    <th>Arrival Time</th>
                    <th>Burst Time</th>
                    <th>Start Time</th>
                    <th>Finish Time</th>
                    <th>Waiting Time</th>
                    <th>Turnaround Time</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Sort processes by ID for display
    const sortedProcesses = [...processes].sort((a, b) => a.id - b.id);
    
    for (const process of sortedProcesses) {
        tableHTML += `
            <tr>
                <td>P${process.id}</td>
                <td>${process.arrivalTime}</td>
                <td>${process.burstTime}</td>
                <td>${process.startTime}</td>
                <td>${process.finishTime}</td>
                <td>${process.waitingTime}</td>
                <td>${process.turnaroundTime}</td>
            </tr>
        `;
    }
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    tableContainer.innerHTML = tableHTML;
    
    // Create Gantt chart
    createGanttChart();
    
    // Show results section
    document.getElementById('results-section').style.display = 'block';
}

// Create Gantt chart visualization
function createGanttChart() {
    const ganttChart = document.getElementById('gantt-chart');
    const ganttTimeline = document.getElementById('gantt-timeline');
    
    // Clear previous content
    ganttChart.innerHTML = '';
    ganttTimeline.innerHTML = '';
    
    // Find the end time of the last process
    const endTime = Math.max(...ganttChartData.map(item => item.end));
    
    // Generate unique colors for processes
    const colors = generateProcessColors(processes.length);
    
    // Calculate the width of each time unit (in percentage)
    const timeUnitWidth = 100 / endTime;
    
    // Create Gantt chart blocks
    let ganttHTML = '';
    
    for (const item of ganttChartData) {
        const width = (item.end - item.start) * timeUnitWidth;
        const left = item.start * timeUnitWidth;
        
        let blockClass = '';
        let label = '';
        
        if (item.id === 'idle') {
            blockClass = 'gantt-idle';
            label = 'Idle';
        } else {
            blockClass = 'gantt-process';
            const colorIndex = (item.id - 1) % colors.length;
            const backgroundColor = colors[colorIndex];
            label = `P${item.id}`;
            ganttHTML += `
                <div class="${blockClass}" style="width: ${width}%; left: ${left}%; background-color: ${backgroundColor};">
                    <span>${label}</span>
                </div>
            `;
        }
    }
    
    ganttChart.innerHTML = ganttHTML;
    
    
    let timelineHTML = '';
    for (let i = 0; i <= endTime; i++) {
        const left = i * timeUnitWidth;
        timelineHTML += `
            <div class="timeline-marker" style="left: ${left}%;">
                <span>${i}</span>
            </div>
        `;
    }
    
    ganttTimeline.innerHTML = timelineHTML;
}

// Generates different colors for processes
function generateProcessColors(count) {
    const baseColors = [
        '#4285F4', // Blue
        '#EA4335', // Red
        '#FBBC05', // Yellow
        '#34A853', // Green
        '#FF6D01', // Orange
        '#46BDC6', // Teal
        '#7B1FA2', // Purple
        '#0097A7', // Cyan
        '#689F38', // Light Green
        '#F06292', // Pink
        '#5D4037', // Brown
        '#00ACC1', // Light Blue
        '#3949AB', // Indigo
        '#8D6E63', // Brown
        '#78909C'  // Blue Grey
    ];
    
    // If we need more colors than in our base palette, we'll generate them
    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    }
    
    // Generate additional colors using HSL to ensure they're visually distinct
    const colors = [...baseColors];
    const additionalCount = count - baseColors.length;
    
    for (let i = 0; i < additionalCount; i++) {
        const hue = (i * 137.5) % 360; 
        colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    
    return colors;
}

// Event listeners setup
document.addEventListener('DOMContentLoaded', function() {
    // Set up initial algorithm state
    handleAlgorithmChange();
    
    // Adding example button for demo purposes
    const form = document.querySelector('.form-container');
    const buttonContainer = document.querySelector('.button-container');
    
    const loadExampleBtn = document.createElement('button');
    loadExampleBtn.type = 'button';
    loadExampleBtn.className = 'button-secondary';
    loadExampleBtn.innerText = 'Load Example';
    loadExampleBtn.onclick = loadExampleData;
    
    buttonContainer.appendChild(loadExampleBtn);
});

// Load example data for demonstration
function loadExampleData() {
    document.getElementById('arrival_time').value = '0 1 2 3';
    document.getElementById('burst_time').value = '5 3 8 6';
    document.getElementById('priority').value = '2 1 4 3';
    document.getElementById('time_quantum').value = '2';
}

// Helper function to optimize Gantt chart by merging consecutive blocks of the same process
function optimizeGanttChart(data) {
    if (data.length <= 1) return data;
    
    const optimized = [];
    let current = data[0];
    
    for (let i = 1; i < data.length; i++) {
        const next = data[i];
        
        // If consecutive blocks are the same process, merge them
        if (current.id === next.id && current.end === next.start) {
            current.end = next.end;
        } else {
            optimized.push(current);
            current = next;
        }
    }
    
    // Add the last block
    optimized.push(current);
    return optimized;
}