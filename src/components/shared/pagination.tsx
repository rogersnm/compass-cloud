"use client";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  nextCursor: string | null;
  onLoadMore: () => void;
  isLoading?: boolean;
}

export function Pagination({ nextCursor, onLoadMore, isLoading }: PaginationProps) {
  if (!nextCursor) {
    return null;
  }

  return (
    <div className="flex justify-center pt-4">
      <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
        {isLoading ? "Loading..." : "Load more"}
      </Button>
    </div>
  );
}
