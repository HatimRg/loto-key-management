import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Virtual Scrolling Table Component
 * Only renders visible rows + buffer for smooth scrolling
 * Massive performance boost for large datasets (1000+ rows)
 * 
 * @param {Array} data - Full dataset
 * @param {Function} renderRow - Function to render each row
 * @param {number} rowHeight - Height of each row in pixels (default: 60)
 * @param {number} buffer - Number of extra rows to render above/below viewport (default: 5)
 * @param {string} className - Additional CSS classes
 */
function VirtualTable({ 
  data = [], 
  renderRow, 
  rowHeight = 60, 
  buffer = 5,
  className = '',
  maxHeight = '600px'
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollContainerRef = useRef(null);

  // Calculate visible range
  const { startIndex, endIndex, visibleData, offsetY, totalHeight } = useMemo(() => {
    if (!data.length) {
      return { startIndex: 0, endIndex: 0, visibleData: [], offsetY: 0, totalHeight: 0 };
    }

    const containerHeight = scrollContainerRef.current?.clientHeight || 600;
    const totalHeight = data.length * rowHeight;
    
    // Calculate which rows are visible
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    const endIndex = Math.min(
      data.length - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer
    );
    
    const visibleData = data.slice(startIndex, endIndex + 1);
    const offsetY = startIndex * rowHeight;

    return { startIndex, endIndex, visibleData, offsetY, totalHeight };
  }, [data, scrollTop, rowHeight, buffer]);

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${className}`}
      style={{ maxHeight }}
    >
      {/* Spacer to maintain total scroll height */}
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {/* Container for visible rows */}
        <div
          style={{
            position: 'absolute',
            top: `${offsetY}px`,
            left: 0,
            right: 0,
          }}
        >
          {visibleData.map((item, index) => renderRow(item, startIndex + index))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(VirtualTable);
