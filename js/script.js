document.addEventListener('DOMContentLoaded', () => {
    const artImage = document.getElementById('art-image');
    const artCaption = document.getElementById('art-caption');
    const randomButton = document.getElementById('random-button');

    // --- Pexels API Configuration ---
    const apiKey = 'dcvXtf9LJtUm2KIhnEdMpomMlx4NLhAvzdPArmKTHTq3ISqJpWj2tNUX';
    const apiUrl = 'https://api.pexels.com/v1/curated';

    let artworks = []; // The buffer of loaded, valid artwork objects
    let currentIndex = -1; // Current index in the 'artworks' buffer
    let currentPage = 1; // For API pagination
    const photosPerPage = 15;
    let isFetching = false;
    let hasMorePhotos = true; // Assume there are more photos initially

    // --- UI & State Management ---
    function updateCaption(text) { artCaption.textContent = text; }

    function setErrorState(message) {
        document.body.classList.add('error-state');
        artImage.style.display = 'none';
        randomButton.style.display = 'none';
        updateCaption(message);
    }

    // --- Core Data Fetching Logic ---
    async function initialize() {
        updateCaption('Connecting to Pexels...');
        document.body.classList.remove('error-state');
        artImage.style.display = '';
        randomButton.style.display = '';

        await fillArtworkBuffer(5); // Pre-fill the buffer with 5 items

        if (artworks.length > 0) {
            loadArtwork(0);
        } else {
            setErrorState("Could not load any photos from Pexels.");
        }
    }

    async function fillArtworkBuffer(targetCount) {
        if (isFetching || !hasMorePhotos) return;
        isFetching = true;

        let foundCount = artworks.filter(a => a.valid).length;

        while (foundCount < targetCount && hasMorePhotos) {
            updateCaption(`Searching for photos... (${foundCount}/${targetCount})`);
            try {
                const response = await fetch(`${apiUrl}?page=${currentPage}&per_page=${photosPerPage}`, {
                    headers: {
                        Authorization: apiKey
                    }
                });

                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} - ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.photos.length === 0) {
                    hasMorePhotos = false;
                    break;
                }

                for (const photo of data.photos) {
                    if (photo.src && photo.src.large && photo.alt) {
                        artworks.push({
                            image: photo.src.large,
                            caption: photo.alt || `Photo by ${photo.photographer}`,
                            valid: true,
                        });
                        foundCount++;
                    }
                }
                currentPage++;
            } catch (error) {
                console.error('Failed to fetch photos:', error);
                setErrorState('Could not connect to the Pexels API. Please check your network or API key.');
                break;
            }
        }
        
        console.log(`Buffer fill complete. Total artworks in buffer: ${artworks.length}`);
        isFetching = false;
    }

    // --- Artwork Navigation ---
    function loadArtwork(index) {
        if (index < 0 || index >= artworks.length) return;
        
        const artwork = artworks[index];
        if (!artwork.valid) {
            loadNextArtwork(); return;
        }

        currentIndex = index;
        updateCaption('Loading...');
        artImage.src = artwork.image;

        const validItemsAhead = artworks.slice(index).filter(a => a.valid).length;
        if (validItemsAhead < 3 && hasMorePhotos) {
            fillArtworkBuffer(artworks.length + 5);
        }
    }

    async function loadNextArtwork() {
        const nextIndex = findValidIndex(currentIndex + 1, 'forward');
        if (nextIndex !== -1) {
            loadArtwork(nextIndex);
        } else if (hasMorePhotos) {
            updateCaption('Searching for more photos...');
            await fillArtworkBuffer(artworks.length + 1);
            const newNextIndex = findValidIndex(currentIndex + 1, 'forward');
            if (newNextIndex !== -1) {
                loadArtwork(newNextIndex);
            } else {
                updateCaption("You've seen all available photos!");
            }
        } else {
            updateCaption("You've seen all available photos!");
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
    artImage.onload = () => { if(artworks[currentIndex]) updateCaption(artworks[currentIndex].caption); };
    
    let lastScroll = 0;
    window.addEventListener('wheel', (event) => {
        const now = new Date().getTime();
        if (now - lastScroll < 800) return;
        lastScroll = now;
        if (event.deltaY > 0) loadNextArtwork();
        else loadPreviousArtwork();
    });

    randomButton.addEventListener('click', () => {
        if (artworks.length > 0) {
            const randomIndex = Math.floor(Math.random() * artworks.length);
            loadArtwork(randomIndex);
        }
    });

    initialize();
});