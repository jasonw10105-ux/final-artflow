// src/components/dashboard/TextTagManager.tsx

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TagRow } from '@/types/app.types'; // UPDATED: Import TagRow

// Define the shape of our Tag object for TypeScript
export interface Tag extends TagRow {} // Extend TagRow for full properties

interface TagManagerProps {
  allTags: TagRow[]; // All tags available to the artist // UPDATED: Tag[] to TagRow[]
  selectedTags: TagRow[]; // Tags currently applied to the contact // UPDATED: Tag[] to TagRow[]
  onSelectedTagsChange: (tags: TagRow[]) => void; // Callback to update the parent's state // UPDATED: Tag[] to TagRow[]
  onTagCreate: (tagName: string) => Promise<TagRow | null>; // Callback to create a new tag in the DB // UPDATED: Tag to TagRow
}

const TagManager: React.FC<TagManagerProps> = ({ 
  allTags, 
  selectedTags, 
  onSelectedTagsChange,
  onTagCreate
}) => {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Filter out tags that are already selected
    const availableTags = allTags.filter(
      (tag: TagRow) => !selectedTags.some((selected) => selected.id === tag.id) // UPDATED: tag type
    );

    const handleRemoveTag = (tagIdToRemove: string) => {
        onSelectedTagsChange(selectedTags.filter((tag) => tag.id !== tagIdToRemove));
    };

    const handleAddTag = async (tagOrTagName: TagRow | string) => { // UPDATED: Tag to TagRow
      let tagToAdd: TagRow | null = null; // UPDATED: Tag to TagRow

      if (typeof tagOrTagName === 'string') {
        const existingTag = allTags.find(t => t.name.toLowerCase() === tagOrTagName.toLowerCase());
        if (existingTag) {
          tagToAdd = existingTag;
        } else {
          // Create a new tag
          setIsLoading(true);
          tagToAdd = await onTagCreate(tagOrTagName);
          setIsLoading(false);
        }
      } else {
        tagToAdd = tagOrTagName;
      }

      if (tagToAdd && !selectedTags.some((selected) => selected.id === tagToAdd!.id)) {
        onSelectedTagsChange([...selectedTags, tagToAdd]);
        setInputValue(''); // Clear input after adding
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim() !== '') {
        e.preventDefault();
        handleAddTag(inputValue.trim());
      }
    };

    return (
        <div className="tag-manager">
            <label>Tags</label>
            <div className="selected-tags-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minHeight: '40px' }}>
                {selectedTags.map((tag) => (
                    <span key={tag.id} className="tag-pill" style={{ display: 'flex', alignItems: 'center', background: 'var(--primary)', color: 'var(--primary-foreground)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem' }}>
                        {tag.name}
                        <button type="button" onClick={() => handleRemoveTag(tag.id)} style={{ background: 'none', border: 'none', color: 'inherit', marginLeft: '0.5rem', cursor: 'pointer', display: 'flex' }}>
                            <X size={14} />
                        </button>
                    </span>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                  type="text"
                  list="tags-datalist"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a tag..."
                  style={{ flexGrow: 1 }}
              />
              <button 
                type="button" 
                className="button-secondary" 
                onClick={() => handleAddTag(inputValue.trim())}
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? 'Creating...' : 'Add'}
              </button>
              <datalist id="tags-datalist">
                  {availableTags.map((tag: TagRow) => ( // UPDATED: tag type
                      <option key={tag.id} value={tag.name} />
                  ))}
              </datalist>
            </div>
        </div>
    );
};

export default TagManager;