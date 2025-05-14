import { NavBar } from "@/components/NavBar";
import { UploadSection } from "@/components/UploadSection";
import { RecordingList } from "@/components/RecordingList";

export default function Home() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UploadSection />
        <RecordingList />
      </div>
    </div>
  );
}
