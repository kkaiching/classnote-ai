import { NavBar } from "@/components/NavBar";
import { RecordingDetail } from "@/components/RecordingDetail";
import { useParams } from "wouter";

export default function RecordingDetailPage() {
  const params = useParams();
  const recordingId = parseInt(params.id || "0");

  if (isNaN(recordingId) || recordingId <= 0) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <NavBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">無效的錄音 ID</h1>
            <p className="text-gray-600">請返回首頁選擇有效的錄音</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RecordingDetail recordingId={recordingId} />
      </div>
    </div>
  );
}
