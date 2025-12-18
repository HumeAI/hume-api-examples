const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = false;
config.resolver.extraNodeModules = {
  stream: require.resolve('readable-stream'),
}
config.resolver.alias = {
  ws: 'isomorphic-ws',
}
module.exports = config;
