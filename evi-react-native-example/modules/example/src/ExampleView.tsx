import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import { ExampleViewProps } from './Example.types';

const NativeView: React.ComponentType<ExampleViewProps> =
  requireNativeViewManager('Example');

export default function ExampleView(props: ExampleViewProps) {
  return <NativeView {...props} />;
}
