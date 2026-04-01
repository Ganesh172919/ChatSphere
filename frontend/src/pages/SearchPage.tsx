import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  BookmarkPlus,
  FileText,
  Filter,
  MessageSquare,
  Pin,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import {
  searchMessages,
  searchConversations,
  type ConversationSearchResult,
  type SearchResult,
} from '../api/search';

const RECENT_SEARCHES_KEY = 'chatsphere-recent-searches';
const SAVED_SEARCHES_KEY = 'chatsphere-saved-searches';

type SavedSearch = {
  label: string;
  q: string;
  startDate: string;
  endDate: string;
  isAI: boolean;
  isPinned: boolean;
  hasFile: boolean;
  fileType: string;
};

type SearchDraft = Omit<SavedSearch, 'label'>;

function readStoredArray<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [conversationResults, setConversationResults] = useState<ConversationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isAIOnly, setIsAIOnly] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [hasFileOnly, setHasFileOnly] = useState(false);
  const [fileType, setFileType] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readStoredArray<string>(RECENT_SEARCHES_KEY));
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => readStoredArray<SavedSearch>(SAVED_SEARCHES_KEY));

  useEffect(() => {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(savedSearches));
  }, [savedSearches]);

  const buildDraft = useCallback((): SearchDraft => ({
    q: query.trim(),
    startDate,
    endDate,
    isAI: isAIOnly,
    isPinned: pinnedOnly,
    hasFile: hasFileOnly,
    fileType,
  }), [query, startDate, endDate, isAIOnly, pinnedOnly, hasFileOnly, fileType]);

  const pushRecentSearch = useCallback((nextQuery: string) => {
    if (!nextQuery) {
      return;
    }

    setRecentSearches((prev) => [nextQuery, ...prev.filter((item) => item !== nextQuery)].slice(0, 6));
  }, []);

  const runSearch = useCallback(async (draft: SearchDraft, searchPage = 1) => {
    if (!draft.q) {
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const [messageData, conversationData] = await Promise.all([
        searchMessages({
          q: draft.q,
          page: searchPage,
          limit: 20,
          ...(draft.startDate && { startDate: draft.startDate }),
          ...(draft.endDate && { endDate: draft.endDate }),
          ...(draft.isAI && { isAI: 'true' }),
          ...(draft.isPinned && { isPinned: 'true' }),
          ...(draft.hasFile && { hasFile: 'true' }),
          ...(draft.fileType && { fileType: draft.fileType }),
        }),
        searchConversations(draft.q, 1, 5),
      ]);

      setResults(messageData.results);
      setTotal(messageData.total);
      setPage(messageData.page);
      setTotalPages(messageData.totalPages);
      setConversationResults(conversationData.results);
      pushRecentSearch(draft.q);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [pushRecentSearch]);

  const doSearch = useCallback((searchPage = 1) => {
    void runSearch(buildDraft(), searchPage);
  }, [buildDraft, runSearch]);

  const applySavedSearch = (saved: SavedSearch) => {
    setQuery(saved.q);
    setStartDate(saved.startDate);
    setEndDate(saved.endDate);
    setIsAIOnly(saved.isAI);
    setPinnedOnly(saved.isPinned);
    setHasFileOnly(saved.hasFile);
    setFileType(saved.fileType);
    void runSearch({
      q: saved.q,
      startDate: saved.startDate,
      endDate: saved.endDate,
      isAI: saved.isAI,
      isPinned: saved.isPinned,
      hasFile: saved.hasFile,
      fileType: saved.fileType,
    }, 1);
  };

  const saveCurrentSearch = () => {
    const draft = buildDraft();
    if (!draft.q) {
      toast.error('Enter a search first');
      return;
    }

    const label = draft.q.length > 24 ? `${draft.q.slice(0, 24)}...` : draft.q;
    const savedSearch: SavedSearch = { label, ...draft };
    setSavedSearches((prev) => [savedSearch, ...prev.filter((item) => item.label !== label)].slice(0, 8));
    toast.success('Search saved');
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setIsAIOnly(false);
    setPinnedOnly(false);
    setHasFileOnly(false);
    setFileType('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch(1);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const highlightQuery = (text: string) => {
    if (!query.trim()) return text;
    const words = query.trim().split(/\s+/);
    const regex = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      part.match(regex) ? (
        <mark key={index} className="bg-neon-purple/30 text-white rounded px-0.5">{part}</mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  const formatDate = (ts: string) => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasActiveFilters = Boolean(startDate || endDate || isAIOnly || pinnedOnly || hasFileOnly || fileType);

  return (
    <div className="min-h-screen bg-navy-900">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors mb-4">
            Back to Dashboard
          </Link>
          <h1 className="font-display font-bold text-3xl text-white">Search Messages</h1>
          <p className="text-gray-500 text-sm mt-1">Search room messages and solo AI conversations from one place.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search messages, rooms, and conversations..."
              autoFocus
              className="w-full pl-12 pr-36 py-4 rounded-2xl bg-navy-800 border border-navy-700/50 text-white text-lg placeholder-gray-600 focus:border-neon-purple/50 transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-all ${showFilters ? 'bg-neon-purple/20 text-neon-purple' : 'text-gray-500 hover:text-white hover:bg-navy-700'}`}
                aria-label="Toggle filters"
              >
                <Filter size={16} />
              </button>
              <button
                onClick={saveCurrentSearch}
                disabled={!query.trim()}
                className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl text-xs bg-navy-700/70 text-gray-300 hover:text-white transition-colors disabled:opacity-30"
              >
                <BookmarkPlus size={14} />
                Save
              </button>
              <button
                onClick={() => doSearch(1)}
                disabled={!query.trim() || loading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-30"
              >
                {loading ? '...' : 'Search'}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-navy-800/60 border border-navy-700/30 p-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-500" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-navy-700 border border-navy-600/50 text-white text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-navy-700 border border-navy-600/50 text-white text-sm"
                    />
                  </div>
                  <button
                    onClick={() => setIsAIOnly((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${isAIOnly ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' : 'bg-navy-700 text-gray-400'}`}
                  >
                    AI messages
                  </button>
                  <button
                    onClick={() => setPinnedOnly((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${pinnedOnly ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' : 'bg-navy-700 text-gray-400'}`}
                  >
                    Pinned only
                  </button>
                  <button
                    onClick={() => setHasFileOnly((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${hasFileOnly ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' : 'bg-navy-700 text-gray-400'}`}
                  >
                    Attachments only
                  </button>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-navy-700 border border-navy-600/50 text-white text-sm"
                  >
                    <option value="">All file types</option>
                    <option value="image/jpeg">JPEG images</option>
                    <option value="image/png">PNG images</option>
                    <option value="image/webp">WEBP images</option>
                    <option value="image/gif">GIF images</option>
                    <option value="application/pdf">PDF files</option>
                    <option value="text/plain">Text files</option>
                  </select>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      <X size={12} />
                      Clear filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(recentSearches.length > 0 || savedSearches.length > 0) && (
            <div className="space-y-3">
              {recentSearches.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-gray-600">Recent searches</p>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setQuery(item);
                          void runSearch({ ...buildDraft(), q: item }, 1);
                        }}
                        className="rounded-full border border-navy-700/40 bg-navy-800/60 px-3 py-1 text-xs text-gray-300 hover:text-white transition-colors"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {savedSearches.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-gray-600">Saved searches</p>
                  <div className="flex flex-wrap gap-2">
                    {savedSearches.map((saved) => (
                      <button
                        key={`${saved.label}-${saved.q}`}
                        onClick={() => applySavedSearch(saved)}
                        className="rounded-full border border-neon-purple/20 bg-neon-purple/10 px-3 py-1 text-xs text-neon-purple hover:text-purple-200 transition-colors"
                      >
                        {saved.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-24 rounded-xl bg-navy-800 animate-pulse border border-navy-700/30" />
            ))}
          </div>
        ) : hasSearched ? (
          <div className="space-y-8">
            {conversationResults.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-neon-purple" />
                  <h2 className="text-sm font-semibold text-white">Solo Conversations</h2>
                  <span className="text-xs text-gray-500">{conversationResults.length} matches</span>
                </div>
                <div className="space-y-2">
                  {conversationResults.map((conversation) => (
                    <div key={conversation.id} className="rounded-xl border border-navy-700/40 bg-navy-800/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-medium text-white">{conversation.title}</h3>
                          <p className="text-[11px] text-gray-500">
                            {conversation.messageCount} messages · Updated {formatDate(conversation.updatedAt)}
                          </p>
                        </div>
                        <Link
                          to="/chat"
                          className="text-xs text-neon-blue hover:text-blue-300 transition-colors"
                        >
                          Open chat
                        </Link>
                      </div>
                      <div className="mt-3 space-y-2">
                        {conversation.matchingSnippets.map((snippet, index) => (
                          <div key={`${conversation.id}-${index}`} className="rounded-lg bg-navy-900/50 px-3 py-2 text-xs text-gray-400">
                            <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-600">{snippet.role}</p>
                            <p>{highlightQuery(snippet.content)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-neon-blue" />
                <h2 className="text-sm font-semibold text-white">Room Messages</h2>
                <span className="text-xs text-gray-500">
                  {total > 0 ? `${total} result${total !== 1 ? 's' : ''}` : 'No message matches'}
                </span>
              </div>

              {results.length === 0 ? (
                <div className="rounded-xl border border-navy-700/40 bg-navy-800/40 p-6 text-sm text-gray-500">
                  No room messages matched this search.
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="rounded-xl border border-navy-700/50 bg-navy-800/60 p-4 hover:border-navy-600/80 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${result.isAI ? 'bg-gradient-to-br from-neon-purple to-neon-blue' : 'bg-navy-700'}`}>
                          {result.isAI ? (
                            <Sparkles size={14} className="text-white" />
                          ) : (
                            <MessageSquare size={14} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-semibold ${result.isAI ? 'text-neon-purple' : 'text-gray-300'}`}>
                              {result.username}
                            </span>
                            {result.roomName && (
                              <Link to={`/group/${result.roomId}`} className="text-[10px] text-neon-blue hover:underline">
                                #{result.roomName}
                              </Link>
                            )}
                            {result.isPinned && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-neon-purple">
                                <Pin size={10} />
                                Pinned
                              </span>
                            )}
                            {result.fileUrl && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                <FileText size={10} />
                                {result.fileName || result.fileType || 'Attachment'}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-600">{formatDate(result.timestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
                            {highlightQuery(result.content)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => doSearch(page - 1)}
                    disabled={page <= 1}
                    className="px-4 py-2 rounded-lg bg-navy-800 border border-navy-700/50 text-gray-400 hover:text-white disabled:opacity-30 transition-all text-sm"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => doSearch(page + 1)}
                    disabled={page >= totalPages}
                    className="px-4 py-2 rounded-lg bg-navy-800 border border-navy-700/50 text-gray-400 hover:text-white disabled:opacity-30 transition-all text-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-20"
          >
            <Search size={48} className="text-navy-600 mx-auto mb-4" />
            <h2 className="font-display font-bold text-xl text-white mb-2">Search your chat history</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Search room messages, find solo AI conversations, and save the filters you use most often.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
