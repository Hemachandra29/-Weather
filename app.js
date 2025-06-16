// API Configuration
const API_KEY = '04d272e232fc67c8a2ecb439f154f179'; // Replace with your API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const celsiusBtn = document.getElementById('celsius');
const fahrenheitBtn = document.getElementById('fahrenheit');
const themeToggle = document.getElementById('theme-toggle');

// Modal Elements
const weatherModal = document.getElementById('weather-modal');
const closeModal = document.querySelector('.close-modal');

// Additional DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const clearSearchBtn = document.getElementById('clear-search');
const errorToast = document.getElementById('error-toast');
const errorMessage = document.getElementById('error-message');
const searchContainer = document.querySelector('.search-container');

// Create suggestions container
const suggestionsContainer = document.createElement('div');
suggestionsContainer.className = 'suggestions-container';
searchContainer.appendChild(suggestionsContainer);

// State
let currentUnit = 'celsius';
let currentTheme = 'light';

// Popular cities list
const POPULAR_CITIES = [
    { name: 'London', country: 'GB' },
    { name: 'New York', country: 'US' },
    { name: 'Tokyo', country: 'JP' },
    { name: 'Paris', country: 'FR' },
    { name: 'Sydney', country: 'AU' },
    { name: 'Dubai', country: 'AE' },
    { name: 'Singapore', country: 'SG' },
    { name: 'Rome', country: 'IT' }
];

// DOM Elements for suggestions
const popularCitiesContainer = document.querySelector('.popular-cities');
const recentSearchesContainer = document.querySelector('.recent-searches');
const refreshSuggestionsBtn = document.getElementById('refresh-suggestions');
const clearRecentBtn = document.getElementById('clear-recent');

// Event Listeners
searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    clearSearchBtn.classList.toggle('visible', query.length > 0);
    debouncedSearch(query);
});

clearSearchBtn.addEventListener('click', clearSearch);

// Enhanced search functionality
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = searchInput.value.trim();
        if (city) {
            showLoading();
            getWeatherData(city).catch(error => {
                showError('Error fetching weather data. Please try again.');
            }).finally(() => {
                hideLoading();
            });
        }
    }
});

searchBtn.addEventListener('click', () => {
    const city = searchInput.value.trim();
    if (city) {
        showLoading();
        getWeatherData(city).catch(error => {
            showError('Error fetching weather data. Please try again.');
        }).finally(() => {
            hideLoading();
        });
    }
});

// Enhanced location button
locationBtn.addEventListener('click', () => {
    showLoading();
    getCurrentLocation().catch(error => {
        showError('Unable to get your location. Please enter a city manually.');
    }).finally(() => {
        hideLoading();
    });
});

celsiusBtn.addEventListener('click', () => {
    setUnit('celsius');
});

fahrenheitBtn.addEventListener('click', () => {
    setUnit('fahrenheit');
});

themeToggle.addEventListener('click', toggleTheme);

// Modal Event Listeners
closeModal.addEventListener('click', () => {
    weatherModal.classList.remove('active');
});

weatherModal.addEventListener('click', (e) => {
    if (e.target === weatherModal) {
        weatherModal.classList.remove('active');
    }
});

// Show loading state
function showLoading() {
    loadingOverlay.classList.add('active');
}

// Hide loading state
function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// Show error toast
function showError(message) {
    errorMessage.textContent = message;
    errorToast.classList.add('show');
    setTimeout(() => {
        errorToast.classList.remove('show');
    }, 3000);
}

// Functions
async function getWeatherData(city) {
    try {
        const response = await fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`);
        const data = await response.json();
        
        if (data.cod === '404') {
            showError('City not found. Please try again.');
            return;
        }

        updateCurrentWeather(data);
        await getForecast(city);
        setupScrollButtons();
        addToRecentSearches(data);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
    }
}

async function getForecast(city) {
    try {
        const response = await fetch(`${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric`);
        const data = await response.json();
        
        updateHourlyForecast(data);
        updateDailyForecast(data);
    } catch (error) {
        console.error('Error fetching forecast data:', error);
        throw error;
    }
}

function updateWeatherAnimation(weatherId) {
    const weatherAnimation = document.getElementById('weather-animation');
    weatherAnimation.className = 'weather-animation';

    if (weatherId >= 200 && weatherId < 300) {
        weatherAnimation.classList.add('storm');
    } else if (weatherId >= 300 && weatherId < 400) {
        weatherAnimation.classList.add('rain');
    } else if (weatherId >= 500 && weatherId < 600) {
        weatherAnimation.classList.add('rain');
    } else if (weatherId >= 600 && weatherId < 700) {
        weatherAnimation.classList.add('snow');
    } else if (weatherId >= 700 && weatherId < 800) {
        weatherAnimation.classList.add('clouds');
    } else if (weatherId === 800) {
        weatherAnimation.classList.add('sunny');
    } else if (weatherId > 800) {
        weatherAnimation.classList.add('clouds');
    }
}

function updateCurrentWeather(data) {
    const cityName = document.getElementById('city-name');
    const dateTime = document.getElementById('date-time');
    const temperature = document.getElementById('temperature');
    const weatherIcon = document.getElementById('weather-icon');
    const windSpeed = document.getElementById('wind-speed');
    const humidity = document.getElementById('humidity');
    const uvIndex = document.getElementById('uv-index');

    cityName.textContent = `${data.name}, ${data.sys.country}`;
    dateTime.textContent = new Date().toLocaleString();
    
    const temp = currentUnit === 'celsius' ? data.main.temp : celsiusToFahrenheit(data.main.temp);
    temperature.textContent = Math.round(temp);
    
    const weatherId = data.weather[0].id;
    weatherIcon.className = getWeatherIcon(weatherId);
    updateWeatherAnimation(weatherId);
    
    windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
    humidity.textContent = `${data.main.humidity}%`;
    uvIndex.textContent = '--'; // UV index requires additional API call
}

function updateHourlyForecast(data) {
    const hourlyContainer = document.getElementById('hourly-container');
    hourlyContainer.innerHTML = '';

    const hourlyData = data.list.slice(0, 8); // Next 24 hours (3-hour intervals)

    hourlyData.forEach(item => {
        const hour = new Date(item.dt * 1000).getHours();
        const temp = currentUnit === 'celsius' ? item.main.temp : celsiusToFahrenheit(item.main.temp);
        
        const hourlyItem = document.createElement('div');
        hourlyItem.className = 'hourly-item glass-effect';
        hourlyItem.innerHTML = `
            <div>${hour}:00</div>
            <i class="${getWeatherIcon(item.weather[0].id)}"></i>
            <div>${Math.round(temp)}°</div>
        `;
        
        // Add click event to show details
        hourlyItem.addEventListener('click', () => {
            showWeatherDetails(item, 'hourly');
        });
        
        hourlyContainer.appendChild(hourlyItem);
    });
}

function updateDailyForecast(data) {
    const dailyContainer = document.getElementById('daily-container');
    dailyContainer.innerHTML = '';

    // Group forecast by day
    const dailyData = data.list.reduce((acc, item) => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(item);
        return acc;
    }, {});

    Object.entries(dailyData).slice(0, 7).forEach(([date, items]) => {
        const avgTemp = items.reduce((sum, item) => sum + item.main.temp, 0) / items.length;
        const temp = currentUnit === 'celsius' ? avgTemp : celsiusToFahrenheit(avgTemp);
        const weatherId = items[0].weather[0].id;

        const dailyItem = document.createElement('div');
        dailyItem.className = 'daily-item glass-effect';
        dailyItem.innerHTML = `
            <div>${new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <i class="${getWeatherIcon(weatherId)}"></i>
            <div>${Math.round(temp)}°</div>
        `;
        
        // Add click event to show details
        dailyItem.addEventListener('click', () => {
            // Use the first item of the day for detailed weather
            showWeatherDetails(items[0], 'daily');
        });
        
        dailyContainer.appendChild(dailyItem);
    });
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const response = await fetch(
                            `${BASE_URL}/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}&appid=${API_KEY}&units=metric`
                        );
                        const data = await response.json();
                        updateCurrentWeather(data);
                        await getForecast(`${data.name},${data.sys.country}`);
                        setupScrollButtons();
                        resolve();
                    } catch (error) {
                        console.error('Error fetching location weather:', error);
                        reject(error);
                    }
                },
                (error) => {
                    console.error('Error getting location:', error);
                    reject(error);
                }
            );
        } else {
            reject(new Error('Geolocation is not supported by your browser.'));
        }
    });
}

function setUnit(unit) {
    currentUnit = unit;
    celsiusBtn.classList.toggle('active', unit === 'celsius');
    fahrenheitBtn.classList.toggle('active', unit === 'fahrenheit');
    
    // Update displayed temperatures
    const temperature = document.getElementById('temperature');
    const currentTemp = parseFloat(temperature.textContent);
    temperature.textContent = Math.round(unit === 'celsius' ? fahrenheitToCelsius(currentTemp) : celsiusToFahrenheit(currentTemp));
    
    // Refresh forecast data
    const city = document.getElementById('city-name').textContent.split(',')[0];
    if (city) {
        getWeatherData(city);
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.innerHTML = currentTheme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
}

function showWeatherDetails(data, type) {
    const modalDate = document.getElementById('modal-date');
    const modalWeatherIcon = document.getElementById('modal-weather-icon');
    const modalTemperature = document.getElementById('modal-temperature');
    const modalFeelsLike = document.getElementById('modal-feels-like');
    const modalWind = document.getElementById('modal-wind');
    const modalHumidity = document.getElementById('modal-humidity');
    const modalPressure = document.getElementById('modal-pressure');
    const modalVisibility = document.getElementById('modal-visibility');
    const modalClouds = document.getElementById('modal-clouds');

    // Format date based on type (hourly or daily)
    if (type === 'hourly') {
        const date = new Date(data.dt * 1000);
        modalDate.textContent = `${date.toLocaleDateString()} at ${date.getHours()}:00`;
    } else {
        const date = new Date(data.dt * 1000);
        modalDate.textContent = date.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Update weather details
    modalWeatherIcon.className = getWeatherIcon(data.weather[0].id);
    const temp = currentUnit === 'celsius' ? data.main.temp : celsiusToFahrenheit(data.main.temp);
    const feelsLike = currentUnit === 'celsius' ? data.main.feels_like : celsiusToFahrenheit(data.main.feels_like);
    
    modalTemperature.textContent = `${Math.round(temp)}°`;
    modalFeelsLike.textContent = `${Math.round(feelsLike)}°`;
    modalWind.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
    modalHumidity.textContent = `${data.main.humidity}%`;
    modalPressure.textContent = `${data.main.pressure} hPa`;
    modalVisibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    modalClouds.textContent = `${data.clouds.all}%`;

    // Show modal
    weatherModal.classList.add('active');
}

// Smooth scroll for forecast containers
function setupScrollButtons() {
    const containers = document.querySelectorAll('.hourly-container, .daily-container');
    containers.forEach(container => {
        const scrollAmount = 200;
        const leftBtn = container.parentElement.querySelector('.fa-chevron-left');
        const rightBtn = container.parentElement.querySelector('.fa-chevron-right');

        if (leftBtn && rightBtn) {
            leftBtn.addEventListener('click', () => {
                container.scrollBy({
                    left: -scrollAmount,
                    behavior: 'smooth'
                });
            });

            rightBtn.addEventListener('click', () => {
                container.scrollBy({
                    left: scrollAmount,
                    behavior: 'smooth'
                });
            });
        }
    });
}

// Utility Functions
function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

function fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5/9;
}

function getWeatherIcon(weatherId) {
    if (weatherId >= 200 && weatherId < 300) return 'fas fa-bolt';
    if (weatherId >= 300 && weatherId < 400) return 'fas fa-cloud-rain';
    if (weatherId >= 500 && weatherId < 600) return 'fas fa-cloud-showers-heavy';
    if (weatherId >= 600 && weatherId < 700) return 'fas fa-snowflake';
    if (weatherId >= 700 && weatherId < 800) return 'fas fa-smog';
    if (weatherId === 800) return 'fas fa-sun';
    if (weatherId > 800) return 'fas fa-cloud';
    return 'fas fa-cloud';
}

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Get city suggestions
async function getCitySuggestions(query) {
    if (!query || query.length < 2) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
        return;
    }

    try {
        // First try exact city match
        const response = await fetch(`${BASE_URL}/find?q=${query}&appid=${API_KEY}&units=metric`);
        const data = await response.json();
        
        if (data.list && data.list.length > 0) {
            suggestionsContainer.innerHTML = '';
            
            // Group cities by country
            const citiesByCountry = data.list.reduce((acc, city) => {
                const country = city.sys.country;
                if (!acc[country]) {
                    acc[country] = [];
                }
                acc[country].push(city);
                return acc;
            }, {});

            // Create country sections
            Object.entries(citiesByCountry).forEach(([country, cities]) => {
                const countrySection = document.createElement('div');
                countrySection.className = 'country-section';
                
                // Create suggestion items first
                const suggestionItems = document.createElement('div');
                suggestionItems.className = 'suggestion-items';
                
                // Add cities for this country
                cities.slice(0, 3).forEach(city => {
                    const suggestion = document.createElement('div');
                    suggestion.className = 'suggestion-item';
                    suggestion.innerHTML = `
                        <i class="fas fa-map-marker-alt"></i>
                        <div class="suggestion-details">
                            <span class="city-name">${city.name}</span>
                            <span class="weather-info">
                                <i class="${getWeatherIcon(city.weather[0].id)}"></i>
                                ${Math.round(city.main.temp)}°
                            </span>
                        </div>
                    `;
                    suggestion.addEventListener('click', () => {
                        searchInput.value = `${city.name}, ${country}`;
                        suggestionsContainer.style.display = 'none';
                        showLoading();
                        getWeatherData(`${city.name},${country}`).catch(error => {
                            showError('Error fetching weather data. Please try again.');
                        }).finally(() => {
                            hideLoading();
                        });
                    });
                    suggestionItems.appendChild(suggestion);
                });

                // Add country header after suggestion items
                const countryHeader = document.createElement('div');
                countryHeader.className = 'country-header';
                countryHeader.innerHTML = `
                    <i class="fas fa-globe"></i>
                    <span>${getCountryName(country)}</span>
                `;

                // Append elements in the desired order
                countrySection.appendChild(suggestionItems);
                countrySection.appendChild(countryHeader);
                suggestionsContainer.appendChild(countrySection);
            });

            suggestionsContainer.style.display = 'block';
        } else {
            // If no exact match, try fuzzy search
            const fuzzyResponse = await fetch(`${BASE_URL}/find?q=${query}&appid=${API_KEY}&units=metric&type=like`);
            const fuzzyData = await fuzzyResponse.json();
            
            if (fuzzyData.list && fuzzyData.list.length > 0) {
                suggestionsContainer.innerHTML = '<div class="suggestion-header">Similar locations:</div>';
                
                fuzzyData.list.slice(0, 5).forEach(city => {
                    const suggestion = document.createElement('div');
                    suggestion.className = 'suggestion-item';
                    suggestion.innerHTML = `
                        <i class="fas fa-map-marker-alt"></i>
                        <div class="suggestion-details">
                            <span class="city-name">${city.name}, ${getCountryName(city.sys.country)}</span>
                            <span class="weather-info">
                                <i class="${getWeatherIcon(city.weather[0].id)}"></i>
                                ${Math.round(city.main.temp)}°
                            </span>
                        </div>
                    `;
                    suggestion.addEventListener('click', () => {
                        searchInput.value = `${city.name}, ${city.sys.country}`;
                        suggestionsContainer.style.display = 'none';
                        showLoading();
                        getWeatherData(`${city.name},${city.sys.country}`).catch(error => {
                            showError('Error fetching weather data. Please try again.');
                        }).finally(() => {
                            hideLoading();
                        });
                    });
                    suggestionsContainer.appendChild(suggestion);
                });
                
                suggestionsContainer.style.display = 'block';
            } else {
                suggestionsContainer.innerHTML = '<div class="no-results">No matching locations found</div>';
                suggestionsContainer.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        suggestionsContainer.innerHTML = '<div class="error-message">Error loading suggestions</div>';
        suggestionsContainer.style.display = 'block';
    }
}

// Get country name from country code
function getCountryName(countryCode) {
    const countries = {
        'US': 'United States',
        'GB': 'United Kingdom',
        'FR': 'France',
        'DE': 'Germany',
        'IT': 'Italy',
        'ES': 'Spain',
        'JP': 'Japan',
        'CN': 'China',
        'IN': 'India',
        'BR': 'Brazil',
        'RU': 'Russia',
        'CA': 'Canada',
        'AU': 'Australia',
        'AE': 'United Arab Emirates',
        'SG': 'Singapore',
        // Add more countries as needed
    };
    return countries[countryCode] || countryCode;
}

// Debounced search function
const debouncedSearch = debounce((query) => {
    getCitySuggestions(query);
}, 300);

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
        suggestionsContainer.style.display = 'none';
    }
});

// Prevent suggestions from closing when clicking inside
suggestionsContainer.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Clear search input
function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.classList.remove('visible');
    suggestionsContainer.style.display = 'none';
    searchInput.focus();
}

// Initialize suggestions
function initializeSuggestions() {
    loadPopularCities();
    loadRecentSearches();
}

// Load popular cities
async function loadPopularCities() {
    popularCitiesContainer.innerHTML = '';
    
    for (const city of POPULAR_CITIES) {
        try {
            const response = await fetch(`${BASE_URL}/weather?q=${city.name},${city.country}&appid=${API_KEY}&units=metric`);
            const data = await response.json();
            
            const cityCard = createCityCard(data);
            popularCitiesContainer.appendChild(cityCard);
        } catch (error) {
            console.error(`Error loading weather for ${city.name}:`, error);
        }
    }
}

// Load recent searches
function loadRecentSearches() {
    const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    recentSearchesContainer.innerHTML = '';
    
    recentSearches.forEach(city => {
        const cityCard = createCityCard(city);
        recentSearchesContainer.appendChild(cityCard);
    });
}

// Create city card
function createCityCard(data) {
    const card = document.createElement('div');
    card.className = 'city-card';
    
    const temp = currentUnit === 'celsius' ? data.main.temp : celsiusToFahrenheit(data.main.temp);
    
    card.innerHTML = `
        <i class="${getWeatherIcon(data.weather[0].id)}"></i>
        <span>${data.name}, ${data.sys.country}</span>
        <span class="temp">${Math.round(temp)}°</span>
    `;
    
    card.addEventListener('click', () => {
        showLoading();
        getWeatherData(`${data.name},${data.sys.country}`).catch(error => {
            showError('Error fetching weather data. Please try again.');
        }).finally(() => {
            hideLoading();
        });
    });
    
    return card;
}

// Add to recent searches
function addToRecentSearches(data) {
    const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    
    // Remove if already exists
    const index = recentSearches.findIndex(city => 
        city.name === data.name && city.sys.country === data.sys.country
    );
    if (index !== -1) {
        recentSearches.splice(index, 1);
    }
    
    // Add to beginning
    recentSearches.unshift(data);
    
    // Keep only last 5 searches
    if (recentSearches.length > 5) {
        recentSearches.pop();
    }
    
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    loadRecentSearches();
}

// Event Listeners for suggestions
refreshSuggestionsBtn.addEventListener('click', () => {
    showLoading();
    loadPopularCities().finally(() => {
        hideLoading();
    });
});

clearRecentBtn.addEventListener('click', () => {
    localStorage.removeItem('recentSearches');
    recentSearchesContainer.innerHTML = '';
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    currentTheme = savedTheme;
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.innerHTML = currentTheme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';

    // Initialize suggestions
    initializeSuggestions();

    // Get weather for default city (London)
    showLoading();
    getWeatherData('London').catch(error => {
        showError('Error loading weather data. Please try again.');
    }).finally(() => {
        hideLoading();
    });
}); 