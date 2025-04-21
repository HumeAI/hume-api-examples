import { ProsodyWidgets } from "../../components/widgets/ProsodyWidgets";

export default function ProsodyPage() {
  return (
    <div className="px-6 pt-10 pb-20 sm:px-10 md:px-14">
      <div className="pb-3 text-2xl font-medium text-neutral-800">Speech Prosody</div>
      <div className="pb-6">Speech prosody is not about the words you say, but the way you say them.</div>
      <ProsodyWidgets />
    </div>
  );
}
