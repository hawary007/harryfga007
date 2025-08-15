import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { AppFile, DocumentType, Command } from '../types';
import { searchEcfr } from './ecfrService';
import { searchOpportunities } from './samService';
import { searchNotices } from './federalRegisterService';
import { searchDocuments } from './regulationsService';


if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';

// This system prompt contains all the logic and instructions for the AI agents.
const FGA_OMNI_ASSISTANT_SYSTEM_PROMPT = `
Master System Prompt: The "FGA Omni-Assistant" & "GovAdvisor Analyst"

1. Core Identity & Purpose
You are a hybrid AI: the "FGA Omni-Assistant" for document analysis and the "GovAdvisor Analyst" for processing live API data. You are an indispensable, hyper-accurate tool for procurement specialists. Your mission is to execute distinct, command-driven tasks with unparalleled precision.

2. Overarching Principles & Guardrails
- Mode-Based Operation: Execute commands as specified. NEVER perform an action without its specific command.
- Strict Input Requirements: Each mode requires specific inputs. You will not proceed until the required inputs are provided.
- Inflexible Output Formatting: Replicate the specified templates precisely.
- Data Supremacy: Base your analysis and output solely on the documents or API data provided by the user in the current session.

3. FGA Omni-Assistant Modes (File-Based)

Mode 1: /keywords - Strategic Keyword & Scope Analysis
... (template as specified) ...

Mode 2: /review - Detailed Fit-Gap Analysis
... (template as specified) ...

Mode 3: /draft - Client Email Drafting
... (template as specified) ...

Mode 4: /process_email - Email Processing for Notion
... (template as specified) ...

Mode 5: /create_gmail_draft - Gmail Draft Preparation
... (template as specified) ...

4. FGA Compass Search Agent (Web Search)

/search Command:
- If no parameters are given, you MUST immediately prompt the user by outputting: "AWAIT_INPUT:Please provide the specific keywords or service types you are looking for, and the submission deadline time interval."
- Once parameters are provided, execute a web search and format the output strictly as follows: **Title:**, **Bid Number:**, **Issuing Agency:**, **Submission Deadline:**, **Opportunity Link:**, **Point of Contact (Email/Phone):**.
- If no opportunities are found, state: "No opportunities were found matching your criteria and time interval."

5. GovAdvisor Analyst Modes (Live API Data Processing)

Your role is to receive JSON data from a specific government API, analyze it, and present a clear, human-readable summary.

/ecfr_search Role:
- You will receive JSON from the eCFR API.
- Your task is to summarize key regulations, titles, and agencies. Format with clear headings and bullet points.
- If results are empty, state: "No regulations were found matching the specified criteria."

/active_rfps Role (SAM.gov data):
- You will receive JSON data containing active RFP listings from the SAM.gov API.
- Your task is to format these opportunities into a clean, easy-to-read list. For each opportunity, present:
  - **Title:** [Title]
  - **Solicitation #:** [Solicitation Number]
  - **Agency:** [Agency Name]
  - **Response Date:** [Due Date]
  - **Link:** [UI Link]
- If the data is empty, state: "No active RFPs were found on SAM.gov for the given keywords."

/rfp_notices Role (Federal Register data):
- You will receive JSON from the Federal Register API.
- Summarize the top 3-5 most relevant notices. For each, include the title, publication date, and a brief abstract.
- If the data is empty, state: "No relevant notices were found on the Federal Register."

/rulemaking_documents Role (Regulations.gov data):
- You will receive JSON from the Regulations.gov API.
- Summarize the key rulemaking documents, including their title and posted date.
- If the data is empty, state: "No rulemaking documents were found on Regulations.gov for the given term."
`;

export const PROMPT_CONFIG: Record<Command, { description: string; instruction: string; requiredFiles: DocumentType[] }> = {
    [Command.KEYWORDS]: {
        description: "Strategic Keyword & Scope Analysis",
        instruction: "Upload a client's Capability Statement to generate a comprehensive list of keywords and a scope analysis.",
        requiredFiles: [DocumentType.CAPABILITY_STATEMENT],
    },
    [Command.REVIEW]: {
        description: "Detailed Fit-Gap Analysis",
        instruction: "Upload a Capability Statement and an RFP/RFQ document to conduct an exhaustive fit-gap analysis.",
        requiredFiles: [DocumentType.CAPABILITY_STATEMENT, DocumentType.RFP],
    },
    [Command.DRAFT]: {
        description: "Client Email Drafting",
        instruction: "Upload a Capability Statement and an RFP/RFQ to draft a client-ready opportunity breakdown email.",
        requiredFiles: [DocumentType.CAPABILITY_STATEMENT, DocumentType.RFP],
    },
    [Command.PROCESS_EMAIL]: {
        description: "Email Processing for Notion",
        instruction: "Upload a single email to transform it into a structured report for Notion.",
        requiredFiles: [DocumentType.EMAIL],
    },
    [Command.CREATE_GMAIL_DRAFT]: {
        description: "Gmail Draft Preparation",
        instruction: "Upload a pre-formatted Opportunity Breakdown email to parse it into components for a Gmail draft.",
        requiredFiles: [DocumentType.OPPORTUNITY_BREAKDOWN],
    },
    [Command.SEARCH]: {
        description: "FGA Compass Search Agent",
        instruction: "Execute a precise web search for government RFPs/RFQs based on your criteria.",
        requiredFiles: [],
    },
    [Command.ECFR_SEARCH]: {
        description: "eCFR Search",
        instruction: "Search the Electronic Code of Federal Regulations. The AI will analyze and summarize the results.",
        requiredFiles: [],
    },
    [Command.ACTIVE_RFPS]: {
        description: "Active RFPs (SAM.gov)",
        instruction: "Find active Requests for Proposals from SAM.gov. Requires a SAM.gov API key.",
        requiredFiles: [],
    },
    [Command.RFP_NOTICES]: {
        description: "RFP Notices (Federal Register)",
        instruction: "Find pre-solicitation notices and related announcements from the Federal Register.",
        requiredFiles: [],
    },
    [Command.RULEMAKING_DOCUMENTS]: {
        description: "Rulemaking Documents (Regulations.gov)",
        instruction: "Search for federal rulemaking documents. Requires a Regulations.gov API key.",
        requiredFiles: [],
    },
    [Command.FULL_OPPORTUNITY_ANALYSIS]: {
        description: "Project Action: Full Opportunity Analysis",
        instruction: "Finds the top RFP from SAM.gov, analyzes it against your Capability Statement, and drafts a client email in a single step.",
        requiredFiles: [DocumentType.CAPABILITY_STATEMENT],
    },
};

const getFileContent = (files: AppFile[], type: DocumentType): string | null => {
    return files.find(f => f.type === type)?.content ?? null;
};

const constructUserPrompt = (command: Command, files: AppFile[], otherInputs?: any): string => {
    let userInput = `${command}\n\n`;

    if (command === Command.SEARCH && otherInputs?.searchParams) {
        userInput += `User has provided the following search parameters:\n${otherInputs.searchParams}\n\n`;
    }

    if(otherInputs?.apiResults) {
        userInput += `The system has performed a search. Please analyze the following JSON results and provide a summary based on your instructions for the ${command} command.\n\n[START of API JSON Results]\n${otherInputs.apiResults}\n[END of API JSON Results]\n\n`;
    }

    const requiredFileTypes = PROMPT_CONFIG[command].requiredFiles;
    for (const docType of requiredFileTypes) {
        const content = getFileContent(files, docType);
        if (content) {
            userInput += `[START of Document: ${docType}]\n${content}\n[END of Document: ${docType}]\n\n`;
        }
    }
    return userInput;
};

export const processCommand = async (command: Command, files: AppFile[], otherInputs?: any): Promise<string> => {
    const config = PROMPT_CONFIG[command];
    
    // Initial /search command triggers a prompt for more info
    if (command === Command.SEARCH && !otherInputs?.searchParams) {
        return "AWAIT_INPUT:Please provide the specific keywords or service types you are looking for, and the submission deadline time interval.";
    }
    
    // --- API Fetching and Multi-Step Command Block ---
    try {
        switch(command) {
            case Command.FULL_OPPORTUNITY_ANALYSIS: {
                // Step 1: Search for opportunities
                const samResponse = await searchOpportunities({ keywords: otherInputs.keywords, apiKey: otherInputs.apiKey });
                if (samResponse.opportunitiesData.length === 0) {
                    return `No active RFPs found for "${otherInputs.keywords}" on SAM.gov. Cannot proceed with full analysis.`;
                }
                const topOpportunity = samResponse.opportunitiesData[0];
                const rfpContent = `Title: ${topOpportunity.title}\nSolicitation #: ${topOpportunity.solicitationNumber}\nAgency: ${topOpportunity.organizationHierarchy.name}\nResponse Date: ${topOpportunity.fullGovtResponseDate}\nLink: ${topOpportunity.uiLink}`;
                
                // Step 2 & 3: Run sub-commands
                const rfpFile: AppFile = { id: 'generated-rfp', name: `Generated RFP (${topOpportunity.solicitationNumber}).txt`, content: rfpContent, type: DocumentType.RFP };
                const capStatementFile = files.find(f => f.type === DocumentType.CAPABILITY_STATEMENT);
                if (!capStatementFile) return "Error: Capability Statement is required for Full Opportunity Analysis.";

                const [reviewResult, draftResult] = await Promise.all([
                    processCommand(Command.REVIEW, [capStatementFile, rfpFile]),
                    processCommand(Command.DRAFT, [capStatementFile, rfpFile])
                ]);

                // Step 4: Aggregate results
                let finalResult = `✅ **Full Opportunity Analysis Report**\n\n`;
                finalResult += `--- **1. Top Matching Opportunity** ---\n`;
                finalResult += rfpContent + `\n\n`;
                finalResult += `--- **2. Fit-Gap Analysis** ---\n`;
                finalResult += reviewResult + `\n\n`;
                finalResult += `--- **3. Draft Client Email** ---\n`;
                finalResult += draftResult;
                return finalResult;
            }
            case Command.ECFR_SEARCH: {
                const apiResponse = await searchEcfr({ query: otherInputs.ecfrQuery, agencies: otherInputs.ecfrAgencies });
                if (apiResponse.results.length === 0) return `No regulations found for "${otherInputs.ecfrQuery}".`;
                otherInputs.apiResults = JSON.stringify(apiResponse, null, 2);
                break;
            }
            case Command.ACTIVE_RFPS: {
                const apiResponse = await searchOpportunities({ keywords: otherInputs.keywords, apiKey: otherInputs.apiKey });
                if (apiResponse.opportunitiesData.length === 0) return `No active RFPs found for "${otherInputs.keywords}" on SAM.gov.`;
                otherInputs.apiResults = JSON.stringify(apiResponse, null, 2);
                break;
            }
            case Command.RFP_NOTICES: {
                const apiResponse = await searchNotices({ term: otherInputs.term });
                if (apiResponse.results.length === 0) return `No notices found for "${otherInputs.term}" on Federal Register.`;
                otherInputs.apiResults = JSON.stringify(apiResponse, null, 2);
                break;
            }
            case Command.RULEMAKING_DOCUMENTS: {
                const apiResponse = await searchDocuments({ searchTerm: otherInputs.searchTerm, apiKey: otherInputs.apiKey });
                if (apiResponse.data.length === 0) return `No documents found for "${otherInputs.searchTerm}" on Regulations.gov.`;
                otherInputs.apiResults = JSON.stringify(apiResponse, null, 2);
                break;
            }
        }
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching data.";
        return `Error: ${errorMessage}`;
    }


    // File validation for file-based commands
    const missingFiles = config.requiredFiles.filter(type => !getFileContent(files, type));
    if (missingFiles.length > 0) {
        return `Error: The command ${command} requires the following documents: ${missingFiles.join(', ')}. Please upload them.`;
    }

    const userPrompt = constructUserPrompt(command, files, otherInputs);

    try {
        const requestConfig: any = {
            model,
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: FGA_OMNI_ASSISTANT_SYSTEM_PROMPT }] },
        };

        if (command === Command.SEARCH) {
            requestConfig.tools = [{ googleSearch: {} }];
        }
        
        const response: GenerateContentResponse = await ai.models.generateContent(requestConfig);
        
        let responseText = response.text;
        
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        if (command === Command.SEARCH && groundingMetadata?.groundingChunks?.length) {
             const uniqueUris = [...new Set(groundingMetadata.groundingChunks.map(chunk => chunk.web?.uri).filter(Boolean))];
             if (uniqueUris.length > 0) {
                responseText += '\n\n---\n**Sources:**\n' + uniqueUris.map(uri => `- ${uri}`).join('\n');
             }
        }
        
        return responseText;

    } catch (error) {
        console.error("Gemini API call failed:", error);
        if (error instanceof Error) {
           return `An error occurred while communicating with the AI: ${error.message}`;
        }
        return "An unknown error occurred while communicating with the AI. Please try again later.";
    }
};