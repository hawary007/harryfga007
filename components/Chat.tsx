import React, { useState, useRef, useCallback } from 'react';
import { AppFile, DocumentType, Command } from '../types';
import { processCommand, PROMPT_CONFIG } from '../services/geminiService';

// --- ICONS ---
const DocumentArrowUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M9 2.25a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM15 3a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-1.5 0V3.75a.75.75 0 0 1 .75-.75ZM4.5 9.75a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1-.75-.75Zm0 4.5a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /><path d="M3.75 2.25a.75.75 0 0 0-1.5 0v14.25a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V2.25a.75.75 0 0 0-1.5 0v14.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V2.25Z" /></svg>
);
const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L10 8.586 7.707 6.293a1 1 0 0 0-1.414 1.414L8.586 10l-2.293 2.293a1 1 0 0 0 1.414 1.414L10 11.414l2.293 2.293a1 1 0 0 0 1.414-1.414L11.414 10l2.293-2.293Z" clipRule="evenodd" /></svg>
);
const CommandLineIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
);


const CommandInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Command>(Command.KEYWORDS);
  const [files, setFiles] = useState<AppFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  
  // State for various inputs
  const [searchParams, setSearchParams] = useState('');
  const [ecfrQuery, setEcfrQuery] = useState('');
  const [ecfrAgencies, setEcfrAgencies] = useState('');
  const [samKeywords, setSamKeywords] = useState('');
  const [samApiKey, setSamApiKey] = useState('');
  const [frNoticesTerm, setFrNoticesTerm] = useState('');
  const [regulationsTerm, setRegulationsTerm] = useState('');
  const [regulationsApiKey, setRegulationsApiKey] = useState('');

  const resultEndRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const newFile: AppFile = { id: `${type}-${Date.now()}`, name: file.name, content, type };
        setFiles(prev => [...prev.filter(f => f.type !== type), newFile]);
      };
      reader.readAsText(file);
    }
    event.target.value = ''; // Allow re-uploading the same file
  };

  const removeFile = (fileId: string) => setFiles(prev => prev.filter(f => f.id !== fileId));

  const handleExecute = async () => {
    setIsLoading(true);
    setResult('');
    
    let otherInputs = {};
    switch(activeTab) {
        case Command.SEARCH:
            if (result.startsWith('AWAIT_INPUT:')) otherInputs = { searchParams };
            break;
        case Command.ECFR_SEARCH:
            otherInputs = { ecfrQuery, ecfrAgencies };
            break;
        case Command.ACTIVE_RFPS:
            otherInputs = { keywords: samKeywords, apiKey: samApiKey };
            break;
        case Command.RFP_NOTICES:
            otherInputs = { term: frNoticesTerm };
            break;
        case Command.RULEMAKING_DOCUMENTS:
            otherInputs = { searchTerm: regulationsTerm, apiKey: regulationsApiKey };
            break;
        case Command.FULL_OPPORTUNITY_ANALYSIS:
            otherInputs = { keywords: samKeywords, apiKey: samApiKey };
            break;
    }

    try {
      const response = await processCommand(activeTab, files, otherInputs);
      setResult(response);
    } catch (error) {
      console.error("Error processing command:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setResult(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => resultEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };
  
  const isReadyForExecution = () => {
    const config = PROMPT_CONFIG[activeTab];
    if (!config) return false;

    const filesReady = config.requiredFiles.every(type => files.some(f => f.type === type));

    switch(activeTab) {
        case Command.ECFR_SEARCH: return !!ecfrQuery.trim();
        case Command.ACTIVE_RFPS: return !!samKeywords.trim() && !!samApiKey.trim();
        case Command.RFP_NOTICES: return !!frNoticesTerm.trim();
        case Command.RULEMAKING_DOCUMENTS: return !!regulationsTerm.trim() && !!regulationsApiKey.trim();
        case Command.FULL_OPPORTUNITY_ANALYSIS: return !!samKeywords.trim() && !!samApiKey.trim() && filesReady;
        case Command.SEARCH: return true; // Allows initial trigger
        default: return filesReady;
    }
  };

  const TabButton = ({ command }: { command: Command }) => (
    <button
      onClick={() => { setActiveTab(command); setResult(''); }}
      className={`px-3 py-2 text-xs md:text-sm font-medium rounded-t-lg transition-colors focus:outline-none flex-shrink-0 ${activeTab === command ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'}`}
    >
      {command.substring(1).replace(/_/g, ' ').toUpperCase()}
    </button>
  );

  const FileInput = ({ type }: { type: DocumentType }) => (
    <div className="mt-2">
      <label className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md cursor-pointer transition-colors text-sm w-full">
        <DocumentArrowUpIcon className="h-5 w-5 flex-shrink-0" />
        <span className="truncate flex-grow">{files.find(f => f.type === type)?.name || `Upload ${type}`}</span>
        <input type="file" accept=".txt,.pdf,.docx,.md" className="hidden" onChange={(e) => handleFileChange(e, type)} />
      </label>
    </div>
  );

  const renderTabContent = () => {
    const config = PROMPT_CONFIG[activeTab];
    if (!config) return null;
    
    return (
      <div className="bg-gray-800 p-6 rounded-b-lg rounded-r-lg flex-1 flex flex-col min-h-0">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-indigo-400">{config.description}</h2>
          <p className="text-sm text-gray-400 mt-1">{config.instruction}</p>
        </div>
        
        <div className="space-y-4 mb-4">
            {activeTab === Command.SEARCH && result.startsWith('AWAIT_INPUT:') && (
                <textarea value={searchParams} onChange={(e) => setSearchParams(e.target.value)} placeholder="e.g., janitorial services, due in next 60 days" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" rows={3}/>
            )}
            {activeTab === Command.ECFR_SEARCH && (
                <>
                    <input value={ecfrQuery} onChange={(e) => setEcfrQuery(e.target.value)} placeholder="e.g., 'data privacy' or 'FAR 52.212-4'" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    <input value={ecfrAgencies} onChange={(e) => setEcfrAgencies(e.target.value)} placeholder="Agency slugs (optional, comma-separated)" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </>
            )}
            {(activeTab === Command.ACTIVE_RFPS || activeTab === Command.FULL_OPPORTUNITY_ANALYSIS) && (
                <>
                    <input value={samKeywords} onChange={(e) => setSamKeywords(e.target.value)} placeholder="Keywords (e.g., 'IT services')" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    <input type="password" value={samApiKey} onChange={(e) => setSamApiKey(e.target.value)} placeholder="SAM.gov API Key" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </>
            )}
            {activeTab === Command.RFP_NOTICES && (
                <input value={frNoticesTerm} onChange={(e) => setFrNoticesTerm(e.target.value)} placeholder="Search term for notices (e.g., 'cybersecurity')" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            )}
            {activeTab === Command.RULEMAKING_DOCUMENTS && (
                 <>
                    <input value={regulationsTerm} onChange={(e) => setRegulationsTerm(e.target.value)} placeholder="Search term for documents" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    <input type="password" value={regulationsApiKey} onChange={(e) => setRegulationsApiKey(e.target.value)} placeholder="Regulations.gov API Key" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </>
            )}
        </div>

        {config.requiredFiles.length > 0 && (
          <div className="mb-4">
            <h3 className="text-md font-medium text-gray-300 mb-2">Required Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.requiredFiles.map(type => <FileInput key={type} type={type} />)}
            </div>
          </div>
        )}

        <div className="mt-auto">
          <button 
            onClick={handleExecute} 
            disabled={isLoading || !isReadyForExecution()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            <CommandLineIcon className="h-5 w-5" />
            Execute {activeTab.substring(1).replace(/_/g, ' ')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 p-4 bg-gray-900">
      {/* Left Panel: Controls */}
      <div className="flex flex-col md:w-1/2 lg:w-2/5">
        <div className="flex flex-nowrap overflow-x-auto border-b border-gray-700">
            {Object.values(Command).map(cmd => <TabButton key={cmd} command={cmd}/>)}
        </div>
        {renderTabContent()}

        {files.length > 0 && (
          <div className="bg-gray-800 p-4 rounded-lg mt-4">
            <h3 className="text-md font-medium text-gray-300 mb-3">Uploaded Files</h3>
            <div className="flex flex-wrap gap-2">
              {files.map(file => (
                <div key={file.id} className="flex items-center bg-indigo-500/20 text-indigo-300 text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full">
                  {file.name} ({file.type})
                  <button onClick={() => removeFile(file.id)} className="ml-2 text-indigo-300 hover:text-white rounded-full hover:bg-indigo-500/30 p-0.5">
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Results */}
      <div className="flex-1 flex flex-col bg-gray-800 rounded-lg min-h-0">
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="flex items-center space-x-2 text-gray-400">
                <div className="h-3 w-3 bg-indigo-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="h-3 w-3 bg-indigo-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="h-3 w-3 bg-indigo-400 rounded-full animate-pulse"></div>
                <span>Processing...</span>
              </div>
            </div>
          ) : result ? (
             <pre className="text-white whitespace-pre-wrap font-sans text-sm leading-relaxed">{result.startsWith('AWAIT_INPUT:') ? result.substring(12) : result}</pre>
          ) : (
            <div className="flex justify-center items-center h-full text-gray-500">
              <p>Results will be displayed here.</p>
            </div>
          )}
          <div ref={resultEndRef} />
        </div>
      </div>
    </div>
  );
};

export default CommandInterface;