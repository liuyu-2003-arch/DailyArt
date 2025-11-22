// api/pexels.js
export default async function handler(request, response) {
    const apiKey = process.env.PEXELS_API_KEY;

    if (!apiKey) {
        console.error("PEXELS_API_KEY is not set in environment variables.");
        return response.status(412).json({ 
            error: 'Pexels API Key is not configured on the server. Please set it in your Vercel project settings.' 
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
            const errorBody = await pexelsResponse.text();
            console.error(`Pexels API Error: Status ${pexelsResponse.status}, Body: ${errorBody}`);
            return response.status(pexelsResponse.status).json({ 
                error: `Pexels API responded with ${pexelsResponse.status}` 
            });
        }

        const data = await pexelsResponse.json();
        
        response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        response.status(200).json(data);
    } catch (error) {
        console.error("Internal Server Error:", error);
        response.status(500).json({ error: error.message });
    }
}