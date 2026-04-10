document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('page-title');
    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('openSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');

    const sagTimeline = document.getElementById('sag-timeline');
    const ballTimeline = document.getElementById('ball-timeline');
    const anchorsTbody = document.getElementById('anchors-tbody');
    const generalFastenersTbody = document.getElementById('general-fasteners-tbody');

    const anchorSearch = document.getElementById('anchor-search');
    const filterPills = document.querySelectorAll('.filter-pill');

    let globalData = null;
    let allAnchors = [];

    // --- Navigation Logic ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update title
            pageTitle.textContent = item.textContent.trim();

            // Switch views
            const targetId = item.getAttribute('data-target');
            viewSections.forEach(section => {
                section.classList.remove('active');
                if(section.id === targetId) {
                    section.classList.add('active');
                }
            });

            // Close sidebar on mobile after clicking
            if(window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    // Mobile Sidebar Toggle
    openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
    closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

    // --- Fetch Data ---
    fetch('data/mill_data.json')
        .then(response => response.json())
        .then(data => {
            globalData = data;
            
            // Render Both Timelines
            renderTimeline(sagTimeline, data.sag_mill_2216.lifting_stages);
            renderTimeline(ballTimeline, data.ball_mill_1624.lifting_stages);

            // Combine Anchors
            allAnchors = [
                ...data.sag_mill_2216.fasteners,
                ...data.ball_mill_1624.fasteners
            ];
            renderAnchors(allAnchors);

            // Render General Fasteners
            renderGeneralFasteners(data.general.fasteners);
        })
        .catch(err => {
            console.error("Error loading JSON data:", err);
            sagTimeline.innerHTML = `<div class="alert warning">Error loading data. Make sure you are running a server.</div>`;
        });

    // --- Render Functions ---
    function renderTimeline(container, stages) {
        container.innerHTML = '';
        stages.forEach((stage, index) => {
            const card = document.createElement('div');
            card.className = 'stage-card';

            card.innerHTML = `
                <div class="stage-info">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <span class="stage-badge">${stage.Etapa}</span>
                        <button class="checklist-btn" onclick="this.classList.toggle('checked')"><i class="fa-solid fa-check"></i></button>
                    </div>
                    <h3 class="stage-title">${stage.Acción.replace(/\n/g, '<br>')}</h3>
                    <div class="stage-weight">
                        <i class="fa-solid fa-weight-hanging"></i>
                        <span>Lift Weight: <strong>${stage.Peso}</strong></span>
                    </div>
                </div>
                <div class="stage-image-container">
                    <img src="${stage.Imagen}" alt="${stage.Etapa}" class="stage-image" onerror="this.src=''; this.alt='Image not available';">
                </div>
            `;
            container.appendChild(card);
        });
    }

    function renderAnchors(anchors) {
        anchorsTbody.innerHTML = '';
        anchors.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${a.Equipo}</strong></td>
                <td>${a.Aplicación}</td>
                <td><span class="stage-badge" style="margin:0; background-color: var(--surface-light); color:var(--text-primary); border: 1px solid var(--border-color);">${a.Uso}</span></td>
                <td><strong>${a.Cantidad}</strong></td>
                <td>${a['Tamaño (Diámetro x Largo mm)']}</td>
                <td>${a['Material / Grado']}</td>
                <td style="white-space:normal; max-width:300px; font-size: 0.85rem; color:var(--text-secondary);">${a['Observaciones Adicionales']}</td>
            `;
            anchorsTbody.appendChild(tr);
        });
    }

    function renderGeneralFasteners(fasteners) {
        generalFastenersTbody.innerHTML = '';
        fasteners.forEach(f => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${f.Equipo}</strong></td>
                <td>${f.Aplicación}</td>
                <td>${f.Uso}</td>
                <td>${f.Cantidad}</td>
                <td>${f['Tamaño (Diámetro x Largo mm)']}</td>
                <td>${f['Material / Grado']}</td>
                <td style="white-space:normal; max-width:300px; font-size: 0.85rem; color:var(--text-secondary);">${f['Observaciones Adicionales']}</td>
            `;
            generalFastenersTbody.appendChild(tr);
        });
    }

    // --- Search & Filter Logic ---
    let currentFilter = 'all';

    function applyAnchorFilters() {
        const searchTerm = anchorSearch.value.toLowerCase();
        
        let filtered = allAnchors.filter(a => {
            // Apply text search
            const matchSearch = 
                a.Aplicación.toLowerCase().includes(searchTerm) || 
                a['Tamaño (Diámetro x Largo mm)'].toLowerCase().includes(searchTerm) ||
                a['Material / Grado'].toLowerCase().includes(searchTerm);
            
            // Apply pill filter
            let matchPill = true;
            if (currentFilter === 'sag') {
                matchPill = a.Equipo.toLowerCase().includes('sag');
            } else if (currentFilter === 'ball') {
                matchPill = a.Equipo.toLowerCase().includes('bolas') || a.Equipo.toLowerCase().includes('ball');
            }

            return matchSearch && matchPill;
        });

        renderAnchors(filtered);
    }

    anchorSearch.addEventListener('input', applyAnchorFilters);

    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.getAttribute('data-filter');
            applyAnchorFilters();
        });
    });

});
