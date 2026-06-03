'use client';

import { useState, useEffect } from 'react';
import { Search, Briefcase, X, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Position {
  id: number;
  title: string;
  description: string;
  requiredSkills: string[];
  experienceLevel: string;
  location: string;
  clientName: string;
  status: string;
}

interface PositionSearchProps {
  onSelect: (position: Position) => void;
  onClear: () => void;
}

export function PositionSearch({ onSelect, onClear }: PositionSearchProps) {
  const [query, setQuery] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  useEffect(() => {
    if (query.length >= 2) {
      searchPositions();
    } else {
      setPositions([]);
      setShowResults(false);
    }
  }, [query]);

  const searchPositions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/recruiter/positions?search=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPositions(data.filter((p: Position) => p.status === 'OPEN'));
        setShowResults(true);
      }
    } catch (error) {
      console.error('Failed to search positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (position: Position) => {
    setSelectedPosition(position);
    setQuery('');
    setShowResults(false);
    onSelect(position);
  };

  const handleClear = () => {
    setSelectedPosition(null);
    setQuery('');
    setShowResults(false);
    onClear();
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Auto-fill from Position (Optional)</label>
      
      {selectedPosition ? (
        <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">{selectedPosition.title}</span>
                <Badge variant="outline" className="text-xs">{selectedPosition.experienceLevel}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-green-700 dark:text-green-300">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedPosition.location}
                </span>
                <span>{selectedPosition.clientName}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedPosition.requiredSkills.slice(0, 4).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {selectedPosition.requiredSkills.length > 4 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedPosition.requiredSkills.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
            >
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search job positions to auto-fill JD details..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-black dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          
          {showResults && positions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {positions.map((position) => (
                <button
                  key={position.id}
                  onClick={() => handleSelect(position)}
                  className="w-full p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b dark:border-zinc-800 last:border-b-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{position.title}</span>
                    <Badge variant="outline" className="text-xs">{position.experienceLevel}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {position.location}
                    </span>
                    <span>{position.clientName}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {position.requiredSkills.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {position.requiredSkills.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{position.requiredSkills.length - 3} more
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {showResults && positions.length === 0 && !loading && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg shadow-lg p-4 text-center text-zinc-500">
              No open positions found
            </div>
          )}
        </div>
      )}
      
      <p className="text-sm text-zinc-500">
        Select a position to auto-fill JD title, description, focus areas, and recommended interview mode
      </p>
    </div>
  );
}