
// Fonction pour afficher/masquer les filtres
function toggleFilters() {
    const filters = document.getElementById("filters");
    filters.style.display = filters.style.display === "none" ? "block" : "none";
}

// Fonction pour afficher/masquer le tri
function toggleSort() {
    const sort = document.getElementById("sort");
    sort.style.display = sort.style.display === "none" ? "block" : "none";
}

// Fonction pour filtrer les clients
function filterClients() {
    const villeFilter = document.getElementById("filterVille").value.toLowerCase();
    const typeRenovationFilter = document.getElementById("filterTypeRenovation").value.toLowerCase();
    const dateFilter = document.getElementById("filterDate").value;

    const clientCards = document.querySelectorAll(".client-card");

    clientCards.forEach(card => {
        const ville = card.querySelector("p:nth-of-type(1)").textContent.toLowerCase();
        const typeRenovation = card.querySelector(".type_renovation").textContent.toLowerCase();
        const creationDate = new Date(card.querySelector("p:nth-of-type(7)").textContent);

        let isVisible = true;

        // Vérification des filtres
        if (villeFilter && !ville.includes(villeFilter)) isVisible = false;
        if (typeRenovationFilter && !typeRenovation.includes(typeRenovationFilter)) isVisible = false;
        if (dateFilter && creationDate.toISOString().split('T')[0] !== dateFilter) isVisible = false;

        card.style.display = isVisible ? "block" : "none";
    });
}

// Fonction pour trier les clients
function sortClients() {
    const sortOption = document.getElementById("sortOptions").value;
    const clientsList = document.getElementById("clientsList");
    const clientCards = Array.from(document.querySelectorAll(".client-card"));

    const getSortValue = (card) => {
        switch (sortOption) {
            case "nom":
                return card.querySelector("h2").textContent.toLowerCase();
            case "ville":
                return card.querySelector("p:nth-of-type(1)").textContent.toLowerCase();
            case "type_renovation":
                return card.querySelector(".type_renovation").textContent.toLowerCase();
            case "date":
                return new Date(card.querySelector("p:nth-of-type(7)").textContent);
            default:
                return "";
        }
    };

    clientCards.sort((a, b) => {
        const valueA = getSortValue(a);
        const valueB = getSortValue(b);

        if (valueA > valueB) return 1;
        if (valueA < valueB) return -1;
        return 0;
    });

    // Réorganiser les cartes dans le DOM
    clientsList.innerHTML = "";
    clientCards.forEach(card => clientsList.appendChild(card));
}

// Fonction pour rechercher des clients
function searchClients() {
    const query = document.getElementById("searchBar").value.toLowerCase();
    const clientCards = document.querySelectorAll(".client-card");

    clientCards.forEach(card => {
        const name = card.querySelector("h2").textContent.toLowerCase();
        const email = card.querySelector("p:nth-of-type(3)").textContent.toLowerCase();
        const phone = card.querySelector("p:nth-of-type(4)").textContent.toLowerCase();

        const isVisible = name.includes(query) || email.includes(query) || phone.includes(query);
        card.style.display = isVisible ? "block" : "none";
    });
}