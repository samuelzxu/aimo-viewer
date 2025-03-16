'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface Message {
  role: string;
  content: string;
}

interface ChatMessage {
  role?: unknown;
  content?: unknown;
}

interface ChatConversation {
  messages: Message[];
}

interface LLMEval {
  uuid: string;
  exec_time: string;
  runtime_s: number;
  p_id: string;
  run_name: string;
  prediction: number;
  label: number;
  extracted_answers: number[];
  reasoning: string;
}

// Function to extract boxed answers from text
function extractBoxedAnswers(text: string): string[] {
  const boxedRegex = /\\boxed\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  const matches = [...text.matchAll(boxedRegex)];
  return matches.map(match => match[1]);
}

// Function to process text and render LaTeX
function renderTextWithLatex(text: string) {
  // First split by display math
  // Matches \\\[, \\\], \(, \), and $,
  const displayMathRegex = /\\?\[([^]*?)\\?\]/g;
  const displayParts = text.split(displayMathRegex);
  
  return (
    <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
      {displayParts.map((part, index) => {
        // For display math parts (odd indices in the split)
        if (index % 2 === 1) {
          try {
            return (
              <div key={index} className="my-4 flex justify-center">
                <BlockMath>{part}</BlockMath>
              </div>
            );
          } catch (error) {
            console.error('LaTeX parsing error:', error);
            return <span key={index}>\[{part}\]</span>;
          }
        }
        
        // For regular text parts (even indices), first process \(...\) style
        const inlineParensRegex = /\\?\((.*?)\\?\)/g;
        const inlineParensParts = part.split(inlineParensRegex);
        
        return (
          <span key={index}>
            {inlineParensParts.map((parensPart, parensIndex) => {
              // Handle \(...\) parts
              if (parensIndex % 2 === 1) {
                try {
                  return <InlineMath key={`parens-${parensIndex}`}>{parensPart}</InlineMath>;
                } catch (error) {
                  console.error('LaTeX parsing error:', error);
                  return <span key={`parens-${parensIndex}`}>\({parensPart}\)</span>;
                }
              }
              
              // For non-\(...\) parts, process $...$ style
              const inlineDollarRegex = /\$(.*?)\$/g;
              const inlineDollarParts = parensPart.split(inlineDollarRegex);
              
              return (
                <span key={`parens-${parensIndex}`}>
                  {inlineDollarParts.map((dollarPart, dollarIndex) => {
                    if (dollarIndex % 2 === 0) {
                      return <span key={`dollar-${dollarIndex}`}>{dollarPart}</span>;
                    } else {
                      try {
                        return <InlineMath key={`dollar-${dollarIndex}`}>{dollarPart}</InlineMath>;
                      } catch (error) {
                        console.error('LaTeX parsing error:', error);
                        return <span key={`dollar-${dollarIndex}`}>${dollarPart}$</span>;
                      }
                    }
                  })}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
}

export default function EvalDetail({ uuid }: { uuid: string }) {
  const router = useRouter();
  const [data, setData] = useState<LLMEval | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[][]>([]);
  const [loading, setLoading] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);
  const [expandedConvs, setExpandedConvs] = useState<Set<number>>(new Set());
  const [showRenderedText, setShowRenderedText] = useState<Set<string>>(new Set());
  const [conversationBoxedAnswers, setConversationBoxedAnswers] = useState<Map<number, string[]>>(new Map());

  const isChatMessage = (value: unknown): value is ChatMessage => {
    return typeof value === 'object' && value !== null && 'role' in value;
  };

  const toggleConversation = (index: number) => {
    const newExpanded = new Set(expandedConvs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedConvs(newExpanded);
  };

  const toggleRawText = (messageId: string) => {
    
    const newShowRenderedText = new Set(showRenderedText);
    if (newShowRenderedText.has(messageId)) {
      newShowRenderedText.delete(messageId);
    } else {
      newShowRenderedText.add(messageId);
    }
    setShowRenderedText(newShowRenderedText);
  };

  useEffect(() => {
    if (uuid) {
      fetchData();
    }
  }, [uuid]);

  useEffect(() => {
    // Extract boxed answers from each conversation
    const boxedAnswersMap = new Map<number, string[]>();
    
    conversations.forEach((conversation, convIndex) => {
      const allBoxedAnswers: string[] = [];
      
      conversation.forEach(chat => {
        chat.messages.forEach(message => {
          if (message.role === 'assistant') {
            const boxedAnswers = extractBoxedAnswers(message.content);
            allBoxedAnswers.push(...boxedAnswers);
          }
        });
      });
      
      if (allBoxedAnswers.length > 0) {
        boxedAnswersMap.set(convIndex, allBoxedAnswers);
      }
    });
    
    setConversationBoxedAnswers(boxedAnswersMap);
  }, [conversations]);

  const parseReasoning = (reasoning: string): ChatConversation[][] => {
    try {
      // First, try to fix common JSON issues
    //   const cleanedReasoning = reasoning
    //     .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Ensure property names are double-quoted
    //     .replace(/'/g, '"') // Replace single quotes with double quotes
    //     .replace(/\n/g, '\\n'); // Properly escape newlines
      
    //   console.log('Cleaned reasoning:', cleanedReasoning);
      
      const parsed = JSON.parse(reasoning);
      console.log('Parsed data:', parsed);

      // Validate the structure
      if (!Array.isArray(parsed)) {
        console.warn('Parsed data is not an array, wrapping in array:', parsed);
        return [[{ messages: [] }]];
      }

      // Handle single conversation case
      if (!Array.isArray(parsed[0])) {
        if (parsed.every(isChatMessage)) {
          const messages = parsed.map((msg: ChatMessage) => ({
            role: String(msg?.role || 'unknown'),
            content: String(msg?.content || '')
          }));
          return [[{ messages }]];
        }
        return [[{ messages: [] }]];
      }

      // Handle multiple conversations case
      return parsed.map((conversation: unknown[]) => {
        // If it's a single message array
        if (conversation.length > 0 && isChatMessage(conversation[0])) {
          return [{
            messages: conversation.filter(isChatMessage).map((msg: ChatMessage) => ({
              role: String(msg?.role || 'unknown'),
              content: String(msg?.content || '')
            }))
          }];
        }

        // If it's an array of message arrays
        return conversation.map((chat: unknown) => ({
          messages: Array.isArray(chat) 
            ? chat.filter(isChatMessage).map((msg: ChatMessage) => ({
                role: String(msg?.role || 'unknown'),
                content: String(msg?.content || '')
              }))
            : []
        }));
      });
    } catch (e) {
      console.error('Error parsing reasoning:', e, '\nRaw reasoning:', reasoning);
      setParseError(e instanceof Error ? e.message : 'Unknown parsing error');
      return [];
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/db-viewer?action=getData&table=llm_evals&uuid=${uuid}`);
      const result = await response.json();
      const rawEvalData = result.rows[0]; // Since we're fetching by UUID, we'll only get one row
      
      if (rawEvalData) {
        // Process the data to ensure correct types
        const evalData = {
          ...rawEvalData,
          runtime_s: rawEvalData.runtime_s ? Number(rawEvalData.runtime_s) : 0,
          extracted_answers: Array.isArray(rawEvalData.extracted_answers) ? rawEvalData.extracted_answers : []
        };
        
        setData(evalData);
        
        if (evalData.reasoning) {
          console.log('Raw reasoning:', evalData.reasoning); // Debug log
          const parsedConversations = parseReasoning(evalData.reasoning);
          console.log('Parsed conversations:', parsedConversations); // Debug log
          setConversations(parsedConversations);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
        <div className="text-center text-slate-600 dark:text-slate-300">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
        <div className="text-center text-red-500">Evaluation not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/llm-evals')}
          className="mb-6 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 flex items-center gap-2"
        >
          ← Back to List
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-8">
          {parseError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-lg">
              Error parsing conversations: {parseError}
            </div>
          )}

          <h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">
            Evaluation Details
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">UUID</h2>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  defaultValue={data.uuid}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      router.push(`/llm-evals/${e.currentTarget.value}`);
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector('input');
                    if (input) {
                      router.push(`/llm-evals/${input.value}`);
                    }
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Resubmit
                </button>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Run Name</h2>
              <p className="text-slate-800 dark:text-slate-200">{data.run_name}</p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Execution Time</h2>
              <p className="text-slate-800 dark:text-slate-200">
                {new Date(data.exec_time).toLocaleString()}
              </p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Runtime (s)</h2>
              <p className="text-slate-800 dark:text-slate-200">
                {typeof data.runtime_s === 'number' ? data.runtime_s.toFixed(2) : '0.00'}
              </p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Prediction</h2>
              <p className="text-slate-800 dark:text-slate-200">{data.prediction}</p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Label</h2>
              <p className="text-slate-800 dark:text-slate-200">{data.label}</p>
            </div>
            <div className="md:col-span-2">
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Extracted Answers</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                {Array.from(data.extracted_answers.map((answer, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-300"
                    style={{
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {answer}
                  </span>
                )))}
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">
            Conversations
          </h2>
          
          <div className="space-y-4">
            {conversations.map((conversation, convIndex) => (
              <div 
                key={convIndex}
                className="bg-slate-50 dark:bg-slate-700/50 rounded-lg relative"
              >
                <button
                  onClick={() => toggleConversation(convIndex)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors rounded-lg sticky top-0 z-10 bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
                >
                  <div className="flex flex-row gap-2 items-start">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Conversation {convIndex + 1} ({Math.round(conversation[conversation.length - 1].messages.slice(-1)[0].content.length / 4)})
                    </h3>
                    {!expandedConvs.has(convIndex) && conversationBoxedAnswers.has(convIndex) && (
                        conversationBoxedAnswers.get(convIndex)?.map((answer, answerIndex) => (
                          <span
                            key={answerIndex}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-800/30 rounded-md text-xs text-blue-700 dark:text-blue-300 max-w-xs truncate"
                            title={answer}
                          >
                            {answer.length > 30 ? `${answer.substring(0, 30)}...` : answer}
                          </span>
                        ))
                    )}
                  </div>
                  <div className="text-slate-400 dark:text-slate-500">
                    {expandedConvs.has(convIndex) ? '−' : '+'}
                  </div>
                </button>
                
                {expandedConvs.has(convIndex) && (
                  <div className="px-4 pb-4 space-y-4">
                    {conversation.map((chat, chatIndex) => (
                      chat.messages.map((message, messageIndex) => (
                        <div
                          key={`${chatIndex}-${messageIndex}`}
                          className={`flex gap-4 ${
                            message.role === 'assistant' 
                              ? 'bg-blue-50 dark:bg-blue-900/20' 
                              : 'bg-gray-50 dark:bg-slate-600/20'
                          } rounded-lg p-4`}
                        >
                          <div className="flex-shrink-0">
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center
                              ${message.role === 'assistant'
                                ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200'
                                : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-200'
                              }
                            `}>
                              {message.role === 'assistant' ? 'A' : 'U'}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex gap-4 items-center mb-1">
                              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRawText(`${chatIndex}-${messageIndex}`);
                                }}
                                className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                              >
                                {showRenderedText.has(`${chatIndex}-${messageIndex}`) ? 'Show Raw' : 'Show Rendered'}
                              </button>
                            </div>
                            <div className="prose dark:prose-invert max-w-none">
                              <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                                {showRenderedText.has(`${chatIndex}-${messageIndex}`) ? (
                                  renderTextWithLatex(message.content)
                                ) : (
                                  <pre className="text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                                    {message.content}
                                  </pre>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 