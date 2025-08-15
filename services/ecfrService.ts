import { EcfrSearchResponse } from '../types';

const ECFR_API_BASE_URL = 'https://www.ecfr.gov/api/search/v1';

interface EcfrSearchParams {
    query: string;
    agencies?: string; // Comma-separated string of agency slugs
    date?: string; // YYYY-MM-DD
}

/**
 * Searches the Electronic Code of Federal Regulations API.
 * @param params - The search parameters.
 * @returns A promise that resolves to the search results.
 */
export const searchEcfr = async (params: EcfrSearchParams): Promise<EcfrSearchResponse> => {
    const url = new URL(`${ECFR_API_BASE_URL}/results`);
    url.searchParams.append('query', params.query);
    url.searchParams.append('per_page', '50'); // Get a reasonable number of results

    if (params.agencies) {
        // The API expects agency_slugs[] parameter for each slug
        params.agencies.split(',').forEach(slug => {
            url.searchParams.append('agency_slugs[]', slug.trim());
        });
    }

    if (params.date) {
        url.searchParams.append('date', params.date);
    }
    
    try {
        const response = await fetch(url.toString());

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
            throw new Error(`eCFR API request failed with status ${response.status}: ${errorData.message || response.statusText}`);
        }

        return await response.json() as EcfrSearchResponse;

    } catch (error) {
        console.error("eCFR API call failed:", error);
        if (error instanceof Error) {
            throw new Error(`An error occurred while communicating with the eCFR API: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the eCFR API.");
    }
};
