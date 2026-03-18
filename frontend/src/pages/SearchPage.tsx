import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, MessageSquare, Sparkles, Calendar, Filter, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import { searchMessages } from '../api/search';
import type { SearchResult } from '../api/search';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const doSearch = useCallback(async (searchPage = 1) => {
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await searchMessages({
        q: query.trim(),
        page: searchPage,
        limit: 20,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      setResults(data.results);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, startDate, endDate]);

  // Keyboard shortcut: Enter to search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch(1);
    }
  };

  // Global Ctrl+/ shortcut
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
    const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-neon-purple/30 text-white rounded px-0.5">{part}</mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const formatDate = (ts: string) => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors mb-4">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 className="font-display font-bold text-3xl text-white">Search Messages</h1>
          <p className="text-gray-500 text-sm mt-1">Find anything across all your conversations and rooms</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search messages by keywords..."
              autoFocus
              className="w-full pl-12 pr-24 py-4 rounded-2xl bg-navy-800 border border-navy-700/50 text-white text-lg placeholder-gray-600 focus:border-neon-purple/50 transition-colors"
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
                onClick={() => doSearch(1)}
                disabled={!query.trim() || loading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-30"
              >
                {loading ? '...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-4 mt-4 p-4 rounded-xl bg-navy-800/60 border border-navy-700/30">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-500" />
                    <label className="text-xs text-gray-500">From:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-navy-700 border border-navy-600/50 text-white text-sm focus:border-neon-purple/50 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">To:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-navy-700 border border-navy-600/50 text-white text-sm focus:border-neon-purple/50 transition-colors"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      <X size={12} /> Clear dates
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-navy-800 animate-pulse border border-navy-700/30" />
            ))}
          </div>
        ) : hasSearched ? (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {total > 0 ? (
                <>Found <span className="text-white font-medium">{total}</span> result{total !== 1 ? 's' : ''}</>
              ) : (
                'No messages found matching your search'
              )}
            </p>

            <div className="space-y-2">
              <AnimatePresence>
                {results.map((result, i) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 rounded-xl bg-navy-800/60 border border-navy-700/50 hover:border-navy-600/80 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        result.isAI
                          ? 'bg-gradient-to-br from-neon-purple to-neon-blue'
                          : 'bg-navy-700'
                      }`}>
                        {result.isAI ? (
                          <Sparkles size={14} className="text-white" />
                        ) : (
                          <MessageSquare size={14} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold ${result.isAI ? 'text-neon-purple' : 'text-gray-300'}`}>
                            {result.username}
                          </span>
                          {result.roomName && (
                            <Link
                              to={`/group/${result.roomId}`}
                              className="text-[10px] text-neon-blue hover:underline"
                            >
                              #{result.roomName}
                            </Link>
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
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => doSearch(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg bg-navy-800 border border-navy-700/50 text-gray-400 hover:text-white disabled:opacity-30 transition-all text-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => doSearch(page + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg bg-navy-800 border border-navy-700/50 text-gray-400 hover:text-white disabled:opacity-30 transition-all text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
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
              Find messages by keywords, filter by date range, and navigate directly to conversations.
            </p>
            <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-600">
              <kbd className="px-1.5 py-0.5 rounded bg-navy-700 text-gray-500 text-[10px] font-mono border border-navy-600">Ctrl+/</kbd>
              <span>Focus search from anywhere</span>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
