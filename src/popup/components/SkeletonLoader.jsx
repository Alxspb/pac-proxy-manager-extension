const PacScriptsSkeleton = () => {
    return (
        <div className="space-y-6 min-h-[250px] animate-pulse">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-6 w-32 bg-gray-200 rounded"></div>
                </div>

                <div className="space-y-2">
                    <div className="border border-gray-200 rounded-md p-3">
                        <div className="flex justify-between items-center">
                            <div className="flex-1 mr-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-40 bg-gray-200 rounded"></div>
                                    <div className="h-4 w-12 bg-gray-200 rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-md p-3">
                        <div className="flex justify-between items-center">
                            <div className="flex-1 mr-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-48 bg-gray-200 rounded"></div>
                                    <div className="h-4 w-8 bg-gray-200 rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-md p-3">
                        <div className="flex justify-between items-center">
                            <div className="flex-1 mr-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-36 bg-gray-200 rounded"></div>
                                    <div className="h-4 w-10 bg-gray-200 rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center mt-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

const ProxiesSkeleton = () => {
    return (
        <div className="space-y-6 min-h-[250px] animate-pulse">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-6 w-36 bg-gray-200 rounded"></div>
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-11 bg-gray-200 rounded-full"></div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="border border-gray-200 rounded-md p-3">
                        <div className="flex justify-between items-center">
                            <div className="flex-1 mr-2">
                                <div className="h-4 w-64 bg-gray-200 rounded"></div>
                            </div>
                            <div className="flex gap-1">
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-md p-3">
                        <div className="flex justify-between items-center">
                            <div className="flex-1 mr-2">
                                <div className="h-4 w-52 bg-gray-200 rounded"></div>
                            </div>
                            <div className="flex gap-1">
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-md p-3">
                        <div className="flex justify-between items-center">
                            <div className="flex-1 mr-2">
                                <div className="h-4 w-48 bg-gray-200 rounded"></div>
                            </div>
                            <div className="flex gap-1">
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center mt-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

const ExceptionsSkeleton = () => {
    return (
        <div className="space-y-6 min-h-[250px] animate-pulse">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-6 w-24 bg-gray-200 rounded"></div>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-10 w-full bg-gray-200 rounded-md"></div>
                    </div>

                    <div>
                        <div className="h-4 w-40 bg-gray-200 rounded mb-3"></div>
                        <div className="flex gap-3">
                            <div className="h-8 w-16 bg-gray-200 rounded-md"></div>
                            <div className="h-8 w-12 bg-gray-200 rounded-md"></div>
                            <div className="h-8 w-12 bg-gray-200 rounded-md"></div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="h-8 w-full bg-gray-200 rounded-lg"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { PacScriptsSkeleton, ProxiesSkeleton, ExceptionsSkeleton };
