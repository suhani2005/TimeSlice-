// Global variables
let processes = [];
let ganttChartData = [];

// Algorithm descriptions
const descriptions = {
    fcfs: "First Come, First Serve (FCFS) schedules processes based on arrival order, without preemption.",
    sjfNonPreemptive: "Shortest Job First (Non-Preemptive) selects the process with the smallest burst time and executes it until completion.",
    sjfPreemptive: "Shortest Job First (Preemptive) chooses the shortest process dynamically, allowing preemptions.",
    ljfNonPreemptive: "Longest Job First (Non-Preemptive) selects the process with the longest burst time and completes it before switching.",
    ljfPreemptive: "Longest Job First (Preemptive) dynamically selects the process with the highest remaining burst time.",
    priorityNonPreemptive: "Priority Scheduling (Non-Preemptive) picks the process with the highest priority and runs it to completion.",
    priorityPreemptive: "Priority Scheduling (Preemptive) allows higher priority processes to interrupt lower priority ones.",
    roundRobin: "Round Robin executes each process for a fixed time slice (Quantum) and cycles through them until completion."
};

//theme
document.addEventListener('DOMContentLoaded', function () {
    const themeSwitch = document.getElementById('theme-switch');
    const body = document.body;

    // Check for saved theme preference or default to 'light'
    const currentTheme = localStorage.getItem('theme') || 'light';

    if (currentTheme === 'dark') {
        body.classList.add('dark-theme');
        themeSwitch.checked = true;
    }

    // Theme switch event listener
    themeSwitch.addEventListener('change', function () {
        if (this.checked) {
            body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    });
});

// Show/hide form fields based on algorithm selection
function handleAlgorithmChange() {
    const algorithm = document.getElementById('algorithm').value;
    const quantumContainer = document.getElementById('quantum-container');
    const priorityContainer = document.getElementById('priority-container');
    const descriptionElement = document.getElementById('algorithm-description');

    // Show/hide relevant input fields
    quantumContainer.style.display = algorithm === 'roundRobin' ? 'block' : 'none';
    priorityContainer.style.display = (algorithm.includes('priority')) ? 'block' : 'none';


    // Set description text
    descriptionElement.textContent = descriptions[algorithm] || "Select an algorithm to see its description.";
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
    const processCopy = processes.map(p => ({ ...p }));
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
    const processCopy = processes.map(p => ({ ...p }));
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
    const processCopy = processes.map(p => ({ ...p }));
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
    const processCopy = processes.map(p => ({ ...p }));
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
document.addEventListener('DOMContentLoaded', function () {
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
    const examples = [
        { arrival: "0 1 2 3", burst: "5 3 8 6", priority: "2 1 4 3" },
        { arrival: "1 2 3 4", burst: "4 6 2 5", priority: "3 1 4 2" },
        { arrival: "0 2 4 6", burst: "7 5 3 9", priority: "1 3 2 4" },
        { arrival: "3 5 7 9", burst: "6 4 7 3", priority: "4 2 3 1" }
    ];

    // Pick a random example
    const randomExample = examples[Math.floor(Math.random() * examples.length)];

    // Set the form inputs
    document.getElementById('arrival_time').value = randomExample.arrival;
    document.getElementById('burst_time').value = randomExample.burst;
    document.getElementById('priority').value = randomExample.priority;
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

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Define colors and styles
    const colors = {
        primary: [0, 123, 255],
        secondary: [108, 117, 125],
        success: [40, 167, 69],
        dark: [33, 37, 41],
        light: [248, 249, 250],
        white: [255, 255, 255]
    };

    // Helper function to add header
    function addHeader(doc, title) {
        // Header background
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, 210, 25, 'F');

        // Title
        doc.setTextColor(...colors.white);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(title, 20, 16);

        // Date and time
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const now = new Date();
        const dateTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
        doc.text(`Generated: ${dateTime}`, 210 - 60, 16);

        return 35; // Return Y position after header
    }

    // Helper function to add section header
    function addSectionHeader(doc, text, y) {
        doc.setFillColor(...colors.light);
        doc.rect(15, y - 5, 180, 12, 'F');

        doc.setTextColor(...colors.primary);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(text, 20, y + 3);

        return y + 20;
    }

    // Helper function to add footer
    function addFooter(doc, pageNum) {
        doc.setFillColor(...colors.dark);
        doc.rect(0, 285, 210, 12, 'F');

        doc.setTextColor(...colors.white);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Time Slice - CPU Scheduling Simulator", 20, 292);
        doc.text(`Page ${pageNum}`, 185, 292);
    }

    let currentY = addHeader(doc, "CPU Scheduling Analysis Report");

    // Executive Summary Section
    currentY = addSectionHeader(doc, "Summary", currentY);

    const algorithm = document.getElementById('algorithm').selectedOptions[0].text;
    const avgWaitTime = document.getElementById('avg_waiting_time').textContent;
    const avgTurnaroundTime = document.getElementById('avg_turnaround_time').textContent;

    doc.setTextColor(...colors.dark);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const summaryText = [
        `This report presents the analysis of CPU scheduling simulation using the ${algorithm} algorithm.`,
        `The simulation demonstrates process execution timing, resource utilization, and performance metrics.`,
        "",
        "Key Performance Indicators:",
        `• Average Waiting Time: ${avgWaitTime} time units`,
        `• Average Turnaround Time: ${avgTurnaroundTime} time units`
    ];

    summaryText.forEach(line => {
        doc.text(line, 20, currentY);
        currentY += 6;
    });

    currentY += 10;

    // Algorithm Details Section
    currentY = addSectionHeader(doc, "Algorithm Configuration", currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const algorithmDetails = [
        `Selected Algorithm: ${algorithm}`,
        `Description: ${descriptions[document.getElementById('algorithm').value] || 'N/A'}`
    ];

    // Add time quantum if Round Robin
    if (document.getElementById('algorithm').value === 'roundRobin') {
        const quantum = document.getElementById('time_quantum').value;
        algorithmDetails.push(`Time Quantum: ${quantum} time units`);
    }

    algorithmDetails.forEach(line => {
        doc.text(line, 20, currentY);
        currentY += 8;
    });

    currentY += 10;

    // Performance Metrics Section
    currentY = addSectionHeader(doc, "Performance Metrics", currentY);

    // Create metrics table
    const metricsData = [
        ['Metric', 'Value', 'Description'],
        ['Average Waiting Time', avgWaitTime, 'Time processes wait in ready queue'],
        ['Average Turnaround Time', avgTurnaroundTime, 'Total time for process completion']
    ];

    doc.autoTable({
        startY: currentY,
        head: [metricsData[0]],
        body: metricsData.slice(1),
        theme: 'grid',
        styles: {
            fontSize: 10,
            cellPadding: 8,
            textColor: colors.dark
        },
        headStyles: {
            fillColor: colors.primary,
            textColor: colors.white,
            fontStyle: 'bold',
            fontSize: 11
        },
        alternateRowStyles: {
            fillColor: [248, 249, 250]
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 90 }
        }
    });

    currentY = doc.lastAutoTable.finalY + 15;

    // Process Details Section
    currentY = addSectionHeader(doc, "Process Execution Details", currentY);

    // Get process data from the table
    const processTable = document.querySelector('#process-table table');
    if (processTable) {
        const headers = Array.from(processTable.querySelectorAll('th')).map(th => th.textContent);
        const rows = Array.from(processTable.querySelectorAll('tbody tr')).map(tr =>
            Array.from(tr.querySelectorAll('td')).map(td => td.textContent)
        );

        doc.autoTable({
            startY: currentY,
            head: [headers],
            body: rows,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 6,
                textColor: colors.dark
            },
            headStyles: {
                fillColor: colors.success,
                textColor: colors.white,
                fontStyle: 'bold',
                fontSize: 10
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250]
            },
            columnStyles: {
                0: { fontStyle: 'bold', halign: 'center' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 15;
    }

    // Replace the Gantt Chart Section in your exportToPDF function with this:

    // Gantt Chart Section
    currentY = addSectionHeader(doc, "Gantt Chart Visualization", currentY);

    // Draw Gantt chart
    const ganttContainer = document.getElementById('gantt-chart');
    if (ganttContainer) {
        const processes = ganttContainer.querySelectorAll('.gantt-process');
        const chartHeight = 20;
        const chartWidth = 160;
        const startX = 20;

        // Draw chart background
        doc.setFillColor(...colors.light);
        doc.rect(startX, currentY, chartWidth, chartHeight, 'F');

        // Define process colors array for cycling through different colors
        const processColorPalette = [
            [0, 123, 255],    // Blue
            [40, 167, 69],    // Green
            [255, 193, 7],    // Yellow
            [220, 53, 69],    // Red
            [111, 66, 193],   // Purple
            [253, 126, 20],   // Orange
            [32, 201, 151],   // Teal
            [232, 62, 140]    // Pink
        ];

        // Track which processes we've seen to assign consistent colors
        const processColorMap = new Map();
        let colorIndex = 0;

        // Draw processes
        processes.forEach((process, index) => {
            // Get process name/ID from the text content
            const processText = process.textContent.trim();
            const processId = processText.replace(/[^0-9]/g, '') || processText; // Extract number or use full text

            // Assign color based on process ID
            if (!processColorMap.has(processId)) {
                processColorMap.set(processId, processColorPalette[colorIndex % processColorPalette.length]);
                colorIndex++;
            }

            const color = processColorMap.get(processId);

            const left = parseFloat(process.style.left) * chartWidth / 100;
            const width = parseFloat(process.style.width) * chartWidth / 100;

            // Draw process bar
            doc.setFillColor(...color);
            doc.rect(startX + left, currentY, width, chartHeight, 'F');

            // Add process label with white text
            doc.setTextColor(...colors.white);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);

            // Center the text in the process bar
            const textX = startX + left + width / 2;
            const textY = currentY + chartHeight / 2 + 3;
            doc.text(processText, textX, textY, { align: 'center' });

            // Add border for better visibility
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.rect(startX + left, currentY, width, chartHeight);
        });

        currentY += chartHeight + 15;

        // Add timeline
        const timeline = document.getElementById('gantt-timeline');
        if (timeline) {
            const markers = timeline.querySelectorAll('.timeline-marker');
            doc.setTextColor(...colors.secondary);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);

            markers.forEach(marker => {
                const left = parseFloat(marker.style.left) * chartWidth / 100;
                const timeSpan = marker.querySelector('span');
                if (timeSpan) {
                    const time = timeSpan.textContent;
                    doc.text(time, startX + left, currentY);
                }
            });
        }
    }

    currentY += 15;

    // Analysis and Recommendations Section
    currentY = addSectionHeader(doc, "Analysis & Recommendations", currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const analysisText = [
        "Performance Analysis:",
        `• The ${algorithm} algorithm shows specific performance characteristics`,
        "• Consider the trade-offs between waiting time and turnaround time",
        "• Process scheduling efficiency depends on workload patterns",
        "",
        "Recommendations:",
        "• Monitor system performance with different algorithms",
        "• Adjust time quantum for Round Robin if applicable",
        "• Consider process priorities for better resource allocation"
    ];

    analysisText.forEach(line => {
        if (line.startsWith('•')) {
            doc.setTextColor(...colors.secondary);
        } else if (line.includes(':')) {
            doc.setTextColor(...colors.primary);
            doc.setFont("helvetica", "bold");
        } else {
            doc.setTextColor(...colors.dark);
            doc.setFont("helvetica", "normal");
        }

        doc.text(line, 20, currentY);
        currentY += 6;
    });

    // Add footer
    addFooter(doc, 1);

    // Save the PDF
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    doc.save(`CPU_Scheduling_Report_${timestamp}.pdf`);
}