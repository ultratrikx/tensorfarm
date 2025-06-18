import NDVIProcessor from "../../components/NDVIProcessor";

export default function NDVIPage() {
    return (
        <div className="container mx-auto p-4 min-h-screen overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6">NDVI Image Processor</h1>
            <NDVIProcessor />
        </div>
    );
}
