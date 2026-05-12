const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withCameraMaven(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Add the local maven repo right after mavenCentral() in allprojects
      config.modResults.contents = config.modResults.contents.replace(
        /mavenCentral\(\)/g,
        `mavenCentral()\n        maven { url new File(rootDir, "../node_modules/expo-camera/android/maven") }`
      );
    }
    return config;
  });
};
