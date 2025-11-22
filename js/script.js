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
    let isFetching = false, hasMorePhotos = true, currentPage = 1;
    let isAnimating = false;
    const screenHeight = window.innerHeight;

    // --- Initialization ---
    async function initialize() {
        await fillArtworkBuffer(5); // Fetch a slightly larger initial buffer
        if (artworks.length >= 1) {
            setupInitialCards();
        } else {
            setErrorState("Could not load any photos from Pexels.");
        }
    }

    function setupInitialCards() {
        currentIndex = 0;
        swiper.style.transform = `translateY(-${screenHeight}px)`;
        updateCard(cards.current, artworks[0]);
        if (artworks.length > 1) updateCard(cards.next, artworks[1]);
        cards.prev.classList.remove('visible');
    }

    // --- Card & Data Management ---
    function updateCard(cardElement, artworkData) {
        if (!cardElement || !artworkData) {
            if(cardElement) cardElement.classList.remove('visible');
            return;
        }
        cardElement.querySelector('.art-image').src = artworkData.image;
        cardElement.querySelector('.caption-title').textContent = artworkData.title;
        const detail = cardElement.querySelector('.caption-detail');
        detail.textContent = `Photo by ${artworkData.photographer}`;
        detail.href = artworkData.photographerUrl;
        cardElement.classList.add('visible');
    }

    async function shiftCards(direction) {
        isAnimating = true;
        swiper.style.transition = 'transform 0.4s ease-out';
        const newY = direction === 'up' ? -2 * screenHeight : 0;
        swiper.style.transform = `translateY(${newY}px)`;

        await new Promise(resolve => setTimeout(resolve, 400));

        swiper.style.transition = '';
        currentIndex += (direction === 'up' ? 1 : -1);

        // Cycle DOM elements
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

        if (artworks.length - currentIndex < 3) {
            fillArtworkBuffer(artworks.length + 5);
        }
        isAnimating = false;
    }

    // --- Touch Events ---
    let touchStartY = 0;
    let currentY = 0;
    artContainer.addEventListener('touchstart', e => {
        if (isAnimating) return;
        touchStartY = e.touches[0].clientY;
        currentY = -screenHeight;
        swiper.style.transition = '';
    });

    artContainer.addEventListener('touchmove', e => {
        if (isAnimating) return;
        let deltaY = e.touches[0].clientY - touchStartY;
        if ((deltaY > 0 && currentIndex <= 0) || (deltaY < 0 && currentIndex >= artworks.length - 1)) {
            deltaY *= 0.3; // Rubber band effect
        }
        swiper.style.transform = `translateY(${currentY + deltaY}px)`;
    });

    artContainer.addEventListener('touchend', e => {
        if (isAnimating) return;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const swipeThreshold = screenHeight * 0.2;

        if (deltaY < -swipeThreshold && currentIndex < artworks.length - 1) {
            shiftCards('up');
        } else if (deltaY > swipeThreshold && currentIndex > 0) {
            shiftCards('down');
        } else {
            swiper.style.transition = 'transform 0.4s ease-out';
            swiper.style.transform = `translateY(-${screenHeight}px)`;
        }
    });
    
    // --- Random Button Logic ---
    randomButton.addEventListener('click', async () => {
        if (isAnimating || artworks.length === 0) return;
        
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * artworks.length);
        } while (randomIndex === currentIndex && artworks.length > 1);

        isAnimating = true;
        
        // Fade out current card
        cards.current.classList.remove('visible');
        
        await new Promise(resolve => setTimeout(resolve, 400)); // Wait for fade out

        // Update all cards based on the new random index
        currentIndex = randomIndex;
        updateCard(cards.current, artworks[currentIndex]);
        updateCard(cards.prev, artworks[currentIndex - 1]);
        updateCard(cards.next, artworks[currentIndex + 1]);

        // Ensure buffer is filled for future swipes
        if (artworks.length - currentIndex < 3) {
            await fillArtworkBuffer(artworks.length + 5);
            // Re-update next card in case new data was fetched
            updateCard(cards.next, artworks[currentIndex + 1]);
        }
        
        isAnimating = false;
    });

    // --- Data Fetching ---
    async function fillArtworkBuffer(targetCount) {
        if (isFetching || !hasMorePhotos) return;
        isFetching = true;
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
                        });
                    }
                }
                currentPage++;
            } catch (error) {
                setErrorState('Could not connect to the Pexels API.');
                break;
            }
        }
        isFetching = false;
    }

    function setErrorState(message) {
        artContainer.setAttribute('data-error-message', message);
        document.body.classList.add('error-state');
        randomButton.style.display = 'none';
    }

    initialize();
});