import React, { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

// Define the shape of our Tag object for TypeScript
export interface Tag {
  id: string;
  name: string;
}

interface TagManagerProps {
  allTags: Tag[]; // All tags available to the artist
  selectedTags: Tag[]; // Tags currently applied to the contact
  onSelectedTagsChange: (tags: Tag[]) => void; // Callback to update the parent's state
  onTagCreate: (tagName: string) => Promise<Tag | null>; // Callback to create a new tag in the DB
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
      (tag) => !selectedTags.some((selected) => selected.id === tag.id)
    );

    const handleRemoveTag = (tagIdToRemove: string) => {
        onSelectedTagsChange(selectedTags.filter((tag) => tag.id !== tagIdToRemove));
    };

    const handleAddTag = async (tagOrTagName: Tag | string) => {
      let tagToAdd: Tag | null = null;

      if (typeof tagOrTagName === 'string') {
        const existingTag = allTags.find(t => t.name.toLowerCase() === tagOrTagName.toLowerCase());
        if (existingTag) {
          tagToAdd = existingTag;
        } else {
          // Create a new tag
          setIsLoading(true);
          const createdTag = await onTagCreate(tagOrTagName);
          setIsLoading(false);
          tagToAdd = createdTag;
        }
      } else {
        tagToAdd = tagOrTagName;
      }

      if (tagToAdd && !selectedTags.some((selected) => selected.id === tagToAdd!.id)) {
        onSelectedTagsChange([...selectedTags, tagToAdd]);
        setInputValue('');
      } else if (tagToAdd) {
        toast.error(`Tag "${tagToAdd.name}" already added.`);
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
            <label className="label">Tags</label>
            <div className="selected-tags-container">
                {selectedTags.map((tag) => (
                    <span key={tag.id} className="tag-pill">
                        {tag.name}
                        <button type="button" onClick={() => handleRemoveTag(tag.id)} className="tag-remove-button">
                            <X size={14} />
                        </button>
                    </span>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                  type="text"
                  list="tags-datalist"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a tag..."
                  className="input flex-grow"
              />
              <button
                type="button"
                className="button button-secondary"
                onClick={() => handleAddTag(inputValue.trim())}
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? 'Creating...' : 'Add'}
              </button>
              <datalist id="tags-datalist">
                  {availableTags.map((tag) => (
                      <option key={tag.id} value={tag.name} />
                  ))}
              </datalist>
            </div>
        </div>
    );
};

export default TagManager;