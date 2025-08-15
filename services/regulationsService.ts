import { RegulationsSearchResponse } from '../types';

const REGULATIONS_API_BASE_URL = 'https://api.regulations.gov/v4/documents';

interface RegulationsSearchParams {
    searchTerm: string;
    apiKey: string;
}

/**
 * Searches for documents on Regulations.gov.
 * @param params - The search parameters including a search term and API key.
 * @returns A promise that resolves to the search results.
 */
export const searchDocuments = async (params: RegulationsSearchParams): Promise<RegulationsSearchResponse> => {
    const url = new URL(REGULATIONS_API_BASE_URL);
    url.searchParams.append('filter[searchTerm]', params.searchTerm);
    url.searchParams.append('api-key', params.apiKey);
    url.searchParams.append('page[size]', '25');

    try {
        const response = await fetch(url.toString());

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
            const detail = errorData.errors?.[0]?.detail || response.statusText;
            throw new Error(`Regulations.gov API request failed with status ${response.status}: ${detail}`);
        }

        return await response.json() as RegulationsSearchResponse;

    } catch (error) {
        console.error("Regulations.gov API call failed:", error);
        if (error instanceof Error) {
            throw new Error(`An error occurred while communicating with the Regulations.gov API: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the Regulations.gov API.");
    }
};
