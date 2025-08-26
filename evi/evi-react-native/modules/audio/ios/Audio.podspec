Pod::Spec.new do |s|
  s.name           = 'Audio'
  s.version        = '0.0.1-beta5'
  s.summary        = 'This is a native module for internal use inside a React Native project.'
  s.description    = 'This native module provides basic (streaming) audio and playback capabilities necessary for communicating with EVI, the empathic voice interface from Hume AI'
  s.author         = ''
  s.homepage       = 'https://hume.ai'
  s.platforms      = {
    :ios => '16.0',
    :tvos => '16.0'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'Hume', '0.0.1-beta5'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
