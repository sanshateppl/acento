document.addEventListener("DOMContentLoaded", () => {

    const movieListContainer = document.getElementById('movie-list');
    const functionsCount = document.getElementById('functions-count');
    const displayDate = document.getElementById('display-date');
    const dateDropdown = document.getElementById('date-dropdown');
    const cinemaFiltersContainer = document.getElementById('cinema-filters');
    let currentCinemaFilter = 'Todos';

    const diasSemana = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
    const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

    let dates = [];
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
                    // Obtener todas las filas que al menos tengan una fecha definida
                    const rawDataWithDates = results.data.filter(row => row.fecha);

                    // Mapear solo las que tengan título para la cartelera real
                    moviesData = rawDataWithDates.filter(row => row.title).map((row, index) => {
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
                            mapsLink: (row.mapsLink || "").trim(),
                            tags: (row.tags || "").trim(),
                            links: (row.links || "").trim(),
                            priceNote: (row.priceNote || "").trim()
                        };
                    });
                    
                    // Extraer fechas únicas usando rawDataWithDates para incluir días declarados pero vacíos
                    const uniqueDates = Array.from(new Set(rawDataWithDates.map(m => m.fecha.trim()))).sort();
                    
                    const today = new Date();
                    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    
                    dateDropdown.innerHTML = '';
                    dates = [];
                    
                    uniqueDates.forEach(dateStr => {
                        // Parsear dateStr "YYYY-MM-DD" a local date sin problemas de zona horaria
                        const [y, m, d] = dateStr.split('-');
                        const dateObj = new Date(y, m - 1, d);
                        
                        const dayName = diasSemana[dateObj.getDay()];
                        const dayNum = dateObj.getDate();
                        const monthName = meses[dateObj.getMonth()];
                        const isToday = dateStr === todayStr;
                        
                        let label = `${dayName} ${dayNum} DE ${monthName}`;
                        if (isToday) label += " (HOY)";
                        
                        dates.push({
                            dateString: dateStr,
                            label,
                            isToday,
                            dayName,
                            dayNum,
                            monthName
                        });
                        
                        const option = document.createElement('option');
                        option.value = dateStr;
                        option.textContent = label;
                        dateDropdown.appendChild(option);
                    });
                    
                    if (dates.length === 0) {
                        movieListContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 20px 0;">No hay funciones programadas para esta semana.</p>';
                        functionsCount.textContent = "0";
                        displayDate.innerHTML = "-";
                        return;
                    }

                    // Iniciar con "hoy" si hay pelis hoy, o con la primera fecha disponible de la lista
                    let selectedDate = dates.find(d => d.isToday) ? todayStr : dates[0].dateString;
                    dateDropdown.value = selectedDate;

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

        movies.forEach((movie, index) => {
            const movieCard = document.createElement('article');
            movieCard.className = 'movie-card fade-in-card';
            movieCard.style.setProperty('--anim-order', index);

            let priceDisplay = '';

            // Función auxiliar para formatear un precio
            const formatPrice = (p) => {
                if (p === 0 || p === '0' || String(p).toLowerCase() === 'gratis' || String(p).toLowerCase() === 'gratuita') {
                    return 'Libre y gratuita';
                }
                if (isNaN(p)) {
                    return p;
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

            if (movie.priceNote) {
                // Agregar la nota al final con color secundario
                priceDisplay += ` <span style="color: var(--text-secondary); font-weight: normal;">| ${movie.priceNote}</span>`;
            }

            // Tags HTML
            let tagsHtml = '';
            if (movie.tags) {
                const tagsArray = movie.tags.split(',').map(t => t.trim()).filter(t => t);
                if (tagsArray.length > 0) {
                    tagsHtml = `<div class="movie-badges-container">
                        ${tagsArray.map(t => `<span class="movie-badge">${t}</span>`).join('')}
                    </div>`;
                }
            }

            // WhatsApp Share Link
            const displayDateText = displayDate.textContent.replace('HOY', '').trim();
            const waText = encodeURIComponent(`¿Vamos a ver "${movie.title}"? La pasan el ${displayDateText} a las ${movie.time.replace(/\n/g, ' y ')} en ${movie.cinema}`);
            const waLink = `https://wa.me/?text=${waText}`;

            let posterContent = `<img src="${movie.poster}" alt="Póster de ${movie.title}" class="movie-poster">`;
            
            if (movie.links) {
                posterContent = `
                    <a href="${movie.links}" target="_blank" class="poster-link">
                        ${posterContent}
                        <span class="poster-info-text">+ INFO</span>
                    </a>
                `;
            }

            movieCard.innerHTML = `
                <div class="movie-poster-wrap">
                    ${tagsHtml}
                    ${posterContent}
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
                    
                    <div class="movie-footer-actions">
                        <p class="movie-price" style="margin-top: 15px; font-family: var(--font-archivo); font-size: 0.85rem; color: var(--text-secondary); flex-grow: 1;">
                            Valor de Entrada: ${priceDisplay}
                        </p>
                        <a href="${waLink}" target="_blank" class="wa-share-btn" title="Compartir por WhatsApp">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.662-2.062-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        </a>
                    </div>
                </div>
            `;

            movieListContainer.appendChild(movieCard);
        });

        functionsCount.textContent = movies.length;
    }

    // Función para actualizar la vista según la fecha y filtros
    function updateDisplay(selectedDateString) {
        const dateObj = dates.find(d => d.dateString === selectedDateString);

        if (dateObj) {
            displayDate.innerHTML = `${dateObj.dayName} ${dateObj.dayNum} DE ${dateObj.monthName} ${dateObj.isToday ? '<span class="badge" id="today-badge">HOY</span>' : ''}`;
        }

        const dateMovies = moviesData.filter(m => m.date === selectedDateString);
        
        // Extraer cines únicos para los filtros
        const cinemas = Array.from(new Set(dateMovies.map(m => m.cinema))).sort();
        
        cinemaFiltersContainer.innerHTML = '';
        
        if (cinemas.length > 1) {
            // Si el cine actual no está en la lista de cines de hoy, volver a "Todos"
            if (!cinemas.includes(currentCinemaFilter) && currentCinemaFilter !== 'Todos') {
                currentCinemaFilter = 'Todos';
            }
            
            const createBtn = (text, value) => {
                const btn = document.createElement('button');
                btn.className = `filter-btn ${currentCinemaFilter === value ? 'active' : ''}`;
                btn.textContent = text;
                btn.onclick = () => {
                    currentCinemaFilter = value;
                    // Actualizar estado visual de los botones
                    Array.from(cinemaFiltersContainer.children).forEach(child => {
                        child.classList.remove('active');
                    });
                    btn.classList.add('active');
                    
                    // Renderizar con el nuevo filtro (usar un pequeño timeout para reiniciar animaciones CSS)
                    movieListContainer.innerHTML = '';
                    setTimeout(() => {
                        const filtered = currentCinemaFilter === 'Todos' ? dateMovies : dateMovies.filter(m => m.cinema === currentCinemaFilter);
                        renderMovies(filtered);
                    }, 10);
                };
                return btn;
            };
            
            cinemaFiltersContainer.appendChild(createBtn('Todas las salas', 'Todos'));
            cinemas.forEach(c => cinemaFiltersContainer.appendChild(createBtn(c, c)));
        } else {
            currentCinemaFilter = 'Todos';
        }

        const filteredMovies = currentCinemaFilter === 'Todos' 
            ? dateMovies 
            : dateMovies.filter(m => m.cinema === currentCinemaFilter);

        renderMovies(filteredMovies);
    }

    // Escuchar cambios en el dropdown
    dateDropdown.addEventListener('change', (e) => {
        // Al cambiar de fecha, reiniciar el filtro a 'Todos'
        currentCinemaFilter = 'Todos';
        updateDisplay(e.target.value);
    });

    // Cargar datos al iniciar
    loadData();

});
