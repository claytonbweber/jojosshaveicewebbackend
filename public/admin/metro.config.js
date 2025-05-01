/**
 * Metro configuration for React Native
 */
const { getDefaultConfig } = require('expo/metro-config');

// Create the default metro config
const config = getDefaultConfig(__dirname);

// Add MJS support for Firebase v9+
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json', 'mjs', 'cjs'];

// Add support for module resolution
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.extraNodeModules = {
  '@firebase/util': __dirname + '/node_modules/@firebase/util',
};

module.exports = config;