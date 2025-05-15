document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost:3000/api';
    
    // Load summary cards data
    loadSummaryCards();

    function loadSummaryCards() {
        const params = new URLSearchParams(window.location.search);
        const centerId = params.get('centerId') || 'all';

        // Load individual card data in parallel
        Promise.all([
            fetchCardData('consumption-totals', 1),
         //   fetchCardData('yearly-evolution', centerId),
          //  fetchCardData('most-used-type', centerId),
          //  fetchCardData('average-cost', centerId)
        ])
        .then(([totals,  mostUsed, average]) => {
            // Calculate type percentage
            const typePercentage = totals.totalQuantity > 0 
                ? (mostUsed.total_quantity / totals.totalQuantity) * 100 
                : 0;

            updateSummaryCards({
                 totalLiters: Math.round(totals.totalQuantity),
              
                totalCost: Math.round(totals.totalCost),
              //  yearlyEvolution: Math.round(evolution.evolution * 10) / 10,
              //  mostUsedType: mostUsed.type_consommation,
              //  averageCost: average.averageCost,
              //  consumptionChange: 5.2, // This would come from historical data comparison
               // yearlyChange: Math.round(evolution.evolution * 10) / 10,
              //  typePercentage: Math.round(typePercentage),
              //  costChange: -2.4 // This would come from historical data comparison
            });
        })
        .catch(error => {
            console.error('Error loading summary cards:', error);
            // Use mock data as fallback
            const mockData = {
                totalLiters: 12500,
                totalCost: 1800000,
                yearlyEvolution: 15.3,
                mostUsedType: 'Demandes',
                averageCost: 144,
                consumptionChange: 5.2,
                yearlyChange: 15.3,
                typePercentage: 67.8,
                costChange: -2.4
            };
            updateSummaryCards(mockData);
        });
    }

    function fetchCardData(endpoint, centerId) {
        return fetch(`${API_BASE_URL}/dashboard/summary/${endpoint}?centerId=${centerId}` )
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            });
    }

    function updateSummaryCards(data) {
        // Update total consumption card
        document.getElementById('totalConsumptionLiters').textContent = `${data.totalLiters.toLocaleString()} L`;
        document.getElementById('totalConsumptionCost').textContent = `${data.totalCost.toLocaleString()} DA`;
       // updateChangeIndicator('consumptionChange', data.consumptionChange);

        // Update yearly evolution card
      //  document.getElementById('yearlyEvolution').textContent = `${data.yearlyEvolution}%`;
      ////  updateChangeIndicator('yearlyChange', data.yearlyChange);

        // Update most used type card
        // document.getElementById('mostUsedType').textContent = formatTypeName(data.mostUsedType);
        // updateChangeIndicator('typePercentage', data.typePercentage);

        // Update average cost card
    //     document.getElementById('averageCost').textContent = `${data.averageCost.toLocaleString()} DA`;
    //     updateChangeIndicator('costChange', data.costChange);
    }

    function updateChangeIndicator(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            const icon = value >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            const colorClass = value >= 0 ? 'positive-change' : 'negative-change';
            
            element.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${Math.abs(value).toFixed(1)}%</span>
            `;
            element.className = `card-change ${colorClass}`;
        }
    }

    function formatTypeName(type) {
        const typeNames = {
            'direct': 'Directe',
            'bon': 'Bons',
            'demande': 'Demandes',
            'carte': 'Cartes'
        };
        return typeNames[type] || type;
    }

    // Listen for changes in filters that should update the cards
    document.addEventListener('filterChanged', function(e) {
        loadSummaryCards();
    });
});