'use client';

import { Sparkles, CheckCircle, AlertCircle, Edit3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AutoFillIndicatorProps {
  isActive: boolean;
  fieldsPopulated: string[];
  confidence?: 'high' | 'medium' | 'low';
  onManualEdit?: () => void;
  onRevert?: () => void;
  className?: string;
}

interface AutoFillFieldBadgeProps {
  field: string;
  isPopulated: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

const FIELD_LABELS: Record<string, string> = {
  engineerEmail: 'Email',
  engineerName: 'Name',
  jdTitle: 'Job Title',
  jdText: 'Job Description',
  focusAreas: 'Focus Areas',
  resumeSummary: 'Resume Summary',
  interviewMode: 'Interview Mode',
  customDurationMinutes: 'Duration'
};

const CONFIDENCE_COLORS = {
  high: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
  low: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
};

function AutoFillFieldBadge({ field, isPopulated, confidence = 'high' }: AutoFillFieldBadgeProps) {
  if (!isPopulated) return null;

  return (
    <Badge 
      variant="outline" 
      className={`text-xs ${CONFIDENCE_COLORS[confidence]} flex items-center gap-1`}
    >
      <Sparkles className="h-3 w-3" />
      {FIELD_LABELS[field] || field}
    </Badge>
  );
}

export function AutoFillIndicator({ 
  isActive, 
  fieldsPopulated, 
  confidence = 'high',
  onManualEdit,
  onRevert,
  className = '' 
}: AutoFillIndicatorProps) {
  if (!isActive || fieldsPopulated.length === 0) return null;

  const getConfidenceIcon = () => {
    switch (confidence) {
      case 'high':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
    }
  };

  const getConfidenceText = () => {
    switch (confidence) {
      case 'high':
        return 'High confidence auto-fill';
      case 'medium':
        return 'Medium confidence auto-fill';
      case 'low':
        return 'Low confidence auto-fill - please review';
    }
  };

  return (
    <Card className={`border-l-4 ${
      confidence === 'high' 
        ? 'border-l-green-500 bg-green-50 dark:bg-green-950/20' 
        : confidence === 'medium'
        ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
        : 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20'
    } ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getConfidenceIcon()}
              <span className="font-medium text-sm">{getConfidenceText()}</span>
            </div>
            
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              {fieldsPopulated.length} field{fieldsPopulated.length !== 1 ? 's' : ''} populated automatically. 
              Review and edit as needed.
            </p>
            
            <div className="flex flex-wrap gap-1">
              {fieldsPopulated.map((field) => (
                <AutoFillFieldBadge 
                  key={field} 
                  field={field} 
                  isPopulated={true} 
                  confidence={confidence}
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {onManualEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={onManualEdit}
                className="flex items-center gap-1"
              >
                <Edit3 className="h-3 w-3" />
                Edit
              </Button>
            )}
            
            {onRevert && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRevert}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear Auto-fill
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Field-level auto-fill indicator for individual inputs
interface FieldAutoFillIndicatorProps {
  isAutoFilled: boolean;
  confidence?: 'high' | 'medium' | 'low';
  className?: string;
}

export function FieldAutoFillIndicator({ 
  isAutoFilled, 
  confidence = 'high', 
  className = '' 
}: FieldAutoFillIndicatorProps) {
  if (!isAutoFilled) return null;

  return (
    <div className={`flex items-center gap-1 text-xs ${
      confidence === 'high' 
        ? 'text-green-600' 
        : confidence === 'medium'
        ? 'text-yellow-600'
        : 'text-orange-600'
    } ${className}`}>
      <Sparkles className="h-3 w-3" />
      <span>Auto-filled</span>
    </div>
  );
}