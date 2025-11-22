// api/pexels.js
export default async function handler(request, response) {
    const apiKey = process.env.PEXELS_API_KEY;

    // Crucial check: Ensure the API key is configured on Vercel.
    if (!apiKey) {
        return response.status(412).json({ 
            error: 'Pexels API Key is not configured on the server.' 
        });
    }

    const page = request.query.page || 1;
    const apiUrl = `https://api.pexels.com/v1/curated?page=${page}&per_page=15`;

    try {
        const pexelsResponse = await fetch(apiUrl, {
            headers: {
                Authorization: apiKey,
            },
        });

        if (!pexelsResponse.ok) {
            // Forward the error from Pexels API
            return response.status(pexelsResponse.status).json({ 
                error: `Pexels API responded with ${pexelsResponse.status}` 
            });
        }

        const data = await pexelsResponse.json();
        
        response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        response.status(200).json(data);
    } catch (error) {
        response.status(500).json({ error: error.message });
    }
}