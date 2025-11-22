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
        await fillArtworkBuffer(5);
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

    // This is the new, robust function to rearrange cards AFTER animation.
    function rearrangeCards() {
        // This function is synchronous and happens instantly.
        swiper.style.transition = ''; // Disable transitions for the swap

        // Cycle DOM elements based on the new currentIndex
        const temp = cards.prev;
        if (lastSwipeDirection === 'up') {
            cards.prev = cards.current;
            cards.current = cards.next;
            cards.next = temp;
        } else { // down
            cards.next = cards.current;
            cards.current = cards.prev;
            cards.prev = temp;
        }
        
        // Re-apply correct IDs
        cards.prev.id = 'card-prev';
        cards.current.id = 'card-current';
        cards.next.id = 'card-next';
        
        // Instantly reset the swiper's visual position to the new 'current' card
        swiper.style.transform = `translateY(-${screenHeight}px)`;

        // Load data into the now out-of-view 'prev' and 'next' cards
        updateCard(cards.prev, artworks[currentIndex - 1]);
        updateCard(cards.next, artworks[currentIndex + 1]);

        // Check if we need to fetch more data for future swipes
        if (artworks.length - currentIndex < 3) {
            fillArtworkBuffer(artworks.length + 5);
        }
    }

    // --- Touch Events & Animation ---
    let touchStartY = 0;
    let currentY = 0;
    let lastSwipeDirection = '';

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

        isAnimating = true; // Lock interactions
        swiper.style.transition = 'transform 0.4s ease-out';

        if (deltaY < -swipeThreshold && currentIndex < artworks.length - 1) {
            // Animate swipe up
            lastSwipeDirection = 'up';
            currentIndex++;
            swiper.style.transform = `translateY(-${2 * screenHeight}px)`;
            setTimeout(() => {
                rearrangeCards();
                isAnimating = false;
            }, 400);
        } else if (deltaY > swipeThreshold && currentIndex > 0) {
            // Animate swipe down
            lastSwipeDirection = 'down';
            currentIndex--;
            swiper.style.transform = `translateY(0px)`;
            setTimeout(() => {
                rearrangeCards();
                isAnimating = false;
            }, 400);
        } else {
            // Bounce back
            swiper.style.transform = `translateY(-${screenHeight}px)`;
            setTimeout(() => {
                isAnimating = false;
            }, 400);
        }
    });
    
    // --- Random Button & Data Fetching ---
    randomButton.addEventListener('click', async () => {
        if (isAnimating || artworks.length === 0) return;
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * artworks.length);
        } while (randomIndex === currentIndex && artworks.length > 1);

        isAnimating = true;
        cards.current.classList.remove('visible');
        
        await new Promise(resolve => setTimeout(resolve, 400));

        currentIndex = randomIndex;
        updateCard(cards.current, artworks[currentIndex]);
        updateCard(cards.prev, artworks[currentIndex - 1]);
        updateCard(cards.next, artworks[currentIndex + 1]);

        if (artworks.length - currentIndex < 3) {
            await fillArtworkBuffer(artworks.length + 5);
            updateCard(cards.next, artworks[currentIndex + 1]);
        }
        isAnimating = false;
    });

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