const airlines = [
    'American Airlines', 'Delta Air Lines', 'United Airlines', 'Southwest Airlines',
    'JetBlue Airways', 'Alaska Airlines', 'Spirit Airlines', 'Frontier Airlines',
    'Hawaiian Airlines', 'Allegiant Air'
];

const planes = [
    'Boeing 737', 'Boeing 747', 'Boeing 777', 'Boeing 787',
    'Airbus A320', 'Airbus A330', 'Airbus A350', 'Airbus A380'
];

let currentPage = 0;
const flightsPerPage = 6;
let allFlights = [];
let searchData = {};
let filteredFlights = []; // Tracks currently filtered flights

// --- LATENCY SIMULATION & WORKAROUND LOGIC ---
let toolExecutionLatency = 0;
let enableToolBugWorkaround = true; // Default checked

document.getElementById('latencyInput').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    toolExecutionLatency = isNaN(val) ? 0 : val;
    console.log(`Tool latency set to ${toolExecutionLatency}ms`);
});

document.getElementById('toolBugWorkaround').addEventListener('change', (e) => {
    enableToolBugWorkaround = e.target.checked;
    console.log(`Tool bug workaround active: ${enableToolBugWorkaround}`);
    updateModelContext(); // Immediate update when toggled
});

// Wrapper function to add delay
const withLatency = (fn) => async (...args) => {
    if (toolExecutionLatency > 0) {
        console.log(`Simulating tool latency: ${toolExecutionLatency}ms...`);
        await new Promise(resolve => setTimeout(resolve, toolExecutionLatency));
    }
    return fn(...args);
};
// --------------------------------

// Search flights function
async function searchFlights({ origin, destination, departureDate, returnDate, passengers }) {
    console.log('running searchFlights');
    // Fill in the form
    document.getElementById('origin').value = origin;
    document.getElementById('destination').value = destination;
    document.getElementById('departureDate').value = departureDate;
    document.getElementById('passengers').value = passengers.toString();
    
    if (returnDate) {
        document.getElementById('oneWay').checked = false;
        document.getElementById('returnDateGroup').classList.remove('hidden');
        document.getElementById('returnDate').value = returnDate;
    } else {
        document.getElementById('oneWay').checked = true;
        document.getElementById('returnDateGroup').classList.add('hidden');
        document.getElementById('returnDate').value = '';
    }

    // Store search data
    searchData = {
        origin,
        destination,
        departureDate,
        oneWay: !returnDate,
        returnDate,
        passengers
    };

    // Generate flights
    allFlights = generateFlights(origin, destination);
    filteredFlights = [...allFlights]; // Initialize filtered flights
    currentPage = 0;

    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'UTC'
    };

    // Update summary
    const summaryHtml = `
        <h2>${searchData.origin} → ${searchData.destination}</h2>
        <p>${new Date(searchData.departureDate).toLocaleDateString('en-US', dateOptions)}
        ${searchData.returnDate ? ' - ' + new Date(searchData.returnDate).toLocaleDateString('en-US', dateOptions) : ' (One-way)'}
        • ${searchData.passengers} passenger${searchData.passengers > 1 ? 's' : ''}</p>
    `;
    document.getElementById('searchSummary').innerHTML = summaryHtml;
    document.getElementById('resultsCount').textContent = `${allFlights.length} flights found`;

    // Show results page
    document.getElementById('searchPage').classList.add('hidden');
    document.getElementById('resultsPage').classList.remove('hidden');

    renderFlights();
    updateModelContext(); // Update context for results page

    // Return flight details as STRINGIFIED JSON
    return JSON.stringify({
        totalFlights: allFlights.length,
        flights: allFlights.map(flight => ({
            flightId: flight.flightId,
            airline: flight.airline,
            price: flight.price,
            departure: {
                time: flight.departTime,
                airport: flight.origin
            },
            arrival: {
                time: flight.arriveTime,
                airport: flight.destination
            },
            duration: flight.duration,
            stops: flight.stops,
            details: {
                aircraft: flight.plane,
                legroom: flight.legroom,
                inFlightEntertainment: flight.entertainment,
                wifi: flight.wifi,
                chargingPoints: flight.charging,
                lieFlatUpgrade: flight.lieFlat
            }
        }))
    });
}

// Get flights function - returns currently shown or all flights
async function getFlights({ scope = "visible" }) {
    console.log('running getFlights');
    let flightsToReturn;
    
    if (scope === "visible") {
        // Return only currently visible flights on the page
        const start = currentPage * flightsPerPage;
        const end = start + flightsPerPage;
        flightsToReturn = filteredFlights.slice(start, end);
    } else if (scope === "all") {
        // Return all filtered flights
        flightsToReturn = filteredFlights;
    } else {
        throw new Error("Invalid scope. Use 'visible' or 'all'");
    }

    return JSON.stringify({
        scope: scope,
        totalFlights: filteredFlights.length,
        returnedFlights: flightsToReturn.length,
        flights: flightsToReturn.map(flight => ({
            flightId: flight.flightId,
            airline: flight.airline,
            price: flight.price,
            departure: {
                time: flight.departTime,
                airport: flight.origin
            },
            arrival: {
                time: flight.arriveTime,
                airport: flight.destination
            },
            duration: flight.duration,
            stops: flight.stops,
            details: {
                aircraft: flight.plane,
                legroom: flight.legroom,
                inFlightEntertainment: flight.entertainment,
                wifi: flight.wifi,
                chargingPoints: flight.charging,
                lieFlatUpgrade: flight.lieFlat
            }
        }))
    });
}

// Show specific flights by ID
async function showFlights({ flightIds }) {
    console.log('running showFlights');
    
    // Filter flights by the provided IDs
    filteredFlights = allFlights.filter(flight => flightIds.includes(flight.flightId));
    
    // Reset to first page
    currentPage = 0;
    
    // Update UI
    document.getElementById('resultsCount').textContent = `${filteredFlights.length} flights found`;
    renderFlights();

    return JSON.stringify({
        displayedFlights: filteredFlights.length,
        flightIds: filteredFlights.map(f => f.flightId)
    });
}

// Reset filters to show all flights
async function resetFilters() {
    console.log('running resetFilters');
    
    filteredFlights = [...allFlights];
    currentPage = 0;
    
    // Update UI
    document.getElementById('resultsCount').textContent = `${allFlights.length} flights found`;
    renderFlights();

    return JSON.stringify({
        totalFlights: allFlights.length,
        message: "All filters reset. Showing all flights."
    });
}

// Expose to window for debugging
window.searchFlights = searchFlights;
window.getFlights = getFlights;
window.showFlights = showFlights;
window.resetFilters = resetFilters;
window.is_declarative_tool = window.is_declarative_tool === undefined ? false : window.is_declarative_tool;

// Update model context based on current page
function updateModelContext() {
    if (!window.navigator.modelContext) {
      setTimeout(() => document.write('<h2>WebMCP is not enabled in this browser.<br>For Chrome, enable chrome://flags/#enable-experimental-web-platform-features.</h2>'),0);
      return;
    }

    const isResultsPage = !document.getElementById('resultsPage').classList.contains('hidden');

    // Define search tool to be used in both contexts
    // NOTE: Wrapped withLatency() here
    const searchTool = {
        execute: withLatency(searchFlights),
        name: "search_flights",
        description: "Search for available flights between cities. Returns detailed flight information including airline, price, times, stops, duration, aircraft type, amenities, and seat details.",
        inputSchema: {
            type: "object",
            properties: {
                origin: { 
                    type: "string", 
                    description: "The origin city for the flight" 
                },
                destination: { 
                    type: "string", 
                    description: "The destination city for the flight" 
                },
                departureDate: { 
                    type: "string", 
                    description: "The departure date in YYYY-MM-DD format" 
                },
                returnDate: { 
                    type: "string", 
                    description: "The return date in YYYY-MM-DD format. Only required for round-trip flights. Omit for one-way trips." 
                },
                passengers: { 
                    type: "number", 
                    description: "The number of passengers (1-8)" 
                }
            },
            required: ["origin", "destination", "departureDate", "passengers"]
        }
    };

    if (isResultsPage) {
        // Results page tools
        // NOTE: Wrapped all execute functions withLatency() here
        
        const toolsList = [
            {
                execute: withLatency(getFlights),
                name: "get_flights",
                description: "Get the list of flights. Can return either currently visible flights on the page or all search results.",
                inputSchema: {
                    type: "object",
                    properties: {
                        scope: {
                            type: "string",
                            enum: ["visible", "all"],
                            description: "Scope of flights to return. 'visible' returns only flights currently shown on the page (6 flights), 'all' returns all search results (24 flights).",
                            default: "visible"
                        }
                    }
                }
            },
            {
                execute: withLatency(showFlights),
                name: "show_flights",
                description: "Filter and display only specific flights by their IDs. Updates the UI to show only the selected flights.",
                inputSchema: {
                    type: "object",
                    properties: {
                        flightIds: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of flight IDs to display"
                        }
                    },
                    required: ["flightIds"]
                }
            },
            {
                execute: withLatency(resetFilters),
                name: "reset_filters",
                description: "Remove all filters and show all flights from the original search results.",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            }
        ];

        // CONDITIONAL WORKAROUND:
        // Only add search_flights to the results page if the checkbox is checked
        if (enableToolBugWorkaround && !is_declarative_tool) {
            toolsList.push(searchTool);
        }

        window.navigator.modelContext.provideContext({
            tools: toolsList
        });
    } else if (!is_declarative_tool) {
        // Search page tool
        window.navigator.modelContext.provideContext({
            tools: [
                searchTool
            ]
        });
    }
}

// Initialize context for search page
updateModelContext();

// Set minimum date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('departureDate').setAttribute('min', today);
document.getElementById('returnDate').setAttribute('min', today);

// Update return date minimum when departure date changes
document.getElementById('departureDate').addEventListener('change', function() {
    document.getElementById('returnDate').setAttribute('min', this.value);
});

// Handle one-way checkbox
document.getElementById('oneWay').addEventListener('change', function() {
    const returnDateGroup = document.getElementById('returnDateGroup');
    const returnDateInput = document.getElementById('returnDate');
    
    if (this.checked) {
        returnDateGroup.classList.add('hidden');
        returnDateInput.value = '';
    } else {
        returnDateGroup.classList.remove('hidden');
    }
});

function generateFlights(origin, destination) {
    const flights = [];
    
    for (let i = 0; i < 24; i++) {
        const airline = airlines[Math.floor(Math.random() * airlines.length)];
        const stops = Math.random() < 0.4 ? 0 : Math.random() < 0.7 ? 1 : 2;
        
        // Less stops = shorter duration
        let baseDuration;
        if (stops === 0) {
            baseDuration = 120 + Math.floor(Math.random() * 120); // 2-4 hours for nonstop
        } else if (stops === 1) {
            baseDuration = 240 + Math.floor(Math.random() * 120); // 4-6 hours for 1 stop
        } else {
            baseDuration = 360 + Math.floor(Math.random() * 180); // 6-9 hours for 2 stops
        }
        
        const departHour = 6 + Math.floor(Math.random() * 16);
        const departMinute = Math.floor(Math.random() * 4) * 15;
        
        const arriveTime = new Date();
        arriveTime.setHours(departHour);
        arriveTime.setMinutes(departMinute + baseDuration);
        
        const price = 150 + Math.floor(Math.random() * 450);
        
        const hours = Math.floor(baseDuration / 60);
        const minutes = baseDuration % 60;
        
        // Generate unique flight identifier
        const flightId = `FL${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
        
        flights.push({
            id: i,
            flightId: flightId,
            airline: airline,
            origin: origin,
            destination: destination,
            departTime: `${departHour.toString().padStart(2, '0')}:${departMinute.toString().padStart(2, '0')}`,
            arriveTime: `${arriveTime.getHours().toString().padStart(2, '0')}:${arriveTime.getMinutes().toString().padStart(2, '0')}`,
            duration: hours + 'h ' + minutes + 'm',
            stops: stops,
            price: price,
            plane: planes[Math.floor(Math.random() * planes.length)],
            legroom: (28 + Math.floor(Math.random() * 8)) + ' inches',
            entertainment: Math.random() < 0.7,
            wifi: Math.random() < 0.6,
            charging: Math.random() < 0.8,
            lieFlat: Math.random() < 0.4
        });
    }
    
    return flights.sort((a, b) => a.price - b.price);
}

function renderFlights() {
    const container = document.getElementById('flightResults');
    const start = currentPage * flightsPerPage;
    const end = start + flightsPerPage;
    const pageFlights = filteredFlights.slice(start, end);
    
    container.innerHTML = pageFlights.map(flight => `
        <div class="flight-card">
            <div class="flight-header">
                <div class="airline-info">
                    <div class="airline-logo">${flight.airline.substring(0, 2).toUpperCase()}</div>
                    <span class="airline-name">${flight.airline}</span>
                </div>
                <div class="price">$${flight.price}</div>
            </div>
            
            <div class="flight-details">
                <div class="flight-time">
                    <div class="time">${flight.departTime}</div>
                    <div class="airport">${flight.origin}</div>
                </div>
                
                <div class="flight-path">
                    <div class="duration">${flight.duration}</div>
                    <div>————————</div>
                    <div class="stops">${flight.stops === 0 ? 'Nonstop' : flight.stops + ' stop' + (flight.stops > 1 ? 's' : '')}</div>
                </div>
                
                <div class="flight-time">
                    <div class="time">${flight.arriveTime}</div>
                    <div class="airport">${flight.destination}</div>
                </div>
            </div>
            
            <button class="expand-button" onclick="toggleDetails(${flight.id})">
                <span id="expand-text-${flight.id}">View Details</span>
            </button>
            
            <div class="expanded-details hidden" id="details-${flight.id}">
                <div class="detail-grid">
                    <div class="detail-item">
                        <div>
                            <div class="detail-label">Aircraft</div>
                            <div class="detail-value">${flight.plane}</div>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <div>
                            <div class="detail-label">Legroom</div>
                            <div class="detail-value">${flight.legroom}</div>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <div>
                            <div class="detail-label">In-Flight Entertainment</div>
                            <div class="detail-value">${flight.entertainment ? '✓ Available' : '✗ Not available'}</div>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <div>
                            <div class="detail-label">WiFi</div>
                            <div class="detail-value">${flight.wifi ? '✓ Available' : '✗ Not available'}</div>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <div>
                            <div class="detail-label">Seat Charging</div>
                            <div class="detail-value">${flight.charging ? '✓ Available' : '✗ Not available'}</div>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <div>
                            <div class="detail-label">Lie-Flat Upgrade</div>
                            <div class="detail-value">${flight.lieFlat ? '✓ Available' : '✗ Not available'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    updatePagination();
}

function toggleDetails(flightId) {
    const details = document.getElementById(`details-${flightId}`);
    const text = document.getElementById(`expand-text-${flightId}`);
    
    if (details.classList.contains('hidden')) {
        details.classList.remove('hidden');
        text.textContent = 'Hide Details';
    } else {
        details.classList.add('hidden');
        text.textContent = 'View Details';
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredFlights.length / flightsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage + 1} of ${totalPages}`;
    document.getElementById('prevButton').disabled = currentPage === 0;
    document.getElementById('nextButton').disabled = currentPage >= totalPages - 1;
}

document.getElementById('prevButton').addEventListener('click', () => {
    if (currentPage > 0) {
        currentPage--;
        renderFlights();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

document.getElementById('nextButton').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredFlights.length / flightsPerPage);
    if (currentPage < totalPages - 1) {
        currentPage++;
        renderFlights();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

document.getElementById('backButton').addEventListener('click', () => {
    history.back();
});

// Handle form submission
if (!is_declarative_tool) {
    document.getElementById('flightForm').addEventListener('submit', function(e) {
        e.preventDefault();

        searchData = {
            origin: document.getElementById('origin').value,
            destination: document.getElementById('destination').value,
            departureDate: document.getElementById('departureDate').value,
            oneWay: document.getElementById('oneWay').checked,
            returnDate: document.getElementById('oneWay').checked ? null : document.getElementById('returnDate').value,
            passengers: document.getElementById('passengers').value
        };

        // Generate flights
        allFlights = generateFlights(searchData.origin, searchData.destination);
        filteredFlights = [...allFlights];
        currentPage = 0;

        const dateOptions = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            timeZone: 'UTC' 
        };

        // Update summary
        const summaryHtml = `
            <h2>${searchData.origin} → ${searchData.destination}</h2>
            <p>${new Date(searchData.departureDate).toLocaleDateString('en-US', dateOptions)}
            ${searchData.returnDate ? ' - ' + new Date(searchData.returnDate).toLocaleDateString('en-US', dateOptions) : ' (One-way)'}
            • ${searchData.passengers} passenger${searchData.passengers > 1 ? 's' : ''}</p>
        `;
        document.getElementById('searchSummary').innerHTML = summaryHtml;
        document.getElementById('resultsCount').textContent = `${allFlights.length} flights found`;

        // Show results page
        document.getElementById('searchPage').classList.add('hidden');
        document.getElementById('resultsPage').classList.remove('hidden');
        
        history.pushState({ page: 'results' }, '', '#results');

        renderFlights();
        updateModelContext(); // Ensure context updates when manually submitting form too
    });
}

window.addEventListener('popstate', (event) => {
    if (!is_declarative_tool) {
        if (event.state && event.state.page === 'results') {
             document.getElementById('searchPage').classList.add('hidden');
             document.getElementById('resultsPage').classList.remove('hidden');
        } else {
             document.getElementById('resultsPage').classList.add('hidden');
             document.getElementById('searchPage').classList.remove('hidden');
        }
        updateModelContext();
    }
});

function handleUrlParams() {
    if (!window.is_declarative_tool) return;

    const params = new URLSearchParams(window.location.search);
    if (!params.has('origin') || !params.has('destination')) return;

    const origin = params.get('origin');
    const destination = params.get('destination');
    const departureDate = params.get('departureDate');
    const returnDate = params.get('returnDate');
    const passengers = params.get('passengers');

    searchFlights({
        origin,
        destination,
        departureDate,
        returnDate,
        passengers: parseInt(passengers)
    });
}

handleUrlParams();
