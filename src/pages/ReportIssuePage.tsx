import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  Camera,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  UploadCloud,
  Layers,
  ArrowRight,
  RefreshCw,
  Info,
  ShieldAlert,
} from "lucide-react";
import { api } from "../services/api";
import { Lake, IssueCategory, IncidentSeverity, DuplicateCheckResult } from "../types";

// Pin marker for location selection
const pinIcon = L.divIcon({
  html: `
    <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 20px; height: 20px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4);"></div>
    </div>
  `,
  className: "custom-pin-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function LocationPickerMap({
  coords,
  onCoordsChange,
}: {
  coords: { lat: number; lng: number };
  onCoordsChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onCoordsChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return <Marker position={[coords.lat, coords.lng]} icon={pinIcon} />;
}

export const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [lakes, setLakes] = useState<Lake[]>([]);
  const [categories, setCategories] = useState<IssueCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReport, setSuccessReport] = useState<{ id: number; report_code: string } | null>(null);

  // Form Fields
  const [selectedLakeId, setSelectedLakeId] = useState<number>(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(1);
  const [severity, setSeverity] = useState<IncidentSeverity>("MEDIUM");
  const [description, setDescription] = useState<string>("");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number }>({
    lat: Number(searchParams.get("lat")) || 10.9925,
    lng: Number(searchParams.get("lng")) || 76.9614,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Duplicate Check
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDupes, setIsCheckingDupes] = useState(false);

  useEffect(() => {
    const loadInit = async () => {
      try {
        const [lakesData, catsData] = await Promise.all([api.getLakes(), api.getCategories()]);
        setLakes(lakesData);
        setCategories(catsData);
        if (lakesData.length > 0 && !searchParams.get("lat")) {
          setSelectedLakeId(lakesData[0].id);
          setLocationCoords({ lat: lakesData[0].latitude, lng: lakesData[0].longitude });
        }
      } catch (err) {
        console.error("Failed to load setup options", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInit();
  }, [searchParams]);

  // Check for duplicates whenever lake, category, or location changes
  useEffect(() => {
    const runDupeCheck = async () => {
      if (!selectedCategoryId || !locationCoords.lat) return;
      setIsCheckingDupes(true);
      try {
        const res = await api.checkDuplicates({
          category_id: selectedCategoryId,
          latitude: locationCoords.lat,
          longitude: locationCoords.lng,
          threshold_meters: 300,
        });
        setDuplicateCheck(res);
      } catch (e) {
        console.warn("Duplicate check error", e);
      } finally {
        setIsCheckingDupes(false);
      }
    };

    const timer = setTimeout(runDupeCheck, 500);
    return () => clearTimeout(timer);
  }, [selectedCategoryId, locationCoords.lat, locationCoords.lng]);

  const handleLakeChange = (lakeId: number) => {
    setSelectedLakeId(lakeId);
    const lake = lakes.find((l) => l.id === lakeId);
    if (lake) {
      setLocationCoords({ lat: lake.latitude, lng: lake.longitude });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const setSamplePhoto = (url: string) => {
    setImagePreview(url);
    setImageFile(null); // URL directly passed
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.length < 5) {
      alert("Please provide a descriptive observation (at least 5 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = imagePreview;

      // If actual file uploaded, upload first
      if (imageFile) {
        const uploadRes = await api.uploadPhoto(imageFile);
        finalImageUrl = uploadRes.image_url;
      }

      const res = await api.createIncident({
        lake_id: selectedLakeId,
        category_id: selectedCategoryId,
        description,
        severity,
        latitude: locationCoords.lat,
        longitude: locationCoords.lng,
        image_url: finalImageUrl || undefined,
      });

      setSuccessReport({ id: res.id, report_code: res.report_code });
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successReport) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Environmental Report Submitted</h2>
          <p className="text-slate-600 text-sm mb-6">
            Thank you for helping safeguard Coimbatore&apos;s lakes. Your incident has been registered in the municipal GIS database and prioritized for field inspection.
          </p>

          <div className="inline-block bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 mb-8">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              Tracking Identifier
            </span>
            <span className="font-mono text-2xl font-bold text-sky-700">{successReport.report_code}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(`/incidents/${successReport.id}`)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-xs"
            >
              <span>Track Report Progress</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSuccessReport(null);
                setDescription("");
                setImagePreview(null);
                setImageFile(null);
              }}
              className="w-full sm:w-auto px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Report Environmental Issue</h1>
        <p className="text-sm text-slate-600 mt-1">
          Spot garbage dumping, sewage inflows, water hyacinth, or damaged infrastructure around Coimbatore&apos;s lakes.
        </p>
      </div>

      {/* Duplicate Warning Box */}
      {duplicateCheck && duplicateCheck.has_duplicate && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <span className="font-bold text-sm block mb-1">
              Nearby Similar Report Detected ({duplicateCheck.duplicate_count})
            </span>
            <p className="mb-2">
              Our GIS spatial duplicate detector noticed {duplicateCheck.duplicate_count} unresolved incident(s) in this category within 300 meters:
            </p>
            <div className="space-y-1 bg-white/70 p-2.5 rounded-lg border border-amber-200 font-mono">
              {duplicateCheck.existing_incidents.slice(0, 2).map((dup) => (
                <div key={dup.id} className="flex items-center justify-between text-[11px]">
                  <span>{dup.report_code}: {dup.description.slice(0, 45)}...</span>
                  <span className="text-amber-700 font-bold capitalize">{dup.status}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-amber-700 mt-2">
              You may still proceed with your submission if this is a recurring or newly aggravated issue.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Step 1: Select Lake & Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              1. Affected Coimbatore Lake
            </label>
            <select
              value={selectedLakeId}
              onChange={(e) => handleLakeChange(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {lakes.map((lake) => (
                <option key={lake.id} value={lake.id}>
                  {lake.name} ({lake.area_hectares} ha)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              2. Environmental Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            3. Estimated Severity
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { level: "LOW", label: "Low", desc: "Minor litter / light weed", color: "border-emerald-300 bg-emerald-50 text-emerald-900" },
              { level: "MEDIUM", label: "Medium", desc: "Moderate refuse accumulation", color: "border-sky-300 bg-sky-50 text-sky-900" },
              { level: "HIGH", label: "High", desc: "Significant sewage / dumping", color: "border-amber-300 bg-amber-50 text-amber-900" },
              { level: "CRITICAL", label: "Critical", desc: "Active chemical or major sewer outfall", color: "border-rose-300 bg-rose-50 text-rose-900" },
            ].map((s) => (
              <button
                type="button"
                key={s.level}
                onClick={() => setSeverity(s.level as IncidentSeverity)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${
                  severity === s.level
                    ? `${s.color} ring-2 ring-sky-500 font-bold`
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <div className="font-semibold text-xs">{s.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            4. Detailed Observation & Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe what you observed (e.g. plastic waste accumulated near eastern weir, sewer pipe bubbling up near walking track)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            required
          />
        </div>

        {/* GIS Pin Location Map */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              5. Pinpoint GIS Location on Map
            </label>
            <span className="font-mono text-xs text-slate-500">
              Lat: {locationCoords.lat.toFixed(5)}, Lng: {locationCoords.lng.toFixed(5)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            Click anywhere on the lake perimeter map to drop or reposition the incident marker:
          </p>
          <div className="w-full h-56 rounded-xl overflow-hidden border border-slate-200 relative">
            <MapContainer
              center={[locationCoords.lat, locationCoords.lng]}
              zoom={14}
              scrollWheelZoom={false}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPickerMap
                coords={locationCoords}
                onCoordsChange={(lat, lng) => setLocationCoords({ lat, lng })}
              />
            </MapContainer>
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            6. Evidence Photo (Optional but Recommended)
          </label>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <label className="w-full sm:w-1/2 border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-sky-50/50">
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <span className="text-xs font-semibold text-slate-700 block">
                Click or drag & drop photo here
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Supports JPG, PNG, WEBP (Up to 10MB)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>

            {/* Preview or Quick Samples */}
            <div className="w-full sm:w-1/2">
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 h-36 bg-slate-100">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageFile(null);
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-md text-xs hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-600 block mb-2">
                    Or select a demo photo for testing:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: "Plastic Refuse",
                        url: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&auto=format&fit=crop&q=80",
                      },
                      {
                        label: "Sewage Inflow",
                        url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80",
                      },
                      {
                        label: "Weed Bloom",
                        url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
                      },
                    ].map((demo, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setSamplePhoto(demo.url)}
                        className="group relative rounded-lg overflow-hidden border border-slate-200 hover:border-sky-500 transition-colors h-16"
                      >
                        <img
                          src={demo.url}
                          alt={demo.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] py-0.5 truncate px-1">
                          {demo.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-xs shadow-sky-200 transition-colors"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting to GIS...</span>
              </>
            ) : (
              <span>Submit Report</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
