/**
 * SearchResultItem Component
 * CRO-300: Search Functionality in Top Bar
 */

import { SearchableItem } from '@/lib/search/fuseConfig';
import { FileText, Users, User, FolderOpen, Edit } from 'lucide-react';

interface SearchResultItemProps {
  item: SearchableItem;
  query: string;
  onClick: () => void;
}

export function SearchResultItem({
  item,
  query,
  onClick,
}: SearchResultItemProps) {
  const getIcon = () => {
    switch (item.type) {
      case 'update':
        return <FileText className="h-4 w-4" />;
      case 'child':
        return <User className="h-4 w-4" />;
      case 'recipient':
        return <Users className="h-4 w-4" />;
      case 'group':
        return <FolderOpen className="h-4 w-4" />;
      case 'draft':
        return <Edit className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTitle = () => {
    return item.title || item.name || 'Untitled';
  };

  const getSubtitle = () => {
    if (item.email) return item.email;
    if (item.content) {
      // Truncate content to 80 characters
      return item.content.length > 80
        ? `${item.content.substring(0, 80)}...`
        : item.content;
    }
    return '';
  };

  const highlightText = (text: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const title = getTitle();
  const subtitle = getSubtitle();

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 focus:outline-none"
    >
      <div className="mt-0.5 text-gray-500 dark:text-gray-400">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {highlightText(title)}
        </div>
        {subtitle && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {highlightText(subtitle)}
          </div>
        )}
      </div>
    </button>
  );
}
