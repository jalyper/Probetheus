/**
 * Storage Adapter - Unified interface for localStorage (web) and electron-store (desktop)
 * Automatically detects environment and uses appropriate storage backend
 */
class StorageAdapter {
    constructor() {
        // Detect if running in Electron
        this.isElectron = typeof window !== 'undefined' && window.electronAPI;
        this.storage = this.isElectron ? window.electronAPI.storage : null;
        
        console.log(`Storage Adapter initialized: ${this.isElectron ? 'Electron' : 'Web'} mode`);
        
        if (this.isElectron) {
            // Log save file location in Electron
            this.storage.getPath().then(path => {
                console.log('Save files location:', path);
            });
        }
    }

    /**
     * Get item from storage
     * @param {string} key - Storage key
     * @returns {Promise<string|null>} - Stored value or null
     */
    async getItem(key) {
        if (this.isElectron) {
            try {
                const value = await this.storage.get(key);
                // electron-store returns undefined for missing keys, convert to null for consistency
                return value === undefined ? null : value;
            } catch (error) {
                console.error('StorageAdapter getItem error:', error);
                return null;
            }
        } else {
            // Web mode - use localStorage
            return localStorage.getItem(key);
        }
    }

    /**
     * Set item in storage
     * @param {string} key - Storage key
     * @param {string} value - Value to store
     * @returns {Promise<boolean>} - Success status
     */
    async setItem(key, value) {
        if (this.isElectron) {
            try {
                const result = await this.storage.set(key, value);
                return result.success !== false;
            } catch (error) {
                console.error('StorageAdapter setItem error:', error);
                return false;
            }
        } else {
            // Web mode - use localStorage
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (error) {
                console.error('localStorage setItem error:', error);
                return false;
            }
        }
    }

    /**
     * Remove item from storage
     * @param {string} key - Storage key
     * @returns {Promise<boolean>} - Success status
     */
    async removeItem(key) {
        if (this.isElectron) {
            try {
                const result = await this.storage.remove(key);
                return result.success !== false;
            } catch (error) {
                console.error('StorageAdapter removeItem error:', error);
                return false;
            }
        } else {
            // Web mode - use localStorage
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('localStorage removeItem error:', error);
                return false;
            }
        }
    }

    /**
     * Check if key exists in storage
     * @param {string} key - Storage key
     * @returns {Promise<boolean>} - Whether key exists
     */
    async has(key) {
        if (this.isElectron) {
            try {
                return await this.storage.has(key);
            } catch (error) {
                console.error('StorageAdapter has error:', error);
                return false;
            }
        } else {
            // Web mode - use localStorage
            return localStorage.getItem(key) !== null;
        }
    }

    /**
     * Get all storage keys
     * @returns {Promise<string[]>} - Array of keys
     */
    async keys() {
        if (this.isElectron) {
            try {
                return await this.storage.keys();
            } catch (error) {
                console.error('StorageAdapter keys error:', error);
                return [];
            }
        } else {
            // Web mode - use localStorage
            return Object.keys(localStorage);
        }
    }

    /**
     * Clear all storage
     * @returns {Promise<boolean>} - Success status
     */
    async clear() {
        if (this.isElectron) {
            try {
                const result = await this.storage.clear();
                return result.success !== false;
            } catch (error) {
                console.error('StorageAdapter clear error:', error);
                return false;
            }
        } else {
            // Web mode - use localStorage
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('localStorage clear error:', error);
                return false;
            }
        }
    }

    /**
     * Synchronous getItem for backward compatibility
     * WARNING: Only works in web mode! Use async getItem() for Electron compatibility
     * @deprecated Use async getItem() instead
     */
    getItemSync(key) {
        if (this.isElectron) {
            console.warn('getItemSync called in Electron mode - this will not work! Use async getItem()');
            return null;
        }
        return localStorage.getItem(key);
    }

    /**
     * Synchronous setItem for backward compatibility
     * WARNING: Only works in web mode! Use async setItem() for Electron compatibility
     * @deprecated Use async setItem() instead
     */
    setItemSync(key, value) {
        if (this.isElectron) {
            console.warn('setItemSync called in Electron mode - this will not work! Use async setItem()');
            return false;
        }
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error('localStorage setItem error:', error);
            return false;
        }
    }

    /**
     * Synchronous removeItem for backward compatibility
     * WARNING: Only works in web mode! Use async removeItem() for Electron compatibility
     * @deprecated Use async removeItem() instead
     */
    removeItemSync(key) {
        if (this.isElectron) {
            console.warn('removeItemSync called in Electron mode - this will not work! Use async removeItem()');
            return false;
        }
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('localStorage removeItem error:', error);
            return false;
        }
    }
}

// Create singleton instance
const storageAdapter = new StorageAdapter();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = storageAdapter;
}
