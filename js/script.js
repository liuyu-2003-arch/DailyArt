document.addEventListener('DOMContentLoaded', () => {
    const artImage = document.getElementById('art-image');
    const artCaption = document.getElementById('art-caption');
    const randomButton = document.getElementById('random-button');

    let artworks = [];
    let currentIndex = 0;
    let currentPage = 1;
    const artworksPerPage = 10;

    async function fetchArtworks() {
        try {
            const response = await fetch(`https://api.artic.edu/api/v1/artworks?page=${currentPage}&limit=${artworksPerPage}`);
            const data = await response.json();
            const newArtworks = data.data.map(artwork => ({
                image: `https://www.artic.edu/iiif/2/${artwork.image_id}/full/843,/0/default.jpg`,
                caption: artwork.title,
            }));
            artworks = [...artworks, ...newArtworks];
            if (currentIndex === 0) {
                loadArtwork(0);
            }
        } catch (error) {
            console.error('Error fetching artworks:', error);
            artCaption.textContent = 'Failed to load artwork. Please try again later.';
        }
    }

    function loadArtwork(index) {
        if (artworks.length > 0 && index >= 0 && index < artworks.length) {
            const artwork = artworks[index];
            artImage.src = artwork.image;
            artCaption.textContent = artwork.caption;
            currentIndex = index;

            // Preload next image
            if (index + 1 < artworks.length) {
                const nextArtwork = artworks[index + 1];
                const preloadImage = new Image();
                preloadImage.src = nextArtwork.image;
            }
            
            // Fetch more artworks if we are near the end
            if (artworks.length - currentIndex < 5) {
                currentPage++;
                fetchArtworks();
            }
        }
    }

    // Handle scrolling
    let lastScroll = 0;
    window.addEventListener('wheel', (event) => {
        const now = new Date().getTime();
        if (now - lastScroll < 1000) return; // Debounce scroll
        lastScroll = now;

        if (event.deltaY > 0) {
            // Scrolled down
            if (currentIndex < artworks.length - 1) {
                loadArtwork(currentIndex + 1);
            }
        } else {
            // Scrolled up
            if (currentIndex > 0) {
                loadArtwork(currentIndex - 1);
            }
        }
    });

    // Handle random button
    randomButton.addEventListener('click', () => {
        const randomIndex = Math.floor(Math.random() * artworks.length);
        loadArtwork(randomIndex);
    });

    // Initial fetch
    fetchArtworks();
});