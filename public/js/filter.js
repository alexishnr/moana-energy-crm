
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...

    function applyFilter(filter) {
        // ...existing code for filtering...

        // Réappliquer la classe rowBootstrap aux éléments filtrés
        const filteredItems = document.querySelectorAll('.filtered-item');
        filteredItems.forEach(item => {
            item.classList.add('rowBootstrap');
        });
    }

    // ...existing code...
});