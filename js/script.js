document.addEventListener('DOMContentLoaded', () => {
    const VERSION = 'v1.7-env-fix';
    document.getElementById('version-display').textContent = VERSION;

    const swiper = document.querySelector('.swiper-container');
    const cards = {
        prev: document.getElementById('card-prev'),
        current: document.getElementById('card-current'),
        next: document.getElementById('card-next'),
    };
    const randomButton = document.getElementById('random-button');
    const artContainer = document.querySelector('.art-container');

    const apiUrl = '/api/pexels';
    
    let artworks = [];
    let currentIndex = -1;
    let isFetchingData = false, hasMorePhotos = true;
    let currentPage = Math.floor(Math.random() * 100) + 1;
    let isAnimating = false;
    const screenHeight = window.innerHeight;

    // --- Initialization ---
    async function initialize() {
        await fillArtworkBuffer(5);
        if (artworks.length > 0) {
            await waitForImageLoad(artworks[0]);
            setupInitialCards();
        } else {
            // This part will now be handled by the error message from the API call
            if (!document.body.classList.contains('error-state')) {
                setErrorState("Could not load any photos.");
            }
        }
    }

    function setupInitialCards() {
        currentIndex = 0;
        swiper.style.transform = `translateY(-${screenHeight}px)`;
        updateAllCards();
    }

    // --- Core Data & UI Update Logic ---
    function updateAllCards() {
        updateCard(cards.current, artworks[currentIndex]);
        updateCard(cards.prev, artworks[currentIndex - 1]);
        updateCard(cards.next, artworks[currentIndex + 1]);
    }

    function updateCard(cardElement, artworkData, state) {
        if (!cardElement) return;
        if (!artworkData) {
            cardElement.classList.remove('visible');
            return;
        }
        const titleEl = cardElement.querySelector('.caption-title');
        const detailEl = cardElement.querySelector('.caption-detail');

        if (state === 'loading') {
            titleEl.textContent = 'Loading...';
            detailEl.style.display = 'none';
            cardElement.classList.add('visible');
        } else {
            cardElement.querySelector('.art-image').src = artworkData.image;
            titleEl.textContent = artworkData.title;
            detailEl.textContent = `Photo by ${artworkData.photographer}`;
            detailEl.href = artworkData.photographerUrl;
            detailEl.style.display = 'inline-block';
            cardElement.classList.add('visible');
        }
    }

    async function waitForImageLoad(artwork) {
        if (!artwork) return Promise.reject();
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = artwork.image;
            img.onload = resolve;
            img.onerror = reject;
        });
    }

    // --- Touch Events & Animation ---
    let touchStartY = 0;
    artContainer.addEventListener('touchstart', e => {
        if (isAnimating) return;
        touchStartY = e.touches[0].clientY;
        swiper.style.transition = '';
    });

    artContainer.addEventListener('touchmove', e => {
        if (isAnimating) return;
        let deltaY = e.touches[0].clientY - touchStartY;
        const currentY = -screenHeight;
        if ((deltaY > 0 && currentIndex <= 0) || (deltaY < 0 && currentIndex >= artworks.length - 1)) {
            deltaY *= 0.3;
        }
        swiper.style.transform = `translateY(${currentY + deltaY}px)`;
    });

    artContainer.addEventListener('touchend', async e => {
        if (isAnimating) return;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const swipeThreshold = screenHeight * 0.2;
        const direction = deltaY < -swipeThreshold ? 'up' : (deltaY > swipeThreshold ? 'down' : 'none');
        
        const canSwipeUp = direction === 'up' && currentIndex < artworks.length - 1;
        const canSwipeDown = direction === 'down' && currentIndex > 0;

        if (canSwipeUp || canSwipeDown) {
            isAnimating = true;
            const targetIndex = (direction === 'up') ? currentIndex + 1 : currentIndex - 1;
            
            try {
                updateCard(cards.current, null, 'loading');
                await waitForImageLoad(artworks[targetIndex]);

                swiper.style.transition = 'transform 0.4s ease-out';
                const newY = direction === 'up' ? -2 * screenHeight : 0;
                swiper.style.transform = `translateY(${newY}px)`;
                
                await new Promise(resolve => setTimeout(resolve, 400));
                
                currentIndex = targetIndex;
                swiper.style.transition = '';
                swiper.style.transform = `translateY(-${screenHeight}px)`;
                updateAllCards();

            } catch {
                updateCard(cards.current, artworks[currentIndex]);
                swiper.style.transition = 'transform 0.4s ease-out';
                swiper.style.transform = `translateY(-${screenHeight}px)`;
            } finally {
                isAnimating = false;
                if (artworks.length - currentIndex < 3) {
                    fillArtworkBuffer(artworks.length + 5);
                }
            }
        } else {
            swiper.style.transition = 'transform 0.4s ease-out';
            swiper.style.transform = `translateY(-${screenHeight}px)`;
        }
    });
    
    // --- Random Button & Data Fetching ---
    randomButton.addEventListener('click', async () => {
        if (isAnimating || artworks.length < 2) return;
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * artworks.length);
        } while (randomIndex === currentIndex);

        isAnimating = true;
        try {
            updateCard(cards.current, null, 'loading');
            await waitForImageLoad(artworks[randomIndex]);
            
            cards.current.classList.remove('visible');
            await new Promise(resolve => setTimeout(resolve, 400));

            currentIndex = randomIndex;
            updateAllCards();
        } catch {
            updateCard(cards.current, artworks[currentIndex]);
        } finally {
            isAnimating = false;
        }
    });

    async function fillArtworkBuffer(targetCount) {
        if (isFetchingData || !hasMorePhotos) return;
        isFetchingData = true;
        while (artworks.length < targetCount && hasMorePhotos) {
            try {
                const response = await fetch(`${apiUrl}?page=${currentPage}`);
                const data = await response.json();

                if (!response.ok) {
                    // Display specific error from the serverless function
                    throw new Error(data.error || `API responded with ${response.status}`);
                }

                if (data.photos.length === 0) { hasMorePhotos = false; break; }
                for (const photo of data.photos) {
                    if (photo.src && photo.src.large) {
                        artworks.push({
                            image: photo.src.large, title: photo.alt || 'Untitled',
                            photographer: photo.photographer, photographerUrl: photo.photographer_url,
                        });
                    }
                }
                currentPage++;
            } catch (error) {
                setErrorState(error.message);
                break;
            }
        }
        isFetchingData = false;
    }

    function setErrorState(message) {
        artContainer.setAttribute('data-error-message', message);
        document.body.classList.add('error-state');
        randomButton.style.display = 'none';
    }

    initialize();
});