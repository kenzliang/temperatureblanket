export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Location name */}
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="flex gap-2 items-center">
          {/* Temp */}
          <div className="h-7 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
          {/* Rain badge */}
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          {/* Snow badge */}
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
      <div className="mt-3">
        {/* "People" label */}
        <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="flex flex-wrap gap-3">
          {/* Checkbox + name placeholders */}
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
