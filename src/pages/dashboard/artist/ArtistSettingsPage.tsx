import React, { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/ui/ImageUpload';
import { Trash2 } from 'lucide-react';

// Define structured types for JSONB data to improve type safety
interface SocialLink {
    platform: string;
    url: string;
}

interface Location {
    country?: string;
    city?: string;
}

const ArtistSettingsPage = () => {
    // Authentication and user profile data from context
    const { user, profile, loading: authLoading } = useAuth();

    // Component-level loading state for form submission
    const [loading, setLoading] = useState(false);

    // Form field states
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [shortBio, setShortBio] = useState('');
    const [artistStatement, setArtistStatement] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [locationCountry, setLocationCountry] = useState('');
    const [locationCity, setLocationCity] = useState('');
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    
    // State for avatar image file and its preview URL
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // Effect to populate the form with profile data once it's loaded
    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setLastName(profile.last_name || '');
            setDisplayName(profile.display_name || '');
            setShortBio(profile.short_bio || '');
            setArtistStatement(profile.artist_statement || '');
            setContactNumber(profile.contact_number || '');
            setAvatarPreview(profile.avatar_url || null);

            if (profile.location && typeof profile.location === 'object' && !Array.isArray(profile.location)) {
                const loc = profile.location as Location;
                setLocationCountry(loc.country || '');
                setLocationCity(loc.city || '');
            }

            // *** FUXKING FIXED PART ***
            // This is the robust fix. We explicitly build a new, correctly typed array.
            if (Array.isArray(profile.social_links)) {
                const validLinks: SocialLink[] = profile.social_links
                    .map((link: any) => {
                        // Ensure the item is an object with the required properties
                        if (typeof link === 'object' && link !== null && 'platform' in link && 'url' in link) {
                            // Create a new object that explicitly matches the SocialLink interface
                            return {
                                platform: String(link.platform),
                                url: String(link.url)
                            };
                        }
                        // Discard any invalid items (null, not an object, missing keys)
                        return null;
                    })
                    // Filter out the discarded null items, leaving a clean array of SocialLink objects
                    .filter((link): link is SocialLink => link !== null);

                setSocialLinks(validLinks);
            }
        }
    }, [profile]);

    // --- Social Links Management ---
    const handleAddSocialLink = () => {
        setSocialLinks([...socialLinks, { platform: 'Website', url: '' }]);
    };

    const handleRemoveSocialLink = (index: number) => {
        setSocialLinks(socialLinks.filter((_, i) => i !== index));
    };

    const handleSocialLinkChange = (index: number, field: keyof SocialLink, value: string) => {
        const newLinks = socialLinks.map((link, i) => 
            i === index ? { ...link, [field]: value } : link
        );
        setSocialLinks(newLinks);
    };

    // --- Profile Update Handler ---
    const handleUpdateProfile = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        const toastId = toast.loading('Saving changes...');

        try {
            let avatarUrl = profile?.avatar_url;

            // Step 1: Upload new avatar if one has been selected
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `${user.id}/${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, {
                    upsert: true,
                });
                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
                avatarUrl = data.publicUrl;
            }

            // Step 2: Prepare the data object for the 'profiles' table update
            const updates = {
                id: user.id,
                first_name: firstName,
                last_name: lastName,
                display_name: displayName,
                full_name: `${firstName} ${lastName}`.trim(),
                short_bio: shortBio,
                artist_statement: artistStatement,
                contact_number: contactNumber,
                location: { country: locationCountry, city: locationCity },
                social_links: socialLinks.filter(link => link.url.trim() !== ''),
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
            };

            // Step 3: Upsert the profile data into Supabase
            const { error: profileError } = await supabase.from('profiles').upsert(updates);
            if (profileError) throw profileError;
            
            toast.success('Profile updated successfully!', { id: toastId });
        } catch (error: any) {
            toast.error(error.message || 'An unknown error occurred.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return <div className="p-4">Loading your profile...</div>;
    }

    return (
        <div className="settings-page">
            <h1>Artist Settings</h1>
            <p className="page-subtitle">Manage your public profile information, contact details, and account settings.</p>

            <form onSubmit={handleUpdateProfile} className="settings-form">
                <div className="form-section">
                    <h3>Public Profile</h3>
                    <p>This information will be displayed on your public artist portfolio.</p>
                    
                    <ImageUpload onFileSelect={setAvatarFile} initialPreview={avatarPreview || undefined} />
                    
                    <div className="form-group">
                        <label className="label" htmlFor="displayName">Display Name</label>
                        <input id="displayName" className="input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="The name shown publicly on your profile" />
                    </div>

                    <div className="form-grid-2-col">
                        <div className="form-group">
                            <label className="label" htmlFor="firstName">First Name</label>
                            <input id="firstName" className="input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="label" htmlFor="lastName">Last Name</label>
                            <input id="lastName" className="input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} />
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
                    <h3>Contact & Location</h3>
                    <p>This information is private and will only be used for communication and shipping.</p>
                     <div className="form-grid-2-col">
                        <div className="form-group">
                            <label className="label" htmlFor="contactNumber">Phone Number</label>
                            <input id="contactNumber" className="input" type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
                        </div>
                         <div className="form-group">
                            <label className="label" htmlFor="locationCountry">Country</label>
                            <input id="locationCountry" className="input" type="text" value={locationCountry} onChange={e => setLocationCountry(e.target.value)} />
                        </div>
                    </div>
                     <div className="form-group">
                        <label className="label" htmlFor="locationCity">City</label>
                        <input id="locationCity" className="input" type="text" value={locationCity} onChange={e => setLocationCity(e.target.value)} />
                    </div>
                </div>
                
                 <div className="form-section">
                    <h3>Social Links</h3>
                    <p>Link to your website, social media, and other online presences.</p>
                    {socialLinks.map((link, index) => (
                        <div key={index} className="social-link-group">
                            <select value={link.platform} onChange={e => handleSocialLinkChange(index, 'platform', e.target.value)} className="input">
                                <option>Website</option>
                                <option>Instagram</option>
                                <option>Facebook</option>
                                <option>Twitter</option>
                                <option>Other</option>
                            </select>
                            <input type="url" value={link.url} onChange={e => handleSocialLinkChange(index, 'url', e.target.value)} className="input" placeholder="https://..." />
                            <button type="button" onClick={() => handleRemoveSocialLink(index)} className="button-icon-danger" aria-label="Remove social link">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddSocialLink} className="button secondary">Add Social Link</button>
                </div>

                <div className="form-actions">
                    <Button type="submit" className="primary" isLoading={loading}>Save Changes</Button>
                </div>
            </form>
        </div>
    );
};

export default ArtistSettingsPage;
