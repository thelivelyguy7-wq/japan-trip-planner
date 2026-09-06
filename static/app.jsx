const { useState, useRef, useEffect } = React;

const AGENT_MESSAGES = {
    'orchestrator': '[ORCH] Extracting constraints and routing tasks...',
    'destination': '[DEST] Analyzing constraints and querying regional POIs...',
    'logistics': '[LOGI] Simulating transit routes and accommodation availability...',
    'budget': '[BUDG] Projecting expenditure models...',
    'synthesis': '[SYNC] Compiling data into a cohesive itinerary...',
    'review': '[QA] Review Agent (Gemini) is performing validation...',
    'complete': '[SYS] Mission Briefing Ready'
};

const DISCOVER_REGIONS = [
    {
        name: 'Tokyo',
        blurb: "Japan's neon-lit capital blends cutting-edge technology with centuries-old shrines, world-class ramen, and nonstop nightlife.",
        highlights: ['Nightlife', 'Food', 'Shopping'],
        fragment: 'Include Tokyo — I want to experience its neon streets, food scene, and nightlife.'
    },
    {
        name: 'Kyoto',
        blurb: 'The former imperial capital is home to over 1,600 Buddhist temples, geisha districts, and serene bamboo groves.',
        highlights: ['Temples', 'Culture', 'Gardens'],
        fragment: "Include Kyoto — I'd love to explore its temples and traditional culture."
    },
    {
        name: 'Osaka',
        blurb: "Known as Japan's kitchen, this lively city is famous for street food, castle history, and a laid-back sense of humor.",
        highlights: ['Food', 'Nightlife', 'History'],
        fragment: 'Include Osaka — known for amazing street food and a lively atmosphere.'
    },
    {
        name: 'Hokkaido',
        imageQuery: 'Sapporo',
        blurb: "Japan's wild northern island offers powder snow, natural hot springs, and some of the country's freshest seafood.",
        highlights: ['Nature', 'Onsen', 'Skiing'],
        fragment: 'Include Hokkaido — I want nature, snow, and hot springs.'
    },
    {
        name: 'Hiroshima',
        blurb: 'A city of resilience and peace, paired with the iconic floating torii gate of nearby Miyajima Island.',
        highlights: ['History', 'Islands', 'Culture'],
        fragment: 'Include Hiroshima — interested in its history and Miyajima Island.'
    },
    {
        name: 'Okinawa',
        imageQuery: 'Naha',
        blurb: 'Tropical islands with turquoise waters, coral reefs, and a culture distinct from mainland Japan.',
        highlights: ['Beaches', 'Nature', 'Diving'],
        fragment: 'Include Okinawa — I want beaches and island culture.'
    },
];

const DISCOVER_INTERESTS = [
    { name: 'Ramen & Street Food', icon: 'ramen_dining', blurb: 'Tonkotsu, shoyu, and miso bowls, plus late-night yatai food stalls.', fragment: 'I love ramen and street food.' },
    { name: 'Temples & Shrines', icon: 'temple_buddhist', blurb: "From Fushimi Inari to Todai-ji, explore Japan's spiritual landmarks.", fragment: 'I want to visit temples and shrines.' },
    { name: 'Onsen & Relaxation', icon: 'hot_tub', blurb: 'Soak in natural hot springs across mountain towns and coastal resorts.', fragment: "I'd like to relax at an onsen." },
    { name: 'Anime & Pop Culture', icon: 'sports_esports', blurb: 'Akihabara, the Ghibli Museum, and themed cafes for fans of anime and games.', fragment: "I'm interested in anime and pop culture spots." },
    { name: 'Nature & Hiking', icon: 'forest', blurb: 'Mt. Fuji, the Japanese Alps, and countless scenic trails to explore.', fragment: 'I want nature and hiking experiences.' },
    { name: 'Nightlife', icon: 'nightlife', blurb: 'Neon alleys, izakayas, and karaoke bars that come alive after dark.', fragment: 'I enjoy nightlife and bars.' },
    { name: 'History & Culture', icon: 'account_balance', blurb: 'Samurai castles, museums, and centuries of living tradition.', fragment: "I'm interested in history and culture." },
    { name: 'Shopping', icon: 'shopping_bag', blurb: 'From Ginza luxury boutiques to Harajuku streetwear and quirky finds.', fragment: "I'd like good shopping spots." },
];

const MISSIONS_STORAGE_KEY = 'aetheris_travel_missions';

function loadSavedMissions() {
    try {
        const raw = localStorage.getItem(MISSIONS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Failed to load saved missions:', e);
        return [];
    }
}

function persistMissions(missions) {
    try {
        localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(missions));
    } catch (e) {
        console.error('Failed to persist missions:', e);
    }
}

function MicrophoneButton({ onTranscription, isProcessing, isRecording, toggleRecording }) {
    const label = isProcessing ? 'Transcribing voice input' : isRecording ? 'Stop recording' : 'Start voice input';
    return (
        <button
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isRecording ? 'bg-error/20 text-error border border-error/50 glow-pulse' :
                isProcessing ? 'bg-surface-variant text-tertiary border border-tertiary/50' :
                'bg-surface-variant/50 hover:bg-surface-variant border border-white/10 text-primary'
            }`}
            onClick={toggleRecording}
            disabled={isProcessing}
            type="button"
            title={label}
            aria-label={label}
        >
            {isProcessing ? (
                <span className="material-symbols-outlined text-xl animate-spin" aria-hidden="true">refresh</span>
            ) : isRecording ? (
                <span className="material-symbols-outlined text-xl" aria-hidden="true">stop</span>
            ) : (
                <span className="material-symbols-outlined text-xl" aria-hidden="true">mic</span>
            )}
        </button>
    );
}

function Toast({ message, onDismiss }) {
    if (!message) return null;
    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md toast-in" role="alert">
            <div className="glass-panel border-l-4 border-l-error bg-error-container/20 rounded-lg px-4 py-3 flex items-start gap-3 shadow-2xl">
                <span className="material-symbols-outlined text-error mt-0.5" aria-hidden="true">error</span>
                <p className="flex-1 text-body-md text-on-surface-variant">{message}</p>
                <button onClick={onDismiss} className="text-on-surface-variant/70 hover:text-primary" aria-label="Dismiss">
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
                </button>
            </div>
        </div>
    );
}

function SideNavBar({ view, missionCount, onNavigate, onNewMission }) {
    return (
        <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 bg-surface-container-low/80 backdrop-blur-2xl border-r border-white/10 shadow-2xl py-8 pt-24 z-40">
            <div className="px-6 mb-8 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mb-4 overflow-hidden border border-outline-variant">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant">rocket_launch</span>
                </div>
                <div className="font-title-lg text-title-lg text-primary text-center">Hello Captain!</div>
                <button className="mt-6 w-full py-2 px-4 rounded-full bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-label-sm text-label-sm shadow-[0_0_15px_rgba(87,27,193,0.4)] hover:shadow-[0_0_25px_rgba(87,27,193,0.6)] transition-all" onClick={onNewMission}>New Request</button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <button
                    type="button"
                    onClick={() => onNavigate('explore')}
                    className={`w-full flex items-center gap-4 px-6 py-4 font-body-md text-body-md transition-all duration-300 ease-in-out text-left border-l-4 ${
                        view === 'explore' ? 'text-primary border-secondary bg-secondary-container/20' : 'text-on-surface-variant border-transparent hover:bg-surface-variant/40'
                    }`}
                >
                    <span className="material-symbols-outlined">rocket_launch</span> Exploration
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate('itineraries')}
                    className={`w-full flex items-center gap-4 px-6 py-4 font-body-md text-body-md transition-all duration-300 ease-in-out text-left border-l-4 ${
                        view === 'itineraries' ? 'text-primary border-secondary bg-secondary-container/20' : 'text-on-surface-variant border-transparent hover:bg-surface-variant/40'
                    }`}
                >
                    <span className="material-symbols-outlined">map</span> Itineraries
                    {missionCount > 0 && (
                        <span className="ml-auto text-[11px] font-bold bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full border border-white/5">{missionCount}</span>
                    )}
                </button>
            </div>
        </aside>
    );
}

function TopNavBar({ onLogoClick }) {
    return (
        <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 z-50 fixed top-0 bg-surface/60 backdrop-blur-xl border-b border-white/10 h-20">
            <button type="button" onClick={onLogoClick} className="font-display-lg-mobile md:font-display-lg text-title-lg font-bold text-primary hover:text-tertiary transition-colors">Aetheris Travel</button>
            <div className="flex gap-4">
                <span className="material-symbols-outlined text-primary hover:text-tertiary transition-colors cursor-pointer text-2xl">account_circle</span>
                <span className="material-symbols-outlined text-primary hover:text-tertiary transition-colors cursor-pointer text-2xl">notifications</span>
            </div>
        </nav>
    );
}

function MobileBottomNav({ view, onNavigate }) {
    return (
        <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-4 pt-2 md:hidden bg-surface-container-lowest/60 backdrop-blur-lg border-t border-white/10 shadow-lg rounded-t-xl h-20">
            <button
                type="button"
                onClick={() => onNavigate('explore')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${view === 'explore' ? 'text-secondary bg-secondary-container/30' : 'text-on-surface-variant'}`}
            >
                <span className="material-symbols-outlined mb-1" style={view === 'explore' ? {fontVariationSettings: "'FILL' 1"} : undefined}>rocket_launch</span>
                <span className="font-label-sm text-label-sm">Explore</span>
            </button>
            <button
                type="button"
                onClick={() => onNavigate('itineraries')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${view === 'itineraries' ? 'text-secondary bg-secondary-container/30' : 'text-on-surface-variant'}`}
            >
                <span className="material-symbols-outlined mb-1" style={view === 'itineraries' ? {fontVariationSettings: "'FILL' 1"} : undefined}>travel_explore</span>
                <span className="font-label-sm text-label-sm">Trips</span>
            </button>
        </nav>
    );
}

function AgentDAG({ activeNodes, completedNodes }) {
    const isNodeActive = (nodeId) => activeNodes.includes(nodeId);
    const isNodeComplete = (nodeId) => completedNodes.includes(nodeId);

    const getNodeClass = (nodeId) => {
        if (isNodeComplete(nodeId)) return 'border-tertiary bg-surface-container glow-pulse';
        if (isNodeActive(nodeId)) return 'border-secondary bg-surface-container glow-pulse';
        return 'border-outline-variant bg-surface-container opacity-50';
    };

    const getIconClass = (nodeId) => {
        if (isNodeComplete(nodeId)) return 'text-tertiary';
        if (isNodeActive(nodeId)) return 'text-secondary';
        return 'text-on-surface-variant';
    };

    return (
        <div className="w-full max-w-5xl mt-12 mb-12 hidden md:block">
            <h2 className="font-title-lg text-title-lg text-primary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">memory</span>
                Mission Intelligence Processing
            </h2>
            <div className="glass-panel rounded-xl p-8 relative overflow-hidden">
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{zIndex: 0}}>
                    {/* Orchestrator to Parallel Nodes */}
                    <path className={isNodeComplete('orchestrator') ? "dag-path" : ""} d="M 150 100 C 250 100, 250 60, 350 60" fill="none" stroke={isNodeComplete('orchestrator') ? "rgba(76, 215, 246, 0.4)" : "rgba(255, 255, 255, 0.1)"} strokeWidth="2"></path>
                    <path className={isNodeComplete('orchestrator') ? "dag-path" : ""} d="M 150 100 C 250 100, 250 100, 350 100" fill="none" stroke={isNodeComplete('orchestrator') ? "rgba(76, 215, 246, 0.4)" : "rgba(255, 255, 255, 0.1)"} strokeWidth="2"></path>
                    <path className={isNodeComplete('orchestrator') ? "dag-path" : ""} d="M 150 100 C 250 100, 250 140, 350 140" fill="none" stroke={isNodeComplete('orchestrator') ? "rgba(76, 215, 246, 0.4)" : "rgba(255, 255, 255, 0.1)"} strokeWidth="2"></path>
                    
                    {/* Parallel Nodes to Synthesis */}
                    <path className={isNodeComplete('destination') ? "dag-path" : ""} d="M 550 60 C 650 60, 650 100, 750 100" fill="none" stroke={isNodeComplete('destination') ? "rgba(76, 215, 246, 0.4)" : "rgba(255, 255, 255, 0.1)"} strokeWidth="2"></path>
                    <path className={isNodeComplete('logistics') ? "dag-path" : ""} d="M 550 100 C 650 100, 650 100, 750 100" fill="none" stroke={isNodeComplete('logistics') ? "rgba(76, 215, 246, 0.4)" : "rgba(255, 255, 255, 0.1)"} strokeWidth="2"></path>
                    <path className={isNodeComplete('budget') ? "dag-path" : ""} d="M 550 140 C 650 140, 650 100, 750 100" fill="none" stroke={isNodeComplete('budget') ? "rgba(76, 215, 246, 0.4)" : "rgba(255, 255, 255, 0.1)"} strokeWidth="2"></path>
                    
                    {/* Synthesis to Review */}
                    <path className={isNodeComplete('synthesis') ? "dag-path" : ""} d="M 850 100 L 950 100" fill="none" stroke={isNodeComplete('synthesis') ? "rgba(76, 215, 246, 0.4)" : "rgba(255, 255, 255, 0.1)"} strokeWidth="2"></path>
                </svg>

                <div className="relative z-10 flex justify-between items-center w-full min-h-[200px]">
                    
                    {/* 1. Orchestrator */}
                    <div className="flex flex-col items-center">
                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center relative ${getNodeClass('orchestrator')}`}>
                            <span className={`material-symbols-outlined ${getIconClass('orchestrator')}`}>alt_route</span>
                            {isNodeActive('orchestrator') && <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full shadow-[0_0_8px_#d0bcff]"></div>}
                            {isNodeComplete('orchestrator') && <div className="absolute -top-1 -right-1 w-3 h-3 bg-tertiary rounded-full shadow-[0_0_8px_#4cd7f6]"></div>}
                        </div>
                        <span className="font-label-sm text-label-sm text-primary mt-3">Orchestrator</span>
                    </div>

                    {/* 2. Parallel Agents */}
                    <div className="flex flex-col gap-6 w-48">
                        {['destination', 'logistics', 'budget'].map(node => (
                            <div key={node} className={`bg-surface-container/80 border ${isNodeComplete(node) ? 'border-tertiary/30' : 'border-white/10'} rounded-lg p-3 flex items-center gap-3 relative overflow-hidden`}>
                                {isNodeActive(node) && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>}
                                <div className={`w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center border ${isNodeComplete(node) ? 'border-tertiary text-tertiary' : isNodeActive(node) ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant'}`}>
                                    <span className="material-symbols-outlined text-sm">{node === 'destination' ? 'location_on' : node === 'logistics' ? 'flight_takeoff' : 'account_balance_wallet'}</span>
                                </div>
                                <div>
                                    <div className="font-label-sm text-label-sm text-primary capitalize">{node}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 3. Synthesis Agent */}
                    <div className={`flex flex-col items-center ${!isNodeActive('synthesis') && !isNodeComplete('synthesis') ? 'opacity-50' : ''}`}>
                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center relative ${getNodeClass('synthesis')}`}>
                            <span className={`material-symbols-outlined ${getIconClass('synthesis')}`}>merge</span>
                            {isNodeActive('synthesis') && <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full shadow-[0_0_8px_#d0bcff]"></div>}
                            {isNodeComplete('synthesis') && <div className="absolute -top-1 -right-1 w-3 h-3 bg-tertiary rounded-full shadow-[0_0_8px_#4cd7f6]"></div>}
                        </div>
                        <span className="font-label-sm text-label-sm text-primary mt-3">Synthesis</span>
                    </div>

                    {/* 4. Review Agent */}
                    <div className={`flex flex-col items-center ${!isNodeActive('review') && !isNodeComplete('review') ? 'opacity-50' : ''}`}>
                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center relative ${getNodeClass('review')}`}>
                            <span className={`material-symbols-outlined ${getIconClass('review')}`}>check_circle</span>
                            {isNodeActive('review') && <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full shadow-[0_0_8px_#d0bcff]"></div>}
                            {isNodeComplete('review') && <div className="absolute -top-1 -right-1 w-3 h-3 bg-tertiary rounded-full shadow-[0_0_8px_#4cd7f6]"></div>}
                        </div>
                        <span className="font-label-sm text-label-sm text-primary mt-3">Review</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DestinationGallery({ destinations }) {
    const [images, setImages] = useState({});

    useEffect(() => {
        const fetchImages = async () => {
            const newImages = {};
            for (const dest of destinations) {
                try {
                    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(dest)}&format=json&pithumbsize=800&origin=*`;
                    const res = await fetch(url);
                    const data = await res.json();
                    const pages = data.query.pages;
                    const pageId = Object.keys(pages)[0];
                    if (pageId !== "-1" && pages[pageId].thumbnail) {
                        newImages[dest] = pages[pageId].thumbnail.source;
                    } else {
                        newImages[dest] = `https://loremflickr.com/800/600/${encodeURIComponent(dest)},city/all`;
                    }
                } catch (e) {
                    newImages[dest] = `https://loremflickr.com/800/600/${encodeURIComponent(dest)},city/all`;
                }
            }
            setImages(newImages);
        };
        if (destinations && destinations.length > 0) {
            fetchImages();
        }
    }, [destinations]);

    if (!destinations || destinations.length === 0) return null;

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 mb-2 hide-scrollbar w-full">
            {destinations.map(dest => (
                <div key={dest} className="min-w-[280px] md:min-w-[320px] h-[200px] rounded-xl overflow-hidden relative shadow-lg flex-shrink-0 group border border-white/10">
                    {images[dest] ? (
                        <img src={images[dest]} alt={dest} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                        <div className="w-full h-full bg-surface-variant/50 animate-pulse flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-surface-variant opacity-50 text-4xl">image</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-5">
                        <span className="font-title-lg text-white drop-shadow-md capitalize">{dest}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function TripThumbnail({ destination, imageQuery }) {
    const [src, setSrc] = useState(null);
    const queryTitle = imageQuery || destination;

    useEffect(() => {
        let cancelled = false;
        if (!queryTitle) return;

        const fallback = `https://loremflickr.com/600/400/${encodeURIComponent(queryTitle)},city/all`;
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(queryTitle)}&format=json&pithumbsize=600&origin=*`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (cancelled) return;
                const pages = data.query.pages;
                const pageId = Object.keys(pages)[0];
                if (pageId !== "-1" && pages[pageId].thumbnail) {
                    setSrc(pages[pageId].thumbnail.source);
                } else {
                    setSrc(fallback);
                }
            })
            .catch(() => { if (!cancelled) setSrc(fallback); });

        return () => { cancelled = true; };
    }, [queryTitle]);

    return (
        <div className="w-full h-36 rounded-t-xl overflow-hidden relative bg-surface-variant/40 flex-shrink-0">
            {src ? (
                <img src={src} alt={destination || 'Trip destination'} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full animate-pulse flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant opacity-40 text-3xl">image</span>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
        </div>
    );
}

function TripCard({ trip, onSelect, onDelete }) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const { results } = trip;
    const destinations = results.constraints?.destinations || [];
    const title = destinations.length > 0 ? destinations.join(' & ') : 'Untitled Voyage';
    const days = (results.draft_itinerary?.day_by_day && results.draft_itinerary.day_by_day.length) || results.constraints?.duration_days || 0;
    const cost = results.draft_itinerary?.total_estimated_cost_usd;
    const approved = results.review_status?.is_approved;
    const dateStr = new Date(trip.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        if (confirmingDelete) {
            onDelete();
        } else {
            setConfirmingDelete(true);
            setTimeout(() => setConfirmingDelete(false), 3000);
        }
    };

    return (
        <div
            className="glass-panel glass-panel-top-highlight rounded-xl overflow-hidden group relative flex flex-col hover:border-secondary/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
        >
            <TripThumbnail destination={destinations[0]} />
            <button
                type="button"
                onClick={handleDeleteClick}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all ${
                    confirmingDelete
                        ? 'bg-error text-white border-error opacity-100'
                        : 'bg-black/40 text-white/70 border-white/10 opacity-0 group-hover:opacity-100 hover:text-error hover:border-error/50'
                }`}
                aria-label={confirmingDelete ? 'Confirm delete itinerary' : 'Delete itinerary'}
                title={confirmingDelete ? 'Click again to confirm' : 'Delete itinerary'}
            >
                <span className="material-symbols-outlined text-lg" aria-hidden="true">{confirmingDelete ? 'check' : 'delete'}</span>
            </button>
            <div className="p-5 flex flex-col gap-3 flex-1">
                <h3 className="font-title-lg text-primary capitalize leading-snug">{title}</h3>
                <div className="flex flex-wrap gap-2">
                    <span className="flex items-center gap-1 bg-surface-container-high px-2.5 py-1 rounded-full border border-white/5 text-[11px] text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">calendar_month</span> {days} Day{days === 1 ? '' : 's'}
                    </span>
                    {typeof cost === 'number' && (
                        <span className="flex items-center gap-1 bg-surface-container-high px-2.5 py-1 rounded-full border border-white/5 text-[11px] text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">payments</span> ${cost} Est
                        </span>
                    )}
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] ${approved ? 'bg-secondary-container/20 border-secondary/30 text-secondary' : 'bg-error-container/10 border-error/30 text-error'}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }}></span>
                        {approved ? 'Optimized' : 'Needs Review'}
                    </span>
                </div>
                <p className="text-on-surface-variant/70 text-xs mt-auto pt-3 border-t border-white/5">Logged {dateStr}</p>
            </div>
        </div>
    );
}

function ItinerariesList({ missions, onSelect, onDelete, onNewMission }) {
    if (!missions || missions.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-12 md:py-24 max-w-container-max mx-auto w-full text-center">
                <div className="w-20 h-20 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant" aria-hidden="true">map</span>
                </div>
                <h1 className="font-headline-md-mobile md:font-headline-md text-primary mb-3">No Missions Logged</h1>
                <p className="text-on-surface-variant text-body-lg max-w-md mb-8">Every itinerary your agents draft is archived here. Start your first mission to begin your log.</p>
                <button
                    type="button"
                    onClick={onNewMission}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-label-sm font-semibold flex items-center gap-2 glow-pulse hover:scale-105 transition-transform"
                >
                    Start New Mission
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}} aria-hidden="true">rocket_launch</span>
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-container-max mx-auto pb-24 pt-8 md:pt-16 animate-[fadeIn_0.5s_ease]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-headline-md-mobile md:font-headline-md text-primary mb-1">Mission Log</h1>
                    <p className="text-on-surface-variant text-body-lg">{missions.length} itinerar{missions.length === 1 ? 'y' : 'ies'} archived</p>
                </div>
                <button
                    type="button"
                    onClick={onNewMission}
                    className="self-start md:self-auto px-5 py-2.5 rounded-full bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-label-sm font-semibold flex items-center gap-2 hover:scale-105 transition-transform shrink-0"
                >
                    New Mission
                    <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1"}} aria-hidden="true">add</span>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {missions.map(trip => (
                    <TripCard key={trip.id} trip={trip} onSelect={() => onSelect(trip.id)} onDelete={() => onDelete(trip.id)} />
                ))}
            </div>
        </div>
    );
}

function DiscoveryRegionCard({ region, onExplore }) {
    return (
        <div
            className="glass-panel glass-panel-top-highlight rounded-xl overflow-hidden group flex flex-col hover:border-secondary/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            onClick={() => onExplore(region.fragment)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onExplore(region.fragment); }}
        >
            <TripThumbnail destination={region.name} imageQuery={region.imageQuery} />
            <div className="p-5 flex flex-col gap-3 flex-1">
                <h4 className="font-title-lg text-primary">{region.name}</h4>
                <p className="text-on-surface-variant text-sm leading-relaxed flex-1">{region.blurb}</p>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                    {region.highlights.map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-wider font-bold text-tertiary bg-tertiary-container/20 border border-tertiary/20 px-2 py-1 rounded-full">{tag}</span>
                    ))}
                </div>
                <div className="flex items-center gap-1 text-secondary text-xs font-semibold pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Add to mission brief <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span>
                </div>
            </div>
        </div>
    );
}

function DiscoveryInterestCard({ interest, onExplore }) {
    return (
        <button
            type="button"
            onClick={() => onExplore(interest.fragment)}
            className="glass-panel rounded-xl p-4 flex flex-col items-start gap-2 text-left hover:border-secondary/30 hover:-translate-y-0.5 transition-all duration-300"
        >
            <div className="w-10 h-10 rounded-full bg-secondary-container/20 border border-secondary/20 flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined" aria-hidden="true">{interest.icon}</span>
            </div>
            <h4 className="font-title-lg text-primary text-base">{interest.name}</h4>
            <p className="text-on-surface-variant text-xs leading-relaxed">{interest.blurb}</p>
        </button>
    );
}

function DiscoverSection({ onExplore }) {
    return (
        <section className="w-full max-w-container-max mx-auto mt-4 md:mt-10 animate-[fadeIn_0.5s_ease]">
            <div className="mb-8 text-center md:text-left">
                <h2 className="font-headline-md-mobile md:font-headline-md text-primary mb-2">Discover Japan</h2>
                <p className="text-on-surface-variant text-body-lg max-w-2xl mx-auto md:mx-0">Learn what makes each region and experience unique, then tap a card to fold it straight into your mission brief.</p>
            </div>

            <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-tertiary" aria-hidden="true">public</span>
                <h3 className="font-title-lg text-primary">Regions to Explore</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
                {DISCOVER_REGIONS.map(region => (
                    <DiscoveryRegionCard key={region.name} region={region} onExplore={onExplore} />
                ))}
            </div>

            <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-tertiary" aria-hidden="true">interests</span>
                <h3 className="font-title-lg text-primary">Explore by Interest</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {DISCOVER_INTERESTS.map(interest => (
                    <DiscoveryInterestCard key={interest.name} interest={interest} onExplore={onExplore} />
                ))}
            </div>
        </section>
    );
}

function FinalItinerary({ results, actionLabel = "New Request", onAction, heading = "Mission Briefing Ready", subheading = "Neural agents have finalized your trajectory." }) {
    return (
        <div className="w-full max-w-5xl mt-12 animate-[fadeIn_0.5s_ease]">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="font-headline-md-mobile md:font-headline-md text-primary">{heading}</h1>
                <p className="text-on-surface-variant text-body-lg">{subheading}</p>
            </div>

            {/* Trip Summary Card */}
            <section className="glass-panel glass-panel-top-highlight rounded-xl p-6 md:p-8 flex flex-col relative overflow-hidden mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] pointer-events-none"></div>
                
                <DestinationGallery destinations={results.constraints?.destinations || []} />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 z-10 w-full mt-4">
                    <div className="flex-1">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full border border-white/5">
                                <span className="material-symbols-outlined text-sm text-on-surface-variant">payments</span>
                                <span className="font-label-sm text-label-sm text-on-surface-variant">Total Est: ${results.draft_itinerary.total_estimated_cost_usd} USD</span>
                            </div>
                            <div className="flex items-center gap-2 bg-secondary-container/30 px-3 py-1.5 rounded-full border border-secondary/30">
                                <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(208,188,255,0.8)]"></span>
                                <span className="font-label-sm text-label-sm text-secondary">Status: Optimized</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
                        <button className="w-full md:w-auto bg-gradient-to-r from-secondary-container to-secondary-fixed-dim hover:from-secondary hover:to-secondary-fixed text-on-secondary font-label-sm text-label-sm py-3 px-6 rounded-lg transition-all shadow-[0_0_15px_rgba(87,27,193,0.3)]" onClick={onAction}>
                            {actionLabel}
                        </button>
                    </div>
                </div>
            </section>

            {/* QA Review Note if failed */}
            {!results.review_status.is_approved && (
                <section className="glass-panel border-l-4 border-l-error bg-error-container/10 rounded-r-xl p-4 flex items-start gap-4 mb-8">
                    <span className="material-symbols-outlined text-error mt-0.5" style={{fontVariationSettings: "'FILL' 1"}}>warning</span>
                    <div>
                        <h4 className="font-title-lg text-error mb-1">AI Reviewer Note</h4>
                        <p className="text-on-surface-variant text-body-md">
                            The agents were unable to perfectly meet your constraints after 3 revisions. 
                        </p>
                        <p className="text-on-surface-variant/80 text-sm mt-2">{results.review_status.feedback.join(', ')}</p>
                    </div>
                </section>
            )}

            {/* Timeline */}
            <div className="relative pl-6 md:pl-8 mt-4">
                <div className="absolute left-[11px] md:left-[15px] top-4 bottom-0 progress-line z-0"></div>
                <div className="space-y-12">
                    {results.draft_itinerary.day_by_day && results.draft_itinerary.day_by_day.map((details, index) => (
                        <div key={index} className="relative z-10">
                            <div className="absolute left-[-29px] md:left-[-33px] top-5 w-4 h-4 rounded-full bg-surface border-2 border-tertiary shadow-[0_0_10px_rgba(76,215,246,0.5)]"></div>
                            <div className="flex flex-col gap-2 mb-4 pl-4">
                                <span className="font-label-sm text-tertiary tracking-widest uppercase">Day {(index + 1).toString().padStart(2, '0')}</span>
                                <h3 className="font-title-lg text-primary capitalize">{(details.day || `Day ${index + 1}`).replace('_', ' ')}</h3>
                            </div>
                            <div className="glass-panel glass-panel-top-highlight rounded-xl p-5 md:p-6 ml-4 relative glow-active">
                                <div className="hidden md:flex justify-end mb-3">
                                    <div className="flex items-center gap-1.5 bg-secondary-container/20 px-2 py-1 rounded border border-secondary/20">
                                        <span className="material-symbols-outlined text-[14px] text-secondary">verified</span>
                                        <span className="text-[10px] uppercase font-bold text-secondary tracking-wider">Agent Verified</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-on-surface-variant text-body-md leading-relaxed">{details.activities}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function App() {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [statusEvents, setStatusEvents] = useState([]);
    const [results, setResults] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    // Navigation & mission log state
    const [view, setView] = useState('explore'); // 'explore' | 'itineraries'
    const [savedMissions, setSavedMissions] = useState(() => loadSavedMissions());
    const [selectedMissionId, setSelectedMissionId] = useState(null);

    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const promptRef = useRef(null);

    // DAG States
    const activeNodes = statusEvents.filter(ev => ev.status === 'active').map(ev => ev.node);
    const completedNodes = statusEvents.filter(ev => ev.status === 'complete').map(ev => ev.node);

    const toggleRecording = async (e) => {
        e.preventDefault();
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                setIsProcessingVoice(true);
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.webm');

                try {
                    const response = await fetch('/transcribe', { method: 'POST', body: formData });
                    if (!response.ok) throw new Error("Transcription failed");
                    const data = await response.json();
                    setPrompt(prev => prev ? prev + " " + data.text : data.text);
                } catch (error) {
                    console.error("Transcription error:", error);
                    setErrorMessage("Failed to transcribe audio. Please try again or type your request.");
                } finally {
                    setIsProcessingVoice(false);
                    stream.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing mic:", err);
            setErrorMessage("Could not access microphone. Check your browser permissions.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsLoading(true);
        setResults(null);
        setErrorMessage("");
        setStatusEvents([{ id: 'start', node: 'orchestrator', status: 'active' }]);

        try {
            const response = await fetch('/stream-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) throw new Error('Network error');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (!dataStr) continue;
                        
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.node === 'complete') {
                                setResults(data.result);
                                setIsLoading(false);
                                setStatusEvents(prev => prev.map(ev => ({ ...ev, status: 'complete' })));

                                const missionId = data.result.trip_id || `mission-${Date.now()}`;
                                const newMission = { id: missionId, savedAt: Date.now(), results: data.result };
                                setSavedMissions(prev => {
                                    const updated = [newMission, ...prev.filter(m => m.id !== missionId)];
                                    persistMissions(updated);
                                    return updated;
                                });
                            } else {
                                setStatusEvents(prev => {
                                    // Complex logic because destination, logistics, budget run in parallel
                                    // We shouldn't mark everything as complete if it's parallel
                                    let updated = [...prev];
                                    
                                    // If moving to synthesis, mark orchestrator and parallel agents complete
                                    if (data.node === 'synthesis') {
                                        updated = updated.map(ev => ({ ...ev, status: 'complete' }));
                                    } else if (data.node === 'review') {
                                        updated = updated.map(ev => ({ ...ev, status: 'complete' }));
                                    } else {
                                        // For parallel agents or orchestrator
                                        // Find existing node if it exists
                                        const exists = updated.find(e => e.node === data.node);
                                        if (!exists) {
                                            // Only mark orchestrator as complete if a parallel agent starts
                                            if (['destination', 'logistics', 'budget'].includes(data.node)) {
                                                updated = updated.map(ev => ev.node === 'orchestrator' ? { ...ev, status: 'complete' } : ev);
                                            }
                                        }
                                    }

                                    // Add the new active event if it doesn't exist
                                    if (!updated.find(e => e.node === data.node)) {
                                        updated.push({ id: data.node + Date.now(), node: data.node, status: 'active' });
                                    }
                                    return updated;
                                });
                            }
                        } catch (err) {
                            console.error("JSON parse error:", err);
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
            setErrorMessage("Failed to generate your itinerary. Please check your connection and try again.");
            setIsLoading(false);
        }
    };

    const handleNewMission = () => {
        setResults(null);
        setPrompt("");
        setStatusEvents([]);
        setErrorMessage("");
        setSelectedMissionId(null);
        setView('explore');
    };

    const handleDiscoverySelect = (fragment) => {
        setPrompt(prev => {
            const trimmed = prev.trim();
            if (!trimmed) return fragment;
            if (trimmed.toLowerCase().includes(fragment.toLowerCase())) return prev;
            return `${trimmed} ${fragment}`;
        });
        promptRef.current?.focus();
        promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const handleNavigate = (nextView) => {
        setView(nextView);
        setSelectedMissionId(null);
    };

    const handleDeleteMission = (id) => {
        setSavedMissions(prev => {
            const updated = prev.filter(m => m.id !== id);
            persistMissions(updated);
            return updated;
        });
        setSelectedMissionId(prev => (prev === id ? null : prev));
    };

    const selectedMission = savedMissions.find(m => m.id === selectedMissionId);

    return (
        <React.Fragment>
            <Toast message={errorMessage} onDismiss={() => setErrorMessage("")} />
            <TopNavBar onLogoClick={() => handleNavigate('explore')} />
            <SideNavBar view={view} missionCount={savedMissions.length} onNavigate={handleNavigate} onNewMission={handleNewMission} />
            <main className="flex-1 relative min-h-screen flex flex-col md:ml-64 w-full pt-20 pb-24 md:pb-0 px-margin-mobile md:px-margin-desktop">
                {view === 'explore' && !results && (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 md:py-24 max-w-container-max mx-auto w-full">
                        
                        <div className="w-full max-w-3xl text-center mb-8 relative z-10">
                            <h1 className="font-display-lg-mobile md:font-display-lg font-bold mb-8 gradient-text drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                                Where to next, Commander?
                            </h1>
                            <div className="glass-panel rounded-2xl p-4 md:p-6 shadow-2xl relative group focus-within:ring-2 focus-within:ring-secondary/50 transition-all duration-300">
                                <form onSubmit={handleSubmit}>
                                    <label htmlFor="trip-prompt" className="sr-only">Describe your trip</label>
                                    <textarea
                                        id="trip-prompt"
                                        ref={promptRef}
                                        className="w-full bg-transparent text-primary placeholder-on-surface-variant/50 border-none focus:ring-0 font-body-lg text-body-lg resize-none min-h-[120px] hide-scrollbar"
                                        placeholder="E.g., I need a 5-day high-octane itinerary in Neo-Tokyo focusing on cybernetic architecture, underground synthwave clubs, and street food. Budget is unrestricted."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    <div className="flex justify-between items-center mt-4 border-t border-white/5 pt-4">
                                        <MicrophoneButton 
                                            isRecording={isRecording} 
                                            isProcessing={isProcessingVoice} 
                                            toggleRecording={toggleRecording} 
                                        />
                                        <button
                                            type="submit"
                                            disabled={isLoading || !prompt.trim()}
                                            className="px-6 py-3 rounded-full bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-label-sm font-semibold flex items-center gap-2 glow-pulse hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 disabled:grayscale"
                                        >
                                            {isLoading ? 'Processing...' : 'Generate Itinerary'}
                                            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>rocket_launch</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {isLoading ? (
                            <React.Fragment>
                                <AgentDAG activeNodes={activeNodes} completedNodes={completedNodes} />

                                <div className="mt-6 w-full max-w-3xl bg-[#030712]/80 backdrop-blur-md border border-white/10 rounded-lg p-4 font-mono text-xs h-32 overflow-hidden relative font-label-sm shadow-inner">
                                    <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-[#030712]/80 to-transparent pointer-events-none z-10"></div>
                                    <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#030712] to-transparent pointer-events-none z-10"></div>
                                    <div className="space-y-2 text-on-surface-variant/80 flex flex-col justify-end h-full">
                                        {statusEvents.map((ev, i) => (
                                            <div key={i} className={`flex items-start gap-2 ${ev.status === 'active' ? 'text-primary' : 'text-on-surface-variant/60'}`}>
                                                <span className="text-secondary">&gt;</span>
                                                {AGENT_MESSAGES[ev.node]}
                                            </div>
                                        ))}
                                        <div className="flex items-start gap-2"><span className="text-tertiary animate-pulse">_</span></div>
                                    </div>
                                </div>
                            </React.Fragment>
                        ) : (
                            <DiscoverSection onExplore={handleDiscoverySelect} />
                        )}
                    </div>
                )}

                {view === 'explore' && results && (
                    <div className="max-w-container-max mx-auto w-full pb-24">
                        <FinalItinerary results={results} actionLabel="New Request" onAction={handleNewMission} />
                    </div>
                )}

                {view === 'itineraries' && !selectedMission && (
                    <ItinerariesList
                        missions={savedMissions}
                        onSelect={(id) => setSelectedMissionId(id)}
                        onDelete={handleDeleteMission}
                        onNewMission={handleNewMission}
                    />
                )}

                {view === 'itineraries' && selectedMission && (
                    <div className="max-w-container-max mx-auto w-full pb-24 pt-8 md:pt-4">
                        <button
                            type="button"
                            onClick={() => setSelectedMissionId(null)}
                            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-2 font-label-sm text-label-sm"
                        >
                            <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
                            Back to Mission Log
                        </button>
                        <FinalItinerary
                            results={selectedMission.results}
                            actionLabel="Back to Mission Log"
                            onAction={() => setSelectedMissionId(null)}
                            heading="Mission Archive"
                            subheading={`Retrieved from your mission log — logged ${new Date(selectedMission.savedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}.`}
                        />
                    </div>
                )}
            </main>
            <MobileBottomNav view={view} onNavigate={handleNavigate} />
        </React.Fragment>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
