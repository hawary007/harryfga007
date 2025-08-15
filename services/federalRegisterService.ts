import { FederalRegisterSearchResponse } from '../types';

const FR_API_BASE_URL = 'https://www.federalregister.gov/api/v1';

interface FederalRegisterSearchParams {
    term: string;
    type?: string;
}

/**
 * Searches for articles on the Federal Register.
 * @param params - The search parameters.
 * @returns A promise that resolves to the search results.
 */
export const searchNotices = async (params: FederalRegisterSearchParams): Promise<FederalRegisterSearchResponse> => {
    const url = new URL(`${FR_API_BASE_URL}/articles.json`);
    url.searchParams.append('conditions[term]', params.term);
    url.searchParams.append('conditions[type]', params.type || 'NOTICE');
    url.searchParams.append('per_page', '25');

    try {
        const response = await fetch(url.toString());

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
            throw new Error(`Federal Register API request failed with status ${response.status}: ${errorData.message || response.statusText}`);
        }

        return await response.json() as FederalRegisterSearchResponse;

    } catch (error) {
        console.error("Federal Register API call failed:", error);
        if (error instanceof Error) {
            throw new Error(`An error occurred while communicating with the Federal Register API: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the Federal Register API.");
    }
};
