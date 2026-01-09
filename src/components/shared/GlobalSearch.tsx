import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Building2, Home, Users, FileText, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'property' | 'tenant' | 'document' | 'page' | 'setting';
  url: string;
  icon?: React.ReactNode;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockSearchResults = (query: string): SearchResult[] => {
  if (!query) return [];

  const allResults: SearchResult[] = [
    // Properties
    { id: '1', title: 'Sunset Apartments', description: 'Property in San Francisco', type: 'property', url: '/landlord/properties', icon: <Building2 className="w-4 h-4" /> },
    { id: '2', title: 'Oak Street Condos', description: 'Luxury condos downtown', type: 'property', url: '/landlord/properties', icon: <Building2 className="w-4 h-4" /> },
    
    // Tenants
    { id: '3', title: 'Sarah Johnson', description: 'Unit 4A - Rent current', type: 'tenant', url: '/landlord/units', icon: <Users className="w-4 h-4" /> },
    { id: '4', title: 'John Smith', description: 'Unit 2B - Rent overdue', type: 'tenant', url: '/landlord/units', icon: <Users className="w-4 h-4" /> },
    
    // Pages
    { id: '5', title: 'Rent Collection', description: 'View rent payments', type: 'page', url: '/landlord/rent-collection', icon: <Home className="w-4 h-4" /> },
    { id: '6', title: 'Maintenance Requests', description: 'Track maintenance', type: 'page', url: '/landlord/maintenance', icon: <Home className="w-4 h-4" /> },
    { id: '7', title: 'Reports', description: 'Financial reports', type: 'page', url: '/landlord/reports', icon: <FileText className="w-4 h-4" /> },
    { id: '8', title: 'Settings', description: 'Account settings', type: 'setting', url: '/settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const lowerQuery = query.toLowerCase();
  return allResults.filter(result => 
    result.title.toLowerCase().includes(lowerQuery) ||
    result.description.toLowerCase().includes(lowerQuery)
  );
};

export const GlobalSearch = ({ open, onOpenChange }: GlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      // TODO: Replace with actual API call
      const searchResults = mockSearchResults(query);
      setResults(searchResults);
      setIsSearching(false);
      setSelectedIndex(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  }, [results, selectedIndex, onOpenChange]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    onOpenChange(false);
    setQuery('');
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'property': return 'text-blue-500';
      case 'tenant': return 'text-green-500';
      case 'document': return 'text-purple-500';
      case 'page': return 'text-orange-500';
      case 'setting': return 'text-gray-500';
      default: return 'text-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search properties, tenants, documents..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {isSearching && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          {query && !isSearching && (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query && results.length === 0 && !isSearching && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No results found for "{query}"</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                    index === selectedIndex 
                      ? 'bg-accent text-accent-foreground' 
                      : 'hover:bg-secondary'
                  )}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className={cn('flex-shrink-0', getTypeColor(result.type))}>
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {result.title}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {result.description}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {result.type}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!query && (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                Start typing to search across your properties, tenants, and documents
              </p>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <kbd className="px-2 py-1 bg-secondary rounded border border-border">↑↓</kbd>
                <span>Navigate</span>
                <kbd className="px-2 py-1 bg-secondary rounded border border-border">Enter</kbd>
                <span>Select</span>
                <kbd className="px-2 py-1 bg-secondary rounded border border-border">Esc</kbd>
                <span>Close</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Hook to handle global search keyboard shortcut
 */
export const useGlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
};
