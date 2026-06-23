import { BANNER_STYLES, type AssessmentBanner } from "./assessmentUtils";

export function AssessmentBanners({ banners }: { banners: AssessmentBanner[] }) {
  if (!banners.length) return null;
  return (
    <div className="space-y-3">
      {banners.map((b, i) => (
        <div key={i} className={`rounded-xl border p-4 text-sm ${BANNER_STYLES[b.tone]}`}>
          <div className="font-semibold">{b.title}</div>
          <p className="mt-1 opacity-90">{b.detail}</p>
        </div>
      ))}
    </div>
  );
}
