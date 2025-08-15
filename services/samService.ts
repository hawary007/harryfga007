import { SamSearchResponse } from '../types';

const SAM_API_BASE_URL = 'https://api.sam.gov/prod/opportunities/v1/search';

interface SamSearchParams {
    keywords: string;
    apiKey: string;
    noticeType?: string;
}

/**
 * Searches for active opportunities on SAM.gov.
 * @param params - The search parameters including keywords and API key.
 * @returns A promise that resolves to the search results.
 */
export const searchOpportunities = async (params: SamSearchParams): Promise<SamSearchResponse> => {
    const url = new URL(SAM_API_BASE_URL);
    url.searchParams.append('keywords', params.keywords);
    url.searchParams.append('noticeType', params.noticeType || 'solicitation');
    url.searchParams.append('api_key', params.apiKey);
    url.searchParams.append('limit', '25'); // Get a reasonable number of results

    try {
        const response = await fetch(url.toString());

        if (!response.ok) {
            // SAM.gov API might return detailed error messages
            const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
            throw new Error(`SAM.gov API request failed with status ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        return await response.json() as SamSearchResponse;

    } catch (error) {
        console.error("SAM.gov API call failed:", error);
        if (error instanceof Error) {
            throw new Error(`An error occurred while communicating with the SAM.gov API: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the SAM.gov API.");
    }
};
