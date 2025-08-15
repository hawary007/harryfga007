
export type View = 'login' | 'signup' | 'app';

export enum Command {
  KEYWORDS = '/keywords',
  REVIEW = '/review',
  DRAFT = '/draft',
  PROCESS_EMAIL = '/process_email',
  CREATE_GMAIL_DRAFT = '/create_gmail_draft',
  SEARCH = '/search',
  ECFR_SEARCH = '/ecfr_search',
  ACTIVE_RFPS = '/active_rfps',
  RFP_NOTICES = '/rfp_notices',
  RULEMAKING_DOCUMENTS = '/rulemaking_documents',
  FULL_OPPORTUNITY_ANALYSIS = '/full_opportunity_analysis',
}

export enum DocumentType {
  CAPABILITY_STATEMENT = 'Capability Statement',
  RFP = 'RFP/RFQ',
  EMAIL = 'Email',
  OPPORTUNITY_BREAKDOWN = 'Opportunity Breakdown'
}

export interface AppFile {
  id: string;
  name: string;
  content: string;
  type: DocumentType;
}

// Types for eCFR API Response
export interface EcfrResult {
  title: string;
  part?: string;
  subpart?: string;
  section?: string;
  label: string;
  text?: string;
  url: string;
  score: number;
}

export interface EcfrMeta {
  total_count: number;
}

export interface EcfrSearchResponse {
  results: EcfrResult[];
  meta: EcfrMeta;
}

// Types for SAM.gov API Response
export interface SamOpportunity {
  title: string;
  solicitationNumber: string;
  fullGovtResponseDate: string;
  organizationHierarchy: {
    name: string;
  };
  uiLink: string;
}

export interface SamSearchResponse {
  opportunitiesData: SamOpportunity[];
  totalRecords: number;
}

// Types for Federal Register API Response
export interface FederalRegisterArticle {
    document_number: string;
    title: string;
    type: string;
    abstract: string;
    publication_date: string;
    html_url: string;
}

export interface FederalRegisterSearchResponse {
    count: number;
    results: FederalRegisterArticle[];
}

// Types for Regulations.gov API Response
export interface RegulationDocument {
    id: string;
    attributes: {
        title: string;
        commentDueDate: string | null;
        postedDate: string;
        lastModifiedDate: string;
    };
    links: {
        self: string;
    };
}

export interface RegulationsSearchResponse {
    data: RegulationDocument[];
    meta: {
        totalElements: number;
    };
}