"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
    const pathname = usePathname();

    return (
        <nav className="bg-white shadow-sm">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <Link
                            href="/"
                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                pathname === "/"
                                    ? "text-blue-600"
                                    : "text-gray-700 hover:text-blue-600"
                            }`}
                        >
                            GIS Interface
                        </Link>
                        <Link
                            href="/ndvi"
                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                pathname === "/ndvi"
                                    ? "text-blue-600"
                                    : "text-gray-700 hover:text-blue-600"
                            }`}
                        >
                            NDVI Processor
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
