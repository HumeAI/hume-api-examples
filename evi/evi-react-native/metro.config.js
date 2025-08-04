const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add polyfills and resolver aliases
config.resolver.alias = {
  ...config.resolver.alias,
  // Core Node.js modules
  // stream: require.resolve('readable-stream'),
  // buffer: require.resolve('buffer'),
  // http: require.resolve('stream-http'),
  // https: require.resolve('https-browserify'),
  // url: require.resolve('whatwg-url'),
  // crypto: require.resolve('crypto-browserify'),
  // util: require.resolve('util'),
  // assert: require.resolve('assert'),
  // events: require.resolve('events'),
  // os: require.resolve('os-browserify/browser'),
  // path: require.resolve('path-browserify'),
  // querystring: require.resolve('querystring-es3'),
  // net: require.resolve('react-native-tcp-socket'),
  // tls: require.resolve('react-native-tcp-socket'),
  // zlib: require.resolve('browserify-zlib'),
  // fs: false,
  // module: false,
  // WebSocket library replacement
  // ws: require.resolve('./ws-shim.js'),
};

// Configure resolver to use polyfills
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Ensure aliases take precedence
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
