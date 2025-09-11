/**
 * Advanced Name Generator
 * Creates semi-intelligible, pronounceable names using syllable patterns
 */
class NameGenerator {
    constructor() {
        // Consonant clusters and single consonants
        this.consonants = {
            simple: ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'x', 'z'],
            clusters: ['th', 'ch', 'sh', 'ph', 'gh', 'kh', 'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr', 'sc', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw'],
            exotic: ['zr', 'xr', 'vr', 'yr', 'zh', 'xh', 'vh', 'qr', 'rh'],
            alien: ['tl', 'tz', 'px', 'qx', 'ng', 'nk', 'nx', 'mx', 'rx', 'sx', 'zx', 'xk', 'kx', 'lx', 'rk', 'tk', 'pk', 'sk', 'zk']
        };
        
        // Vowels and diphthongs
        this.vowels = {
            simple: ['a', 'e', 'i', 'o', 'u'],
            long: ['ae', 'ai', 'ao', 'au', 'ea', 'ei', 'eo', 'eu', 'ia', 'ie', 'io', 'iu', 'oa', 'oe', 'oi', 'ou', 'ua', 'ue', 'ui', 'uo'],
            exotic: ['yr', 'yx', 'yth', 'ael', 'iel', 'oel'],
            alien: ['ix', 'ez', 'up', 'ar', 'ur', 'ik', 'ok', 'af', 'ov', 'eh', 'al', 'ip', 'os', 'uk', 'aw', 'ay']
        };
        
    }
    
    /**
     * Generate a random consonant
     */
    getRandomConsonant(mode = 'normal') {
        let pools = [this.consonants.simple, this.consonants.clusters];
        
        if (mode === 'exotic') {
            pools.push(this.consonants.exotic);
        } else if (mode === 'alien') {
            pools = [this.consonants.simple, this.consonants.alien];
            // 50% chance to use alien consonants for truly exotic feel
            if (Math.random() < 0.5) {
                pools = [this.consonants.alien];
            }
        }
        
        const pool = pools[Math.floor(Math.random() * pools.length)];
        return pool[Math.floor(Math.random() * pool.length)];
    }
    
    /**
     * Generate a random vowel
     */
    getRandomVowel(mode = 'normal') {
        let pools = [this.vowels.simple, this.vowels.long];
        
        if (mode === 'exotic') {
            pools.push(this.vowels.exotic);
        } else if (mode === 'alien') {
            pools = [this.vowels.simple, this.vowels.alien];
            // 40% chance to use alien vowels
            if (Math.random() < 0.4) {
                pools = [this.vowels.alien];
            }
        }
        
        const pool = pools[Math.floor(Math.random() * pools.length)];
        return pool[Math.floor(Math.random() * pool.length)];
    }
    
    /**
     * Generate a syllable (consonant-vowel or consonant-vowel-consonant)
     */
    generateSyllable(mode = 'normal') {
        let patterns = ['CV', 'CVC', 'VC', 'V'];
        
        // Alien names use simpler patterns but exotic sounds
        if (mode === 'alien') {
            patterns = ['CV', 'CVC', 'VC']; // Remove complex multi-syllable patterns
        }
        
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        let syllable = '';
        for (const char of pattern) {
            if (char === 'C') {
                syllable += this.getRandomConsonant(mode);
            } else if (char === 'V') {
                syllable += this.getRandomVowel(mode);
            }
        }
        
        return syllable;
    }
    
    /**
     * Generate a procedural name using syllables
     */
    generateProceduralName(minSyllables = 2, maxSyllables = 4, mode = 'normal') {
        const numSyllables = minSyllables + Math.floor(Math.random() * (maxSyllables - minSyllables + 1));
        let name = '';
        
        for (let i = 0; i < numSyllables; i++) {
            name += this.generateSyllable(mode);
        }
        
        // Capitalize first letter
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
    
    /**
     * Generate a procedural sector name (scientific designation)
     */
    generateSectorName(sectorType = 'Standard') {
        // Always use procedural names for sectors (scientific approach)
        const catalogPrefixes = ['S', 'SEC', 'X', 'Z', 'N', 'W', 'E', 'C'];
        const prefix = catalogPrefixes[Math.floor(Math.random() * catalogPrefixes.length)];
        
        // Generate base procedural name
        const baseName = this.generateProceduralName(2, 3, 'normal');
        
        // Add designation number
        const designation = Math.floor(Math.random() * 999) + 1;
        
        // 30% chance for just numbers, 70% chance for name-number combo
        if (Math.random() < 0.3) {
            return `${prefix}-${designation}`;
        } else {
            return `${baseName}-${designation}`;
        }
    }
    
    /**
     * Generate an exotic alien planet name (as named by native organisms)
     */
    generatePlanetName(planetType = 'Forest') {
        // Always generate exotic alien names - as if named by the dominant native organisms
        
        // Vary the syllable count based on planet type (some species prefer longer/shorter names)
        let minSyllables = 2;
        let maxSyllables = 4;
        
        // Environmental conditions might influence naming patterns
        switch (planetType) {
            case 'Molten':
            case 'Volcanic':
                // Hot worlds = shorter, sharper names
                minSyllables = 2;
                maxSyllables = 3;
                break;
            case 'Frozen':
                // Cold worlds = longer, flowing names (but not too long!)
                minSyllables = 2;
                maxSyllables = 3;
                break;
            case 'Toxic':
                // Harsh worlds = complex, guttural names
                minSyllables = 2;
                maxSyllables = 3;
                break;
            case 'Ocean':
                // Aquatic worlds = flowing, musical names
                minSyllables = 2;
                maxSyllables = 3;
                break;
            case 'Forest':
            case 'Crystal':
            case 'Desert':
                // Stable worlds = balanced, harmonious names
                minSyllables = 2;
                maxSyllables = 3;
                break;
        }
        
        // Generate purely alien name
        return this.generateProceduralName(minSyllables, maxSyllables, 'alien');
    }
    
    /**
     * Generate a star system name
     */
    generateStarName() {
        const catalogPrefixes = ['HD', 'HR', 'HIP', 'SAO', 'NGC', 'IC', 'M', 'GJ', 'LP'];
        const useDesignation = Math.random() < 0.4;
        
        if (useDesignation) {
            const prefix = catalogPrefixes[Math.floor(Math.random() * catalogPrefixes.length)];
            const number = Math.floor(Math.random() * 9999) + 1;
            return `${prefix} ${number}`;
        } else {
            return this.generateProceduralName(2, 4, Math.random() < 0.2);
        }
    }
}

// Export for use in other modules
window.NameGenerator = NameGenerator;