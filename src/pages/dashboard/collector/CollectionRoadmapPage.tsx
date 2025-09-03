// src/pages/dashboard/collector/CollectionRoadmapPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import toast from 'react-hot-toast';
import { Map, Target } from 'lucide-react';
import '@/styles/app.css';

interface Roadmap {
    id?: string;
    title: string;
    description?: string;
    budget_min?: number;
    budget_max?: number;
    target_mediums?: string[];
    target_styles?: string[];
}

const CollectionRoadmapPage = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [roadmap, setRoadmap] = useState<Roadmap>({ title: '' });
    
    const { data: existingRoadmap, isLoading } = useQuery<Roadmap, Error>({
        queryKey: ['collectionRoadmap', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.from('collection_roadmaps').select('*').eq('collector_id', user!.id).eq('is_active', true).single();
            if (error && error.code !== 'PGRST116') throw error;
            return data || { title: '' };
        },
        enabled: !!user,
    });

    useEffect(() => {
        if (existingRoadmap) {
            setRoadmap(existingRoadmap);
        }
    }, [existingRoadmap]);

    const upsertMutation = useMutation({
        mutationFn: async (updatedRoadmap: Roadmap) => {
            const payload = { ...updatedRoadmap, collector_id: user!.id, is_active: true };
            const { error } = await supabase.from('collection_roadmaps').upsert(payload, { onConflict: 'id' });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collectionRoadmap', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['browseArtworks'] }); // Invalidate recommendations
            toast.success("Collection roadmap saved!");
        },
        onError: (err: any) => toast.error(`Error: ${err.message}`)
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        upsertMutation.mutate(roadmap);
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setRoadmap(prev => ({ ...prev, [name]: value }));
    };
    
    const handleArrayChange = (name: 'target_mediums' | 'target_styles', value: string) => {
        setRoadmap(prev => ({ ...prev, [name]: value.split(',').map(s => s.trim()).filter(Boolean) }));
    };

    if (isLoading) return <div className="page-container"><p className="loading-message">Loading roadmap...</p></div>;

    return (
        <div className="page-container">
            <h1><Map size={28} className="inline-block mr-2" /> My Collection Roadmap</h1>
            <p className="page-subtitle">Define your collecting goals to receive hyper-personalized recommendations and alerts.</p>

            <form onSubmit={handleSave} className="form-card mt-8 max-w-3xl mx-auto">
                <div className="form-group">
                    <label htmlFor="title" className="label">Roadmap Title</label>
                    <input id="title" name="title" type="text" className="input" value={roadmap.title} onChange={handleInputChange} placeholder="e.g., 'Emerging South African Painters'" required />
                </div>
                <div className="form-group">
                    <label htmlFor="description" className="label">My Collection Thesis</label>
                    <textarea id="description" name="description" className="textarea" rows={4} value={roadmap.description || ''} onChange={handleInputChange} placeholder="Describe your collecting goals, e.g., 'Focus on large-scale abstract works that evoke a sense of calm.'"></textarea>
                </div>
                <div className="form-grid-2-col">
                    <div className="form-group">
                        <label htmlFor="budget_min" className="label">Budget Min ($)</label>
                        <input id="budget_min" name="budget_min" type="number" className="input" value={roadmap.budget_min || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="budget_max" className="label">Budget Max ($)</label>
                        <input id="budget_max" name="budget_max" type="number" className="input" value={roadmap.budget_max || ''} onChange={handleInputChange} />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="target_mediums" className="label">Target Mediums (comma-separated)</label>
                    <input id="target_mediums" name="target_mediums" type="text" className="input" value={roadmap.target_mediums?.join(', ') || ''} onChange={e => handleArrayChange('target_mediums', e.target.value)} placeholder="e.g., Oil on Canvas, Bronze Sculpture" />
                </div>
                 <div className="form-group">
                    <label htmlFor="target_styles" className="label">Target Styles (comma-separated)</label>
                    <input id="target_styles" name="target_styles" type="text" className="input" value={roadmap.target_styles?.join(', ') || ''} onChange={e => handleArrayChange('target_styles', e.target.value)} placeholder="e.g., Abstract, Figurative" />
                </div>
                <div className="form-actions">
                    <button type="submit" className="button button-primary" disabled={upsertMutation.isPending}>
                        {upsertMutation.isPending ? 'Saving...' : 'Save Roadmap'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CollectionRoadmapPage;