// src/pages/WaitlistPage.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import {
    AreaChart, BarChart2, BookOpen, DollarSign, FileText, GalleryVertical, Heart,
    Layers, Map, MessageCircleHeart, Package, Search, Sparkles, TrendingUp,
    Users, Wand2, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- DATABASE HELPER ---
const addToWaitlist = async ({ email, rolePreference }: { email: string, rolePreference: string }) => {
    const { data, error } = await supabase
        .from('waitlist_entries')
        .insert({ email, role_preference: rolePreference });

    if (error && error.code === '23505') {
        throw new Error("This email address is already on the waitlist.");
    }
    if (error) {
        console.error("Supabase error:", error);
        throw new Error(`Database error: ${error.message}`);
    }
    return data;
};

// --- REUSABLE COMPONENTS ---
const NavBar = () => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => { setIsScrolled(window.scrollY > 10); };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`waitlist-nav ${isScrolled ? 'scrolled' : ''}`}>
            <img src="/logo.svg" alt="Artflow" height="60px" className="waitlist-nav-logo" />
        </nav>
    );
};

interface FeatureTab {
    id: string;
    label: string;
    heading: string;
    icon: React.ElementType;
    content: React.ReactNode;
    imageUrl: string;
}

const FeatureTabSection: React.FC<{ title: string; audience: string; description: string; features: FeatureTab[] }> = ({ title, audience, description, features }) => {
    const [activeTab, setActiveTab] = useState(features[0]?.id || '');
    const [isFading, setIsFading] = useState(false);

    const handleTabClick = (tabId: string) => {
        if (tabId !== activeTab) {
            setIsFading(true);
            setTimeout(() => {
                setActiveTab(tabId);
                setIsFading(false);
            }, 150);
        }
    };

    const currentFeature = features.find(f => f.id === activeTab) || features[0];

    return (
        <div className="tabbed-feature-section page-container">
            <div className="text-center">
                <span className="badge">{audience}</span>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
            <div className="tabbed-content-grid">
                <div className="tab-list">
                    {features.map((feature) => (
                        <button
                            key={feature.id}
                            className={`tab-button-item ${activeTab === feature.id ? 'active' : ''}`}
                            onClick={() => handleTabClick(feature.id)}
                        >
                            <feature.icon size={20} className="tab-icon" />
                            <span>{feature.label}</span>
                        </button>
                    ))}
                </div>
                <div className={`tab-content-area ${isFading ? 'fading' : ''}`}>
                    <div className="tab-content-wrapper">
                        <div className="tab-text-content">
                            <h3>{currentFeature.heading}</h3>
                            {currentFeature.content}
                        </div>
                        <div className="tab-image-placeholder">
                            <img src={currentFeature.imageUrl} alt={currentFeature.label} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN WAITLIST PAGE ---
const WaitlistPage = () => {
    const [email, setEmail] = useState('');
    const [rolePreference, setRolePreference] = useState('artist');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const topRef = useRef<HTMLDivElement>(null);

    const mutation = useMutation({
        mutationFn: addToWaitlist,
        onSuccess: () => setIsSubmitted(true),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) { toast.error("Please enter a valid email address."); return; }
        mutation.mutate({ email, rolePreference });
    };

    const scrollToTop = () => {
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (isSubmitted) {
            setIsSubmitted(false);
            setEmail('');
            setRolePreference('artist');
        }
    };

    const artistFeatures: FeatureTab[] = [
        {
            id: 'artist-present',
            label: 'Present your work',
            heading: 'A more human way to share your art',
            icon: GalleryVertical,
            content: (
                <>
                    <p>Stop wrestling with complicated websites. Artflow helps you create beautiful, professional viewing rooms that honor your vision and make it easy for collectors to connect with your work.</p>
                    <ul className="list-style-disc pl-5 space-y-2 mt-4 text-sm">
                        <li><h4 className="inline font-medium text-foreground"><Package size={16} className="inline-block mr-2 text-primary"/> Upload once, share everywhere</h4><p>Drag and drop your images, add details when you're ready, and let us handle the stunning presentation.</p></li>
                        <li><h4 className="inline font-medium text-foreground"><BookOpen size={16} className="inline-block mr-2 text-primary"/> Your gallery, your rules</h4><p>Share your work publicly, create password-protected previews for clients, or keep it private until you're ready.</p></li>
                    </ul>
                </>
            ),
            imageUrl: '/mockups/elegant-catalogue-builder.png',
        },
        {
            id: 'artist-understand',
            label: 'Understand your market',
            heading: 'Clarity and confidence for your career',
            icon: BarChart2,
            content: (
                <>
                    <p>Move beyond guesswork. We provide clear insights into how people interact with your art and the market at large, giving you the confidence to make strategic decisions.</p>
                    <ul className="list-style-disc pl-5 space-y-2 mt-4 text-sm">
                        <li><h4 className="inline font-medium text-foreground"><TrendingUp size={16} className="inline-block mr-2 text-primary"/> See what resonates</h4><p>Discover which pieces get the most attention and learn from real-time collector trends across the platform.</p></li>
                        <li><h4 className="inline font-medium text-foreground"><DollarSign size={16} className="inline-block mr-2 text-primary"/> Price with confidence</h4><p>Value your work fairly with intelligent price suggestions based on recent sales of comparable pieces.</p></li>
                    </ul>
                </>
            ),
            imageUrl: '/mockups/artist-insights-dashboard.png',
        },
        {
            id: 'artist-manage',
            label: 'Manage your business',
            heading: 'Your studio manager, automated',
            icon: Wand2,
            content: (
                 <>
                    <p>Focus on your art, not on admin. Artflow automates the tedious parts of your business, from tracking sales to preparing professional documents, freeing you to do what you do best.</p>
                    <ul className="list-style-disc pl-5 space-y-2 mt-4 text-sm">
                        <li><h4 className="inline font-medium text-foreground"><FileText size={16} className="inline-block mr-2 text-primary"/> One-click documents</h4><p>Generate inventory reports for insurance or a beautiful press kit for a gallery application instantly.</p></li>
                        <li><h4 className="inline font-medium text-foreground"><Layers size={16} className="inline-block mr-2 text-primary"/> Effortless inventory</h4><p>Your portfolio is always up to date, with a clear view of what's available, on hold, or sold.</p></li>
                    </ul>
                </>
            ),
            imageUrl: '/mockups/press-kit-generator.png',
        },
        {
            id: 'artist-connect',
            label: 'Nurture relationships',
            heading: 'A more human way to connect',
            icon: MessageCircleHeart,
            content: (
                <>
                    <p>Build lasting relationships, not just a list of contacts. Our tools help you nurture every connection, turning one-time buyers into lifelong supporters of your work.</p>
                    <ul className="list-style-disc pl-5 space-y-2 mt-4 text-sm">
                        <li><h4 className="inline font-medium text-foreground"><Users size={16} className="inline-block mr-2 text-primary"/> Your personal rolodex</h4><p>Remember who bought what, what they're interested in, and get gentle reminders to follow up.</p></li>
                        <li><h4 className="inline font-medium text-foreground"><Zap size={16} className="inline-block mr-2 text-primary"/> Never miss an opportunity</h4><p>Get alerted when a past collector shows interest in your new work, so you can make a personal connection.</p></li>
                    </ul>
                </>
            ),
            imageUrl: '/mockups/opportunities-widget.png',
        },
    ];

    const collectorFeatures: FeatureTab[] = [
        {
            id: 'collector-discovery',
            label: 'Made for you',
            heading: 'Discover art that feels like it was made for you',
            icon: Sparkles,
            content: (
                <>
                    <p>Move beyond endless scrolling. Our thoughtful approach to discovery helps you find works that truly speak to you, connecting you with artists and pieces that match your unique taste.</p>
                     <ul className="list-style-disc pl-5 space-y-2 mt-4 text-sm">
                        <li><h4 className="inline font-medium text-foreground"><Search size={16} className="inline-block mr-2 text-primary"/> Intuitive search</h4><p>Simply describe what you're looking for—a mood, a style, a feeling—and let our platform find the perfect piece.</p></li>
                        <li><h4 className="inline font-medium text-foreground"><Heart size={16} className="inline-block mr-2 text-primary"/> Recommendations that get you</h4><p>The more you interact, the more our suggestions align with your personal taste.</p></li>
                    </ul>
                </>
            ),
            imageUrl: '/mockups/ai-concierge-search.png',
        },
        {
            id: 'collector-strategy',
            label: 'Collect with purpose',
            heading: 'Build a collection that tells your story',
            icon: Map,
            content: <p>A collection is more than art on a wall; it's a legacy. Define your collecting goals with a personal roadmap, and we’ll help you find the pieces that write the next chapter.</p>,
            imageUrl: '/mockups/collection-roadmap.png',
        },
        {
            id: 'collector-organize',
            label: 'Organize your passion',
            heading: 'Your collection, beautifully organized',
            icon: Layers,
            content: (
                 <>
                    <p>Never lose track of a piece you love. Save artworks, follow artists you admire, and curate your finds into personal lists. Your entire art journey, all in one place.</p>
                    <ul className="list-style-disc pl-5 space-y-2 mt-4 text-sm">
                        <li><h4 className="inline font-medium text-foreground"><Heart size={16} className="inline-block mr-2 text-primary"/> Save everything you love</h4><p>One click to save artwork or follow artists—find it all again instantly.</p></li>
                        <li><h4 className="inline font-medium text-foreground"><BookOpen size={16} className="inline-block mr-2 text-primary"/> View your collection</h4><p>See all your acquired works in a stunning visual grid, complete with secure documentation.</p></li>
                    </ul>
                </>
            ),
            imageUrl: '/mockups/collector-collection-page.png',
        },
        {
            id: 'collector-community',
            label: 'Connect with community',
            heading: 'Inspired by people, not just algorithms',
            icon: Users,
            content: <p>Art is a shared passion. Explore public collections curated by fellow art lovers and tastemakers, discover new perspectives, and share your own unique vision with the community.</p>,
            imageUrl: '/mockups/community-curation-grid.png',
        },
    ];

    return (
        <>
            <header className="gradient-polish" ref={topRef}>
                {isSubmitted ? (
                    <div className="card">
                        <div className="logo-holder"><img src="/logo.svg" alt="Artflow" height="60px" /></div>
                        <h2>You're on the list.</h2>
                        <p>Thank you for joining. We'll send an exclusive invitation to your inbox as soon as we're ready. Expect something special.</p>
                        <a href="#explore" className="button button-secondary mt-4">See what's coming</a>
                    </div>
                ) : (
                    <>
                        <NavBar />
                        <div className="hero-content-grid page-container">
                            <div className="hero-text-side">
                                <h1>Art, sorted</h1>
                                <p>For the artist building a career, not just a portfolio. For the collector building a home, not just a collection. This is where your art finds its people.</p>
                            </div>
                            <div className="waitlist-form-side">
                                <div className="card">
                                    <h3 className="section-title text-center mb-6">Be the first to experience it</h3>
                                    <form onSubmit={handleSubmit}>
                                        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" required />
                                        <div className="my-4 text-left">
                                            <label className="block mb-3 font-medium">I'm here as an...</label>
                                            <div className="flex gap-4 flex-wrap">
                                                <label className="radio-label"><input type="radio" value="artist" checked={rolePreference === 'artist'} onChange={(e) => setRolePreference(e.target.value)} className="radio"/> Artist</label>
                                                <label className="radio-label"><input type="radio" value="collector" checked={rolePreference === 'collector'} onChange={(e) => setRolePreference(e.target.value)} className="radio"/> Collector</label>
                                                <label className="radio-label"><input type="radio" value="both" checked={rolePreference === 'both'} onChange={(e) => setRolePreference(e.target.value)} className="radio"/> Both</label>
                                            </div>
                                        </div>
                                        <button type="submit" className="button button-primary button-lg w-full" disabled={mutation.isPending}>
                                            {mutation.isPending ? 'Joining the list...' : 'Get my invite'}
                                        </button>
                                        {mutation.isError && <p className="error-message">{(mutation.error as Error).message}</p>}
                                    </form>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </header>

            <section id="explore" className="marketing-section">
                <FeatureTabSection
                    audience="For artists"
                    title="Your studio, supercharged"
                    description="Spend more time creating and less time on the tasks that drain your energy. Artflow is the tool every artist deserves."
                    features={artistFeatures}
                />
            </section>
            
            <section className="marketing-section">
                 <FeatureTabSection
                    audience="For collectors"
                    title="A more considered way to collect"
                    description="Find art that truly moves you. We provide the tools and insights to help you build a collection with passion and purpose."
                    features={collectorFeatures}
                />
            </section>

            <footer>
                <section className="final-cta page-container">
                    <h2>Ready for a better art world?</h2>
                    <div className="hero-actions">
                        <button onClick={scrollToTop} className="button button-primary button-lg">Join the waitlist</button>
                    </div>
                </section>
                <p className="text-center mt-8 text-muted-foreground">
                    &copy; {new Date().getFullYear()} Artflow. Built for artists and collectors who deserve better.
                </p>
            </footer>
        </>
    );
};

export default WaitlistPage;