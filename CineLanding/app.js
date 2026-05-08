document.addEventListener("DOMContentLoaded", () => {

    const dateDropdown = document.getElementById('date-dropdown');
    const displayDate = document.getElementById('display-date');
    const movieListContainer = document.getElementById('movie-list');
    const functionsCount = document.getElementById('functions-count');

    const diasSemana = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
    const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

    // Generar las fechas para el dropdown (próximos 7 días empezando desde hoy)
    let dates = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        let d = new Date(today);
        d.setDate(today.getDate() + i);

        // Usar formato local para evitar desfasajes de zona horaria con toISOString
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dayNumFormatted = String(d.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${dayNumFormatted}`;

        const dayName = diasSemana[d.getDay()];
        const dayNum = d.getDate();
        const monthName = meses[d.getMonth()];

        let label = `${dayName} ${dayNum} DE ${monthName}`;
        if (i === 0) label += " (HOY)";

        dates.push({
            dateString,
            label,
            isToday: i === 0,
            dayName,
            dayNum,
            monthName
        });
    }

    // Llenar el select
    dates.forEach(d => {
        const option = document.createElement('option');
        option.value = d.dateString;
        option.textContent = d.label;
        dateDropdown.appendChild(option);
    });

    let moviesData = [];
    const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT__45zoxldvTAxWK6JQWV6FeCQ7F5PO5z4gxfbL0PbQef1Es7cPKWG5rEFEw534Gi9ZZLx1CBN_Xe1/pub?gid=259971422&single=true&output=csv";

    // Cargar datos de Google Sheets
    async function loadData() {
        movieListContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 20px 0;">Cargando cartelera...</p>';
        
        try {
            // Se agrega un parámetro de tiempo para evitar la caché del navegador
            const cacheBuster = new Date().getTime();
            const response = await fetch(`${SHEET_CSV_URL}&t=${cacheBuster}`);
            if (!response.ok) throw new Error("HTTP error " + response.status);
            const csvText = await response.text();
            
            Papa.parse(csvText, {
                header: true,
                transformHeader: function(h) { return h.trim(); },
                complete: function(results) {
                    // Filtrar filas vacías y mapear los resultados
                    moviesData = results.data.filter(row => row.title && row.fecha).map((row, index) => {
                        return {
                            id: index + 1,
                            date: row.fecha.trim(),
                            title: row.title.trim(),
                            originalTitle: (row.originalTitle || row.title).trim(),
                            director: (row.director || "").trim(),
                            year: (row.year || "").trim(),
                            country: (row.country || "").trim(),
                            duration: (row.duration || "").trim(),
                            synopsis: (row.synopsis || "").trim(),
                            cinema: (row.cinema || "").trim(),
                            location: (row.location || "").trim(),
                            time: (row.time || "").trim(),
                            price: row.price ? row.price.trim() : 0,
                            hasDiscount: String(row.hasDiscount).toLowerCase() === 'true' || String(row.hasDiscount).toLowerCase() === 'sí' || String(row.hasDiscount).toLowerCase() === 'si' || String(row.hasDiscount).toLowerCase() === '1',
                            discountPrice: row.discountPrice ? row.discountPrice.trim() : 0,
                            poster: (row.poster || "").trim(),
                            mapsLink: (row.mapsLink || "").trim()
                        };
                    });
                    
                    // Iniciar con la cartelera del día seleccionado en el dropdown
                    let selectedDate = dateDropdown.value;
                    
                    // Si hoy no hay películas, buscar el primer día con funciones
                    const hasMoviesToday = moviesData.some(m => m.date === selectedDate);
                    if (!hasMoviesToday && moviesData.length > 0) {
                        const firstDateWithMovies = dates.find(d => moviesData.some(m => m.date === d.dateString));
                        if (firstDateWithMovies) {
                            selectedDate = firstDateWithMovies.dateString;
                            dateDropdown.value = selectedDate; // Actualizar el select
                        }
                    }

                    updateDisplay(selectedDate);
                }
            });
        } catch (err) {
            console.error("Error al cargar la cartelera:", err);
            movieListContainer.innerHTML = '<p style="color: var(--accent-); padding: 20px 0;">Error de conexión: ' + err.message + '. Si estás abriendo el archivo localmente, intenta usar un servidor local (Live Server).</p>';
        }
    }

    // Función para renderizar las películas
    function renderMovies(movies) {
        movieListContainer.innerHTML = '';

        if (movies.length === 0) {
            movieListContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 20px 0;">No hay funciones programadas para este día.</p>';
            functionsCount.textContent = "0";
            return;
        }

        movies.forEach(movie => {
            const movieCard = document.createElement('article');
            movieCard.className = 'movie-card';

            let priceDisplay = '';

            // Función auxiliar para formatear un precio
            const formatPrice = (p) => {
                if (p === 0 || p === '0' || String(p).toLowerCase() === 'gratis' || String(p).toLowerCase() === 'gratuita') {
                    return 'Libre y gratuita';
                }
                return `$${p}`;
            };

            if (movie.hasDiscount && movie.discountPrice !== undefined) {
                // Precio diferenciado activado
                priceDisplay = `General <span style="color: var(--accent-); font-weight: bold; letter-spacing: 0.5px;">${formatPrice(movie.price)}</span> &nbsp;|&nbsp; Estudiantes y Jubilados <span style="color: var(--accent-); font-weight: bold; letter-spacing: 0.5px;">${formatPrice(movie.discountPrice)}</span>`;
            } else {
                // Precio único
                priceDisplay = `<span style="color: var(--accent-); font-weight: bold; letter-spacing: 0.5px;">${formatPrice(movie.price)}</span>`;
            }

            movieCard.innerHTML = `
                <div class="movie-poster-wrap">
                    <img src="${movie.poster}" alt="Póster de ${movie.title}" class="movie-poster">
                </div>
                <div class="movie-content">
                    <div class="movie-meta-right">
                        <div class="cinema-name">${movie.cinema}</div>
                        ${movie.mapsLink 
                            ? `<a href="${movie.mapsLink}" target="_blank" class="cinema-location maps-link"><span class="loc-text">${movie.location}</span><span class="loc-hover">¿Cómo llegar?</span></a>`
                            : `<div class="cinema-location">${movie.location}</div>`
                        }
                        <div class="show-time ${movie.time.includes(';') || movie.time.includes('\n') || movie.time.length > 5 ? 'multiple' : ''}">${movie.time.replace(/\n/g, '<br>')}</div>
                    </div>
                    
                    <h2 class="movie-title">${movie.title}</h2>
                    <div class="movie-details">
                        ${movie.originalTitle !== movie.title ? `<span class="original-title">«${movie.originalTitle}»</span>` : ''}
                        <span>${movie.director} · ${movie.year} · ${movie.country} · ${movie.duration}</span>
                    </div>
                    
                    <p class="movie-synopsis">
                        ${movie.synopsis}
                    </p>
                    
                    <p class="movie-price" style="margin-top: 15px; font-family: var(--font-archivo); font-size: 0.85rem; color: var(--text-secondary);">
                        Valor de Entrada: ${priceDisplay}
                    </p>
                </div>
            `;

            movieListContainer.appendChild(movieCard);
        });

        functionsCount.textContent = movies.length;
    }

    // Función para actualizar la vista según la fecha
    function updateDisplay(selectedDateString) {
        const dateObj = dates.find(d => d.dateString === selectedDateString);

        if (dateObj) {
            displayDate.innerHTML = `${dateObj.dayName} ${dateObj.dayNum} DE ${dateObj.monthName} ${dateObj.isToday ? '<span class="badge" id="today-badge">HOY</span>' : ''}`;
        }

        const filteredMovies = moviesData.filter(m => m.date === selectedDateString);
        renderMovies(filteredMovies);
    }

    // Escuchar cambios en el dropdown
    dateDropdown.addEventListener('change', (e) => {
        updateDisplay(e.target.value);
    });

    // Cargar datos al iniciar
    loadData();

});
