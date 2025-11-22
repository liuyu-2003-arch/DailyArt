document.addEventListener('DOMContentLoaded', () => {
    const swiper = document.querySelector('.swiper-container');
    const cards = {
        prev: document.getElementById('card-prev'),
        current: document.getElementById('card-current'),
        next: document.getElementById('card-next'),
    };
    const randomButton = document.getElementById('random-button');
    const artContainer = document.querySelector('.art-container');

    const apiKey = 'dcvXtf9LJtUm2KIhnEdMpomMlx4NLhAvzdPArmKTHTq3ISqJpWj2tNUX';
    const apiUrl = 'https://api.pexels.com/v1/curated';
    
    let artworks = [];
    let currentIndex = -1;
    let isFetchingData = false, hasMorePhotos = true, currentPage = 1;
    let isAnimating = false;
    const screenHeight = window.innerHeight;
    const PRELOAD_BUFFER_SIZE = 5; // How many images to preload ahead

    // --- Smart Preloader Service ---
    function startPreloaderService() {
        setInterval(() => {
            if (isFetchingData) return; // Don't preload while fetching new data
            for (let i = 0; i < PRELOAD_BUFFER_SIZE; i++) {
                const artwork = artworks[currentIndex + i];
                if (artwork && !artwork.isPreloaded && !artwork.isLoading) {
                    preloadImage(artwork);
                }
            }
        }, 1000); // Check every second
    }

    function preloadImage(artwork) {
        artwork.isLoading = true;
        const img = new Image();
        img.src = artwork.image;
        img.onload = () => {
            artwork.isPreloaded = true;
            artwork.isLoading = false;
            console.log(`Preloaded: ${artwork.title}`);
        };
        img.onerror = () => {
            artwork.valid = false;
            artwork.isPreloaded = false;
            artwork.isLoading = false;
            console.warn(`Failed to preload: ${artwork.title}`);
        };
    }

    // --- Initialization ---
    async function initialize() {
        await fillArtworkBuffer(PRELOAD_BUFFER_SIZE);
        if (artworks.length > 0) {
            startPreloaderService();
            // Wait for the very first image to be ready before showing it
            await waitForPreload(artworks[0]);
            setupInitialCards();
        } else {
            setErrorState("Could not load any photos from Pexels.");
        }
    }

    async function waitForPreload(artwork) {
        if (!artwork) return Promise.reject();
        if (artwork.isPreloaded) return Promise.resolve();
        
        updateCard(cards.current, null, 'loading'); // Show loading state on current card
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (artwork.isPreloaded) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (artwork.valid === false) { // If preload failed
                    clearInterval(checkInterval);
                    reject();
                }
            }, 100); // Check every 100ms
        });
    }

    function setupInitialCards() {
        currentIndex = 0;
        swiper.style.transform = `translateY(-${screenHeight}px)`;
        updateCard(cards.current, artworks[0]);
        updateCard(cards.next, artworks[1]);
        cards.prev.classList.remove('visible');
    }

    // --- Card & Data Management ---
    function updateCard(cardElement, artworkData, state) {
        if (!cardElement) return;
        if (!artworkData) {
            if(cardElement) cardElement.classList.remove('visible');
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

    function rearrangeCards(direction) {
        swiper.style.transition = '';
        currentIndex += (direction === 'up' ? 1 : -1);
        
        const temp = cards.prev;
        if (direction === 'up') {
            cards.prev = cards.current;
            cards.current = cards.next;
            cards.next = temp;
        } else {
            cards.next = cards.current;
            cards.current = cards.prev;
            cards.prev = temp;
        }
        
        cards.prev.id = 'card-prev';
        cards.current.id = 'card-current';
        cards.next.id = 'card-next';
        
        swiper.style.transform = `translateY(-${screenHeight}px)`;

        updateCard(cards.prev, artworks[currentIndex - 1]);
        updateCard(cards.next, artworks[currentIndex + 1]);

        if (artworks.length - currentIndex < PRELOAD_BUFFER_SIZE) {
            fillArtworkBuffer(artworks.length + 5);
        }
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
        const targetIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1;
        const targetArtwork = artworks[targetIndex];

        if (targetArtwork) {
            isAnimating = true;
            try {
                await waitForPreload(targetArtwork);
                
                swiper.style.transition = 'transform 0.4s ease-out';
                const newY = direction === 'up' ? -2 * screenHeight : 0;
                swiper.style.transform = `translateY(${newY}px)`;
                
                await new Promise(resolve => setTimeout(resolve, 400));
                
                rearrangeCards(direction);
            } catch {
                // Preload failed, bounce back
                updateCard(cards.current, artworks[currentIndex]); // Restore caption
                swiper.style.transition = 'transform 0.4s ease-out';
                swiper.style.transform = `translateY(-${screenHeight}px)`;
            } finally {
                isAnimating = false;
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
        const targetArtwork = artworks[randomIndex];
        
        try {
            await waitForPreload(targetArtwork);
            
            cards.current.classList.remove('visible');
            await new Promise(resolve => setTimeout(resolve, 400));

            currentIndex = randomIndex;
            updateCard(cards.current, artworks[currentIndex]);
            updateCard(cards.prev, artworks[currentIndex - 1]);
            updateCard(cards.next, artworks[currentIndex + 1]);
        } catch {
            updateCard(cards.current, artworks[currentIndex]); // Restore caption
            console.warn("Failed to load random image, staying on current.");
        } finally {
            isAnimating = false;
        }
    });

    async function fillArtworkBuffer(targetCount) {
        if (isFetchingData || !hasMorePhotos) return;
        isFetchingData = true;
        while (artworks.length < targetCount && hasMorePhotos) {
            try {
                const response = await fetch(`${apiUrl}?page=${currentPage}&per_page=15`, { headers: { Authorization: apiKey } });
                if (!response.ok) throw new Error(`API Error: ${response.status}`);
                const data = await response.json();
                if (data.photos.length === 0) { hasMorePhotos = false; break; }
                for (const photo of data.photos) {
                    if (photo.src && photo.src.large) {
                        artworks.push({
                            image: photo.src.large, title: photo.alt || 'Untitled',
                            photographer: photo.photographer, photographerUrl: photo.photographer_url,
                            valid: true, isPreloaded: false, isLoading: false,
                        });
                    }
                }
                currentPage++;
            } catch (error) {
                setErrorState('Could not connect to the Pexels API.');
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