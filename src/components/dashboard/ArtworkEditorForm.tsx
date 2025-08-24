// src/components/dashboard/ArtworkEditorForm.tsx

import React, { useState, useEffect } from 'react';
import { Database, Json } from '@/types/database.types';

type Artwork = Database['public']['Tables']['artworks']['Row'];
type ArtworkUpdate = Partial<Omit<Artwork, 'id' | 'user_id' | 'created_at'>>;

interface ArtworkEditorFormProps {
    artwork: Artwork | null;
    onSave: (formData: ArtworkUpdate) => void;
    isLoading: boolean;
}

const ArtworkEditorForm: React.FC<ArtworkEditorFormProps> = ({ artwork, onSave, isLoading }) => {
    const [formData, setFormData] = useState<ArtworkUpdate>({});

    useEffect(() => {
        if (artwork) {
            setFormData(artwork);
        }
    }, [artwork]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleJsonChange = (field: keyof ArtworkUpdate) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [field]: {
                ...(typeof prev[field] === 'object' ? prev[field] : {}),
                [name]: value,
            },
        }));
    };
    
    const handleJsonCheckboxChange = (field: keyof ArtworkUpdate) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [field]: {
                 ...(typeof prev[field] === 'object' ? prev[field] : {}),
                [name]: checked,
            },
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    // FIX: The entire component's JSX is wrapped in a single <form> element.
    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
                <label htmlFor="title">Title</label>
                <input
                    id="title"
                    name="title"
                    className="input"
                    value={formData.title || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., Sunset Over the Bay"
                />
            </div>

            <div>
                <label htmlFor="description">Description</label>
                <textarea
                    id="description"
                    name="description"
                    className="input"
                    value={formData.description || ''}
                    onChange={handleInputChange}
                    rows={5}
                />
            </div>
            
            <div>
                <label htmlFor="price">Price (ZAR)</label>
                <input
                    id="price"
                    name="price"
                    type="number"
                    className="input"
                    value={formData.price || ''}
                    onChange={handleInputChange}
                />
            </div>
            
            <div>
                 <label>
                    <input
                        type="checkbox"
                        id="is_price_negotiable"
                        name="is_price_negotiable"
                        checked={!!formData.is_price_negotiable} // Coerces null/undefined to false
                        onChange={handleCheckboxChange}
                    />
                    Price is negotiable
                </label>
            </div>

            <div>
                <label>Date Information</label>
                <input
                    name="year"
                    placeholder="Year"
                    className="input"
                    value={(formData.date_info as any)?.year || ''} // Safely access nested property
                    onChange={handleJsonChange('date_info')}
                />
                 <input
                    name="month"
                    placeholder="Month"
                    className="input"
                    value={(formData.date_info as any)?.month || ''} // Safely access nested property
                    onChange={handleJsonChange('date_info')}
                />
            </div>
            
             <div>
                <label>
                    <input
                        type="checkbox"
                        name="is_edition"
                        checked={!!(formData.edition_info as any)?.is_edition} // Safely access nested property
                        onChange={handleJsonCheckboxChange('edition_info')}
                    />
                    This is part of an edition
                </label>
            </div>


            <button type="submit" className="button button-primary" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
        </form>
    );
};

export default ArtworkEditorForm;