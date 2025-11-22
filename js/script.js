document.addEventListener('DOMContentLoaded', () => {
    const artImage = document.getElementById('art-image');
    const captionTitle = document.getElementById('caption-title');
    const captionDetail = document.getElementById('caption-detail');
    const randomButton = document.getElementById('random-button');
    const artContainer = document.querySelector('.art-container');

    // --- Pexels API Configuration ---
    const apiKey = 'dcvXtf9LJtUm2KIhnEdMpomMlx4NLhAvzdPArmKTHTq3ISqJpWj2tNUX';
    const apiUrl = 'https://api.pexels.com/v1/curated';

    let artworks = [], currentIndex = -1, currentPage = 1, isFetching = false, hasMorePhotos = true;
    const photosPerPage = 15;

    // --- UI & State Management ---
    function updateCaption(title, detailText, detailUrl) {
        captionTitle.textContent = title;
        if (detailText && detailUrl) {
            captionDetail.textContent = detailText;
            captionDetail.href = detailUrl;
            captionDetail.style.display = 'inline-block';
        } else {
            captionDetail.style.display = 'none';
        }
    }

    function setErrorState(message) {
        document.body.classList.add('error-state');
        artImage.style.display = 'none';
        randomButton.style.display = 'none';
        updateCaption(message, null, null);
    }

    // --- Core Data Fetching Logic ---
    async function initialize() {
        updateCaption('Connecting to Pexels...', null, null);
        await fillArtworkBuffer(5);
        if (artworks.length > 0) loadArtwork(0);
        else setErrorState("Could not load any photos from Pexels.");
    }

    async function fillArtworkBuffer(targetCount) {
        if (isFetching || !hasMorePhotos) return;
        isFetching = true;
        let foundCount = artworks.filter(a => a.valid).length;

        while (foundCount < targetCount && hasMorePhotos) {
            updateCaption(`Searching for photos... (${foundCount}/${targetCount})`, null, null);
            try {
                const response = await fetch(`${apiUrl}?page=${currentPage}&per_page=${photosPerPage}`, { headers: { Authorization: apiKey } });
                if (!response.ok) throw new Error(`API Error: ${response.status}`);
                const data = await response.json();
                if (data.photos.length === 0) { hasMorePhotos = false; break; }

                for (const photo of data.photos) {
                    if (photo.src && photo.src.large && photo.alt) {
                        artworks.push({
                            image: photo.src.large,
                            title: photo.alt,
                            photographer: `Photo by ${photo.photographer}`,
                            photographerUrl: photo.photographer_url,
                            valid: true,
                        });
                        foundCount++;
                    }
                }
                currentPage++;
            } catch (error) {
                console.error('Failed to fetch photos:', error);
                setErrorState('Could not connect to the Pexels API.');
                break;
            }
        }
        isFetching = false;
    }

    // --- Artwork Navigation ---
    function loadArtwork(index) {
        if (index < 0 || index >= artworks.length) return;
        const artwork = artworks[index];
        if (!artwork.valid) { loadNextArtwork(); return; }

        currentIndex = index;
        updateCaption('Loading...', null, null);
        artImage.src = artwork.image;

        if (artworks.slice(index).filter(a => a.valid).length < 3 && hasMorePhotos) {
            fillArtworkBuffer(artworks.length + 5);
        }
    }

    async function loadNextArtwork() {
        const nextIndex = findValidIndex(currentIndex + 1, 'forward');
        if (nextIndex !== -1) {
            loadArtwork(nextIndex);
        } else if (hasMorePhotos) {
            updateCaption('Searching for more photos...', null, null);
            await fillArtworkBuffer(artworks.length + 1);
            const newNextIndex = findValidIndex(currentIndex + 1, 'forward');
            if (newNextIndex !== -1) loadArtwork(newNextIndex);
            else updateCaption("You've seen all available photos!", null, null);
        } else {
            updateCaption("You've seen all available photos!", null, null);
        }
    }
    
    function loadPreviousArtwork() {
        const prevIndex = findValidIndex(currentIndex - 1, 'backward');
        if (prevIndex !== -1) loadArtwork(prevIndex);
    }

    function findValidIndex(start, direction) {
        for (let i = start; direction === 'forward' ? i < artworks.length : i >= 0; i += (direction === 'forward' ? 1 : -1)) {
            if (artworks[i] && artworks[i].valid) return i;
        }
        return -1;
    }

    // --- Event Listeners ---
    artImage.onerror = () => { if(artworks[currentIndex]) artworks[currentIndex].valid = false; loadNextArtwork(); };
    artImage.onload = () => { if(artworks[currentIndex]) updateCaption(artworks[currentIndex].title, artworks[currentIndex].photographer, artworks[currentIndex].photographerUrl); };
    
    // Desktop Scroll
    let lastScroll = 0;
    window.addEventListener('wheel', (event) => {
        const now = new Date().getTime();
        if (now - lastScroll < 800) return;
        lastScroll = now;
        if (event.deltaY > 0) loadNextArtwork();
        else loadPreviousArtwork();
    });

    // Mobile Touch Swipe
    let touchStartY = 0;
    let touchEndY = 0;
    artContainer.addEventListener('touchstart', e => touchStartY = e.changedTouches[0].screenY, { passive: true });
    artContainer.addEventListener('touchend', e => {
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeDistance = touchEndY - touchStartY;
        if (Math.abs(swipeDistance) > 50) { // Minimum swipe distance
            if (swipeDistance < 0) loadNextArtwork(); // Swipe Up
            else loadPreviousArtwork(); // Swipe Down
        }
    }

    randomButton.addEventListener('click', () => {
        if (artworks.length > 0) {
            const randomIndex = Math.floor(Math.random() * artworks.length);
            loadArtwork(randomIndex);
        }
    });

    initialize();
});