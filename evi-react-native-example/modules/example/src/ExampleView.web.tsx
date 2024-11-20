import * as React from 'react';

import { ExampleViewProps } from './Example.types';

export default function ExampleView(props: ExampleViewProps) {
  return (
    <div>
      <span>{props.name}</span>
    </div>
  );
}
