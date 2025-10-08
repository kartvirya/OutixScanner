const path = require('path');

module.exports = {
  dependencies: {
    'react-native-worklets-core': {
      root: path.resolve(__dirname, 'node_modules/react-native-worklets-core'),
    },
  },
  project: {
    ios: {
      sourceDir: path.resolve(__dirname, 'ios'),
    },
  },
  codegenConfig: {
    name: 'OutixScannerSpecs',
    jsSrcsDir: path.resolve(__dirname, 'src'),
    libraries: [
      {
        name: 'rnworklets',
        type: 'modules',
        jsSrcsDir: path.resolve(__dirname, 'node_modules/react-native-worklets-core/src'),
      },
    ],
  },
};
