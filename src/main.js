/**
 * Parse Server Cloud Functions Entry Point
 * 
 * This file registers all Cloud Functions and triggers.
 */

// Cloud Functions - Data
require('./cloud/notes');
require('./cloud/folders');
require('./cloud/sharing');

// Cloud Functions - AI
require('./cloud/ai');

// Cloud Functions - Upload
require('./cloud/upload');

// User functions
require('./user/user');

console.log('[Cloud] All Cloud Functions loaded');
