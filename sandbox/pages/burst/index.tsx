import { BurstWidgets } from "../../components/widgets/BurstWidgets";

export default function BurstPage() {
  return (
    <div className="px-6 pt-10 pb-20 sm:px-10 md:px-14">
      <div className="pb-3 text-2xl font-medium text-neutral-800">Vocal Burst</div>
      <div className="pb-6">
        Vocal bursts are non-linguistic vocal utterances, including laughs, sighs, oohs, ahhs, umms, gasps, and groans.
      </div>
      <BurstWidgets />
    </div>
  );
}
