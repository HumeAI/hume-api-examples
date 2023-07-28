import { AudioWidgets } from "./AudioWidgets";

export function ProsodyWidgets() {
  return (
    <div>
      <AudioWidgets modelName="prosody" recordingLengthMs={500} streamWindowLengthMs={5000} />
    </div>
  );
}
