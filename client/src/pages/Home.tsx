import { NavBar } from "@/components/NavBar";
import { RecordingList } from "@/components/RecordingList";
import { RecordingControl } from "@/components/RecordingControl";
import { UploadButton } from "@/components/UploadButton";

export default function Home() {
  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">您的錄音檔</h1>
          <UploadButton />
        </div>
        <RecordingList />
      </div>
      <RecordingControl />
    </div>
  );
}
