import React, { useState } from "react";
import { Info, X } from "lucide-react";

export const DisclaimerBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-sky-50 border-b border-sky-200 px-4 py-2 text-xs text-sky-900 flex items-center justify-between">
      <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
        <Info className="w-4 h-4 text-sky-600 shrink-0" />
        <span>
          <strong>Academic & Civic Demo:</strong> Coimbatore CleanWater is an urban lake rejuvenation & GIS incident monitoring platform. Lake health scores and citizen reports represent simulated demonstration data.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-sky-600 hover:text-sky-800 p-1 rounded transition-colors"
        title="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
