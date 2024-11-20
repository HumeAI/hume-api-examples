import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to Example.web.ts
// and on native platforms to Example.ts
import ExampleModule from './src/ExampleModule';
import ExampleView from './src/ExampleView';
import { ChangeEventPayload, ExampleViewProps } from './src/Example.types';

// Get the native constant value.
export const PI = ExampleModule.PI;

export function hello(): string {
  return ExampleModule.hello();
}

export async function setValueAsync(value: string) {
  return await ExampleModule.setValueAsync(value);
}

const emitter = new EventEmitter(ExampleModule ?? NativeModulesProxy.Example);

export function addChangeListener(listener: (event: ChangeEventPayload) => void): Subscription {
  return emitter.addListener<ChangeEventPayload>('onChange', listener);
}

export { ExampleView, ExampleViewProps, ChangeEventPayload };
