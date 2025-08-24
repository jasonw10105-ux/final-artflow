// src/pages/CompleteProfilePage.tsx (Continued)
                
                const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
                avatarUrl = data.publicUrl;
            }

            const fullName = `${firstName} ${lastName}`.trim();
            
            const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', { input_text: fullName, table_name: 'profiles' });
            if (slugError) throw slugError;

            const profileUpdates = {
                id: user.id,
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                role: role,
                profile_completed: true,
                slug: slugData,
                bio: isArtistType ? bio : null,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
            };
            const { error: profileError } = await supabase.from('profiles').upsert(profileUpdates);
            if (profileError) throw profileError;

            if (isArtistType) {
                const { error: catalogueError } = await supabase.from('catalogues').insert({
                    user_id: user.id,
                    title: 'Available Work',
                    is_system_catalogue: true,
                    status: 'Published',
                    is_published: true,
                });
                if (catalogueError) console.warn("Could not create default catalogue:", catalogueError.message);
            }
            
            toast.success('Profile complete! Redirecting...', { id: toastId });
            window.location.replace('/dashboard'); 

        } catch (err: any) {
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-layout" style={{gridTemplateColumns: '1fr'}}>
            <main className="auth-form-panel">
                <div className="auth-card" style={{maxWidth: '600px'}}>
                    <header className="auth-card-header">
                        <img src="/logo.svg" alt="Artflow" height="50px" className="logo-holder" />
                        <h2>Complete Your Profile</h2>
                        <p>Just a few more details to get you started.</p>
                    </header>
                    
                    <form onSubmit={handleProfileComplete} className="auth-form">
                        <ImageUpload onFileSelect={setAvatarFile} />
                        
                        {isArtistType && <p style={{textAlign: 'center', marginTop: '-1rem', marginBottom: '1rem', color: 'var(--muted-foreground)'}}>A profile picture is required for artists.</p>}

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                            <div className="form-group">
                                <label className="label" htmlFor="firstName">First Name *</label>
                                <input id="firstName" className="input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="label" htmlFor="lastName">Last Name *</label>
                                <input id="lastName" className="input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label" htmlFor="role">Your Primary Role *</label>
                            <select id="role" className="input" value={role} onChange={e => setRole(e.target.value)} required>
                                <option value="" disabled>-- Select a Role --</option>
                                <option value="artist">Artist</option>
                                <option value="collector">Collector</option>
                                <option value="both">Both Artist & Collector</option>
                            </select>
                        </div>
                        
                        {isArtistType && (
                             <div className="form-group">
                                <label className="label" htmlFor="bio">
                                    Your Bio * <span style={{fontWeight: 400, color: 'var(--muted-foreground)'}}>(Required for artists)</span>
                                </label>
                                <textarea 
                                    id="bio" 
                                    className="textarea" 
                                    value={bio} 
                                    onChange={e => setBio(e.target.value)}
                                    placeholder="Tell us a little about yourself and your work..."
                                    required={isArtistType} 
                                />
                            </div>
                        )}
                        
                        <Button type="submit" variant="primary" isLoading={loading} className="primary" style={{marginTop: '1rem'}}>
                            Complete Registration
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CompleteProfilePage;