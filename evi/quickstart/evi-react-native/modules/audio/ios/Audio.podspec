Pod::Spec.new do |s|
  s.name           = 'Audio'
  s.version        = '0.0.1'
  s.summary        = 'This is a native module for internal use inside a React Native project.'
  s.description    = 'This native module provides basic (streaming) audio and playback capabilities necessary for communicating with EVI, the empathic voice interface from Hume AI'
  s.author         = 'Hume AI'
  s.homepage       = 'https://github.com/HumeAI/hume-api-examples/tree/main/evi-react-native-example'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
