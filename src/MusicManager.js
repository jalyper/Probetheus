/**
 * Music Manager
 * Handles background music playback and settings
 */
class MusicManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        
        // Music track library (full LoFi set, 2026-06-11)
        this.tracks = [
            { id: 'fire-and-brimstone', name: 'Fire And Brimstone', file: 'public/music/fire-and-brimstone.wav' },
            { id: 'saintly-or-evil', name: 'Saintly Or Evil', file: 'public/music/saintly-or-evil.wav' },
            { id: 'dangerous-fortune', name: 'Dangerous Fortune', file: 'public/music/dangerous-fortune.wav' },
            { id: 'bards-roadsong', name: "Bard's Roadsong", file: 'public/music/bards-roadsong.wav' },
            { id: 'liliana', name: 'Liliana', file: 'public/music/liliana.wav' }
        ];
        
        // Initialize settings
        if (!this.gameState.settings) {
            this.gameState.settings = {
                musicEnabled: true,
                musicVolume: 0.3,
                musicMode: 'sequential', // 'sequential' or 'single'
                selectedTrack: 'fire-and-brimstone',
                sfxEnabled: true,
                sfxVolume: 0.5
            };
        }
        
        // Ensure music settings exist
        if (!this.gameState.settings.musicMode) {
            this.gameState.settings.musicMode = 'sequential';
        }
        if (!this.gameState.settings.selectedTrack ||
            !this.tracks.some(t => t.id === this.gameState.settings.selectedTrack)) {
            // Missing or stale (pre-2026-06-11 library) selection
            this.gameState.settings.selectedTrack = this.tracks[0].id;
        }
        
        // Create audio element
        console.log('Initializing music system...');
        console.log('Current location:', window.location.href);
        
        this.mainTheme = new Audio();
        this.mainTheme.volume = this.gameState.settings.musicVolume;
        
        // Track current index for sequential playback
        this.currentTrackIndex = 0;
        
        // Track if music has started
        this.musicStarted = false;
        
        // Handle track ending
        this.mainTheme.addEventListener('ended', () => {
            this.onTrackEnded();
        });
        
        // Listen for settings changes
        this.eventBus.on('settings:musicToggle', this.toggleMusic.bind(this));
        this.eventBus.on('settings:musicVolume', this.setMusicVolume.bind(this));
        this.eventBus.on('settings:musicMode', this.setMusicMode.bind(this));
        this.eventBus.on('settings:selectTrack', this.selectTrack.bind(this));
        
        console.log('MusicManager initialized with', this.tracks.length, 'tracks');
    }
    
    /**
     * Start playing music (requires user interaction first)
     */
    async startMusic() {
        if (!this.gameState.settings.musicEnabled) {
            console.log('Music is disabled in settings');
            return;
        }
        
        if (this.musicStarted) {
            console.log('Music already started');
            return;
        }
        
        // Load initial track
        this.loadTrack();
        
        try {
            await this.mainTheme.play();
            this.musicStarted = true;
            console.log('Music started playing:', this.getCurrentTrack().name);
        } catch (error) {
            console.warn('Could not auto-play music (browser restriction):', error.message);
            console.log('Music will start on user interaction');
            
            // Try to start on any user interaction
            const startOnInteraction = async () => {
                try {
                    await this.mainTheme.play();
                    this.musicStarted = true;
                    console.log('Music started after user interaction:', this.getCurrentTrack().name);
                    document.removeEventListener('click', startOnInteraction);
                    document.removeEventListener('keydown', startOnInteraction);
                } catch (e) {
                    // Still blocked, will try again on next interaction
                }
            };
            
            document.addEventListener('click', startOnInteraction, { once: true });
            document.addEventListener('keydown', startOnInteraction, { once: true });
        }
    }
    
    /**
     * Load a track into the audio element
     */
    loadTrack() {
        const track = this.getCurrentTrack();
        console.log('Loading track:', track.name);
        
        // Try primary path (Electron dev)
        this.mainTheme.src = track.file;
        
        // Fallback paths in error handlers
        this.mainTheme.addEventListener('error', (e) => {
            console.warn('Failed to load:', track.file, '- trying alternative...');
            this.mainTheme.src = track.file.replace('public/', '');
            
            this.mainTheme.addEventListener('error', (e2) => {
                console.warn('Failed alternative, trying absolute...');
                this.mainTheme.src = '/' + track.file.replace('public/', '');
            }, { once: true });
        }, { once: true });
    }
    
    /**
     * Get current track based on mode
     */
    getCurrentTrack() {
        if (this.gameState.settings.musicMode === 'single') {
            // Single track mode - play selected track
            return this.tracks.find(t => t.id === this.gameState.settings.selectedTrack) || this.tracks[0];
        } else {
            // Sequential mode - play tracks in order
            return this.tracks[this.currentTrackIndex];
        }
    }
    
    /**
     * Handle track ending
     */
    onTrackEnded() {
        if (this.gameState.settings.musicMode === 'single') {
            // Loop the same track
            this.mainTheme.play();
        } else {
            // Sequential mode - go to next track
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
            console.log('Next track:', this.getCurrentTrack().name);
            this.loadTrack();
            this.mainTheme.play();
        }
    }
    
    /**
     * Stop music
     */
    stopMusic() {
        this.mainTheme.pause();
        this.mainTheme.currentTime = 0;
        this.musicStarted = false;
        console.log('Music stopped');
    }
    
    /**
     * Toggle music on/off
     */
    toggleMusic() {
        this.gameState.settings.musicEnabled = !this.gameState.settings.musicEnabled;
        
        if (this.gameState.settings.musicEnabled) {
            this.startMusic();
        } else {
            this.stopMusic();
        }
        
        console.log('Music', this.gameState.settings.musicEnabled ? 'enabled' : 'disabled');
        return this.gameState.settings.musicEnabled;
    }
    
    /**
     * Set music volume (0.0 to 1.0)
     */
    setMusicVolume(volume) {
        this.gameState.settings.musicVolume = Math.max(0, Math.min(1, volume));
        this.mainTheme.volume = this.gameState.settings.musicVolume;
        console.log('Music volume set to', (this.gameState.settings.musicVolume * 100).toFixed(0) + '%');
    }
    
    /**
     * Set music playback mode
     */
    setMusicMode(mode) {
        this.gameState.settings.musicMode = mode;
        console.log('Music mode set to:', mode);
        
        // If switching to single track mode, load the selected track
        if (mode === 'single' && this.musicStarted) {
            this.stopMusic();
            this.startMusic();
        }
    }
    
    /**
     * Select a specific track (for single track mode)
     */
    selectTrack(trackId) {
        this.gameState.settings.selectedTrack = trackId;
        console.log('Selected track:', trackId);
        
        // If in single track mode and music is playing, switch to new track
        if (this.gameState.settings.musicMode === 'single' && this.musicStarted) {
            this.stopMusic();
            this.startMusic();
        }
    }
    
    /**
     * Get available tracks
     */
    getTracks() {
        return this.tracks;
    }
    
    /**
     * Get current music state
     */
    isMusicEnabled() {
        return this.gameState.settings.musicEnabled;
    }
    
    /**
     * Get current music volume
     */
    getMusicVolume() {
        return this.gameState.settings.musicVolume;
    }
}

// Export for use in other modules
window.MusicManager = MusicManager;
