// api/pexels.js
export default async function handler(request, response) {
    const apiKey = process.env.PEXELS_API_KEY;
    const page = request.query.page || 1;
    const apiUrl = `https://api.pexels.com/v1/curated?page=${page}&per_page=15`;

    try {
        const pexelsResponse = await fetch(apiUrl, {
            headers: {
                Authorization: apiKey,
            },
        });

        if (!pexelsResponse.ok) {
            throw new Error(`Pexels API responded with ${pexelsResponse.status}`);
        }

        const data = await pexelsResponse.json();
        
        // Set cache headers to allow Vercel to cache the response
        response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        
        response.status(200).json(data);
    } catch (error) {
        response.status(500).json({ error: error.message });
    }
}