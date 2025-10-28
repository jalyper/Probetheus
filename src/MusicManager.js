/**
 * Music Manager
 * Handles background music playback and settings
 */
class MusicManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        
        // Initialize settings
        if (!this.gameState.settings) {
            this.gameState.settings = {
                musicEnabled: true,
                musicVolume: 0.3, // 30% volume by default
                sfxEnabled: true,
                sfxVolume: 0.5
            };
        }
        
        // Create audio element
        this.mainTheme = new Audio('music/main-theme.wav');
        this.mainTheme.loop = true;
        this.mainTheme.volume = this.gameState.settings.musicVolume;
        
        // Track if music has started
        this.musicStarted = false;
        
        // Listen for settings changes
        this.eventBus.on('settings:musicToggle', this.toggleMusic.bind(this));
        this.eventBus.on('settings:musicVolume', this.setMusicVolume.bind(this));
        
        console.log('MusicManager initialized');
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
        
        try {
            await this.mainTheme.play();
            this.musicStarted = true;
            console.log('Music started playing');
        } catch (error) {
            console.warn('Could not auto-play music (browser restriction):', error.message);
            console.log('Music will start on user interaction');
            
            // Try to start on any user interaction
            const startOnInteraction = async () => {
                try {
                    await this.mainTheme.play();
                    this.musicStarted = true;
                    console.log('Music started after user interaction');
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
