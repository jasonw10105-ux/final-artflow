// src/components/dashboard/ArtworkEditorForm.tsx
// ... imports ...
import { Database, Json } from '@/types/database.types';
type Artwork = Database['public']['Tables']['artworks']['Row'];

// ... inside your component
// FIX: Coerce potential null/undefined values to a strict boolean
<input
    type="checkbox"
    id="is_price_negotiable"
    name="is_price_negotiable"
    checked={!!formData.is_price_negotiable}
    onChange={handleCheckboxChange}
/>

// ... later in the component ...
// FIX: Safely access potentially null JSON fields by providing a fallback value
<input
    name="year"
    value={(formData.date_info as any)?.year || ''}
    onChange={handleJsonChange('date_info')}
/>
<input
    name="month"
    value={(formData.date_info as any)?.month || ''}
    onChange={handleJsonChange('date_info')}
/>

// FIX: Safely access and check properties on a JSON field
<input
    type="checkbox"
    name="is_edition"
    checked={!!(formData.edition_info as any)?.is_edition}
    onChange={handleJsonCheckboxChange('edition_info')}
/>