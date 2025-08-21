const { withPodfile } = require('@expo/config-plugins');

const withHume = (config) => {
  return withPodfile(config, (config) => {
    const podfile = config.modResults;
    
    // Add Hume pod to the target
    const humeDepString = `  pod 'Hume', :git => 'https://github.com/HumeAI/hume-swift-sdk', :tag => '0.0.1-beta4'`;
    
    if (!podfile.contents.includes("pod 'Hume'")) {
      // Find the target section and add the dependency
      const targetMatch = podfile.contents.match(/(target ['"][^'"]+['"] do\s*\n)/);
      if (targetMatch) {
        const insertIndex = targetMatch.index + targetMatch[0].length;
        podfile.contents = 
          podfile.contents.slice(0, insertIndex) + 
          humeDepString + '\n' +
          podfile.contents.slice(insertIndex);
      }
    }

    // Add Swift package name configuration to existing post_install hook
    const humeSwiftConfig = `    # Configure Swift package name for Hume
    installer.pods_project.targets.each do |target|
      if target.name == 'Hume'
        target.build_configurations.each do |config|
          config.build_settings['OTHER_SWIFT_FLAGS'] ||= []
          config.build_settings['OTHER_SWIFT_FLAGS'] << '-package-name'
          config.build_settings['OTHER_SWIFT_FLAGS'] << 'Hume'
        end
      end
    end`;

    // Insert the Hume configuration into the existing post_install hook
    if (!podfile.contents.includes('Configure Swift package name for Hume')) {
      podfile.contents = podfile.contents.replace(
        /(post_install do \|installer\|\s*\n)/,
        `$1${humeSwiftConfig}\n\n`
      );
    }

    return config;
  });
};

module.exports = withHume;
