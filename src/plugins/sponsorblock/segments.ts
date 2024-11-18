// Segments are an array [ [start, end], … ]
import { Segment } from './types';

export const sortSegments = (
  segments: { segment: [number, number]; category: string }[]
) => {
  // Sort by start time, and by end time if start times are equal
  segments.sort((a, b) =>
    a.segment[0] === b.segment[0]
      ? a.segment[1] - b.segment[1]
      : a.segment[0] - b.segment[0]
  );

  const compiledSegments: { segment: [number, number]; category: string }[] = [];
  let currentSegment: { segment: [number, number]; category: string } | undefined;

  for (const segment of segments) {
    if (!currentSegment) {
      currentSegment = segment;
      continue;
    }

    // Check if the segments overlap or are adjacent AND belong to the same category
    if (
      currentSegment.segment[1] >= segment.segment[0] && // Overlapping or adjacent
      currentSegment.category === segment.category // Same category
    ) {
      // Merge the segments
      currentSegment.segment[1] = Math.max(
        currentSegment.segment[1],
        segment.segment[1]
      );
    } else {
      // Push the current segment and start a new one
      compiledSegments.push(currentSegment);
      currentSegment = segment;
    }
  }

  // Push the last segment if it exists
  if (currentSegment) {
    compiledSegments.push(currentSegment);
  }

  return compiledSegments;
};