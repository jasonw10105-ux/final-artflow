import React, { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/ui/ImageUpload';
import { Trash2, Plus, Sun, Moon, Award, User, FileText } from 'lucide-react';
import { LocationJson, SocialLinkJson } from '@/types/database.types';
import '@/styles/app.css';

// --- TYPE DEFINITIONS ---
interface CoASettings {
    enabled: boolean;
    type: 'physical' | 'digital';
}

// --- PREVIEW COMPONENTS ---
const InvoicePreview = ({ artistName, logoUrl }: { artistName: string, logoUrl: string | null }) => (
    <div className="document-preview">
        <div className="preview-header">
            {logoUrl ? <img src={logoUrl} alt="Artist Logo" className="preview-logo" /> : <div className="logo-placeholder"></div>}
            <div className="preview-artist-info">
                <h4 className="font-bold">{artistName}</h4>
                <p>Artist Invoice</p>
            </div>
        </div>
        <h3 className="preview-title">INVOICE</h3>
        <div className="preview-body">
            <div className="preview-line-item"><span>'Artwork Title'</span><span>$2,500.00</span></div>
            <div className="preview-line-item total"><span>Total</span><span>$2,500.00</span></div>
        </div>
        <p className="preview-footer">Thank you for your purchase.</p>
    </div>
);

const CoAPreview = ({ artistName, logoUrl }: { artistName: string, logoUrl: string | null }) => (
     <div className="document-preview coa-preview">
        <div className="preview-header">
             {logoUrl ? <img src={logoUrl} alt="Artist Logo" className="preview-logo" /> : <div className="logo-placeholder"></div>}
             <h4 className="font-bold">{artistName}</h4>
        </div>
        <h3 className="preview-title coa-title">Certificate of Authenticity</h3>
        <div className="preview-body coa-body">
            <p>This document certifies that the artwork titled <strong>'Artwork Title'</strong> is an authentic, original piece by the undersigned artist.</p>
            <div className="coa-details-grid">
                <span><strong>Medium:</strong> Oil on Canvas</span>
                <span><strong>Dimensions:</strong> 24 x 36 in</span>
                <span><strong>Year:</strong> 2024</span>
            </div>
        </div>
        <div className="preview-footer coa-footer">
            <span>{artistName}</span>
            <span>{new Date().toLocaleDateString()}</span>
        </div>
    </div>
);

// --- MAIN SETTINGS PAGE ---
const ArtistSettingsPage = () => {
    const { user, profile, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'branding'>('profile');

    const [loading, setLoading] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [shortBio, setShortBio] = useState('');
    const [artistStatement, setArtistStatement] = useState('');
    const [socialLinks, setSocialLinks] = useState<SocialLinkJson[]>([]);
    
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    
    // --- NEW: States for Branding & Documents ---
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [coaSettings, setCoaSettings] = useState<CoASettings>({ enabled: false, type: 'physical' });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setLastName(profile.last_name || '');
            setDisplayName(profile.display_name || '');
            setShortBio(profile.short_bio || '');
            setArtistStatement(profile.artist_statement || '');
            setAvatarPreview(profile.avatar_url || null);
            setLogoPreview(profile.logo_url || null);

            if (Array.isArray(profile.social_links)) {
                setSocialLinks(profile.social_links as SocialLinkJson[]);
            }
            if (profile.coa_settings && typeof profile.coa_settings === 'object') {
                setCoaSettings(profile.coa_settings as CoASettings);
            }
        }
    }, [profile]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!displayName.trim()) newErrors.displayName = 'Display Name is required.';
        if (!firstName.trim()) newErrors.firstName = 'First Name is required.';
        if (!lastName.trim()) newErrors.lastName = 'Last Name is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAddSocialLink = () => setSocialLinks([...socialLinks, { platform: 'Website', url: '', details: '' }]);
    const handleRemoveSocialLink = (index: number) => setSocialLinks(socialLinks.filter((_, i) => i !== index));
    const handleSocialLinkChange = (index: number, field: keyof SocialLinkJson, value: string) => {
        const newLinks = socialLinks.map((link, i) => i === index ? { ...link, [field]: value } : link);
        setSocialLinks(newLinks);
    };

    const handleUpdateProfile = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !validateForm()) {
            toast.error('Please correct the errors in the form.');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Saving changes...');

        try {
            let avatarUrl = profile?.avatar_url;
            let logoUrl = profile?.logo_url;

            // Handle Avatar Upload
            if (avatarFile) {
                const filePath = `${user.id}/avatar-${Date.now()}`;
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true });
                if (uploadError) throw uploadError;
                avatarUrl = supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl;
            }

            // Handle Logo Upload
            if (logoFile) {
                const filePath = `${user.id}/logo-${Date.now()}`;
                const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, logoFile, { upsert: true });
                if (uploadError) throw uploadError;
                logoUrl = supabase.storage.from('logos').getPublicUrl(filePath).data.publicUrl;
            }

            const updates = {
                id: user.id,
                first_name: firstName,
                last_name: lastName,
                display_name: displayName,
                full_name: `${firstName} ${lastName}`.trim(),
                short_bio: shortBio,
                artist_statement: artistStatement,
                social_links: socialLinks.filter(link => link.url.trim() !== ''),
                avatar_url: avatarUrl,
                logo_url: logoUrl,
                coa_settings: coaSettings,
                updated_at: new Date().toISOString(),
            };

            const { error: profileError } = await supabase.from('profiles').upsert(updates);
            if (profileError) throw profileError;

            toast.success('Settings updated successfully!', { id: toastId });
        } catch (error: any) {
            console.error("Profile update error:", error);
            toast.error(error.message || 'An unknown error occurred.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return <div className="page-container"><p className="loading-message">Loading your profile...</p></div>;
    }

    return (
        <div className="settings-page page-container">
            <h1>Artist Settings</h1>
            <p className="page-subtitle">Manage your public profile, branding, and document settings.</p>

            <div className="tabs-container">
                <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                    <User size={16} /> Public Profile
                </button>
                <button className={`tab-button ${activeTab === 'branding' ? 'active' : ''}`} onClick={() => setActiveTab('branding')}>
                    <FileText size={16} /> Branding & Documents
                </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="settings-form">
                {activeTab === 'profile' && (
                    <>
                        <div className="form-section">
                            <h3>Public Profile</h3>
                            <p className="form-section-description">This information will be displayed on your public artist portfolio.</p>
                            <ImageUpload label="Profile Picture" onFileSelect={setAvatarFile} initialPreview={avatarPreview || undefined} />
                            <div className="form-group">
                                <label className="label" htmlFor="displayName">Display Name</label>
                                <input id="displayName" className={`input ${errors.displayName ? 'input-error' : ''}`} type="text" value={displayName} onChange={e => { setDisplayName(e.target.value); setErrors(prev => ({ ...prev, displayName: '' })); }} />
                                {errors.displayName && <p className="error-message">{errors.displayName}</p>}
                            </div>
                            <div className="form-grid-2-col">
                                <div className="form-group">
                                    <label className="label" htmlFor="firstName">First Name</label>
                                    <input id="firstName" className={`input ${errors.firstName ? 'input-error' : ''}`} type="text" value={firstName} onChange={e => { setFirstName(e.target.value); setErrors(prev => ({ ...prev, firstName: '' })); }} />
                                    {errors.firstName && <p className="error-message">{errors.firstName}</p>}
                                </div>
                                <div className="form-group">
                                    <label className="label" htmlFor="lastName">Last Name</label>
                                    <input id="lastName" className={`input ${errors.lastName ? 'input-error' : ''}`} type="text" value={lastName} onChange={e => { setLastName(e.target.value); setErrors(prev => ({ ...prev, lastName: '' })); }} />
                                    {errors.lastName && <p className="error-message">{errors.lastName}</p>}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label" htmlFor="shortBio">Short Bio / Tagline</label>
                                <input id="shortBio" className="input" type="text" value={shortBio} onChange={e => setShortBio(e.target.value)} placeholder="e.g., Contemporary Abstract Painter" />
                            </div>
                            <div className="form-group">
                                <label className="label" htmlFor="artistStatement">Artist Statement</label>
                                <textarea id="artistStatement" className="textarea" value={artistStatement} onChange={e => setArtistStatement(e.target.value)} placeholder="Tell collectors about your work, process, and inspiration..."></textarea>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Social Links</h3>
                            <p className="form-section-description">Link to your website, social media, and other online presences.</p>
                            {socialLinks.map((link, index) => (
                                <div key={index} className="social-link-group">
                                    <select value={link.platform} onChange={e => handleSocialLinkChange(index, 'platform', e.target.value)} className="input">
                                        <option value="Website">Website</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="Facebook">Facebook</option>
                                        <option value="Twitter">Twitter</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {link.platform === 'Other' && <input type="text" value={link.details || ''} onChange={e => handleSocialLinkChange(index, 'details', e.target.value)} className="input" placeholder="Custom Platform Name" />}
                                    <input type="url" value={link.url} onChange={e => handleSocialLinkChange(index, 'url', e.target.value)} className="input" placeholder="https://..." />
                                    <button type="button" onClick={() => handleRemoveSocialLink(index)} className="button-icon-danger"><Trash2 size={16} /></button>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddSocialLink} className="button button-secondary button-with-icon"><Plus size={16} /> Add Social Link</button>
                        </div>
                    </>
                )}

                {activeTab === 'branding' && (
                     <>
                        <div className="form-section">
                            <h3>Branding</h3>
                            <p className="form-section-description">Upload your logo to be automatically included on invoices and digital certificates.</p>
                            <ImageUpload label="Artist Logo" onFileSelect={setLogoFile} initialPreview={logoPreview || undefined} />
                        </div>
                        
                        <div className="form-section">
                            <h3><Award size={20} className="inline-block mr-2" /> Certificate of Authenticity (CoA)</h3>
                            <p className="form-section-description">Configure how you provide Certificates of Authenticity for your sold artworks.</p>
                            <div className="flex items-center gap-4 py-4">
                                <label htmlFor="coa-enabled-toggle" className="label-flex font-semibold">I provide a CoA for my artworks</label>
                                <label className="switch">
                                    <input id="coa-enabled-toggle" type="checkbox" checked={coaSettings.enabled} onChange={(e) => setCoaSettings(prev => ({ ...prev, enabled: e.target.checked }))} />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            {coaSettings.enabled && (
                                <div className="pl-4 border-l-2 border-border">
                                    <p className="label mb-2">How do you provide the certificate?</p>
                                    <div className="radio-group">
                                        <label className="radio-label"><input type="radio" name="coaType" value="physical" checked={coaSettings.type === 'physical'} onChange={() => setCoaSettings(prev => ({ ...prev, type: 'physical' }))} className="radio" /> Physically (shipped with the artwork)</label>
                                        <label className="radio-label"><input type="radio" name="coaType" value="digital" checked={coaSettings.type === 'digital'} onChange={() => setCoaSettings(prev => ({ ...prev, type: 'digital' }))} className="radio" /> Digitally (auto-generated by Artflow)</label>
                                    </div>
                                    {coaSettings.type === 'digital' && <p className="text-sm text-muted-foreground mt-2">When a sale is recorded, Artflow will automatically generate a PDF certificate and make it available to the collector in their Vault.</p>}
                                </div>
                            )}
                        </div>

                        <div className="form-section">
                            <h3>Document Previews</h3>
                            <p className="form-section-description">This is how your logo and name will appear on documents sent to collectors.</p>
                            <div className="document-previews-grid">
                                <InvoicePreview artistName={displayName} logoUrl={logoPreview} />
                                <CoAPreview artistName={displayName} logoUrl={logoPreview} />
                            </div>
                        </div>
                    </>
                )}

                <div className="form-actions">
                    <Button type="submit" className="button button-primary" isLoading={loading}>Save Changes</Button>
                </div>
            </form>
        </div>
    );
};

export default ArtistSettingsPage;