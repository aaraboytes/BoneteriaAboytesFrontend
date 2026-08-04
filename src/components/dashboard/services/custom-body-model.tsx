'use client';

import * as React from 'react';
import { bodyFront, bodyBack, outlineFront, outlineBack, femaleBodyFront, femaleBodyBack, femaleOutlineFront, femaleOutlineBack, BodyPart } from './body-data';

export const INDEPENDENT_MUSCLES = {
  // We keep this export just in case something else imports it.
};

interface BodyModelProps {
  data: string[]; // e.g. ["chest-left", "biceps-right"]
  highlightedColors: string[];
  type: 'anterior' | 'posterior';
  gender?: 'male' | 'female';
  onClick: (muscle: string) => void;
  style?: React.CSSProperties;
}

export const CustomBodyModel = React.memo(({ data, highlightedColors, type, gender = 'male', onClick, style }: BodyModelProps) => {
  const isFemale = gender === 'female';
  const modelData = type === 'anterior' ? (isFemale ? femaleBodyFront : bodyFront) : (isFemale ? femaleBodyBack : bodyBack);
  const outlinePath = type === 'anterior' ? (isFemale ? femaleOutlineFront : outlineFront) : (isFemale ? femaleOutlineBack : outlineBack);
  const bodyColor = '#B6BDC3';

  // Helper to flat out the raw data into individual muscle objects
  const flattened = React.useMemo(() => {
    const list: { id: string, paths: string[], color?: string }[] = [];
    modelData.forEach((part: BodyPart) => {
      const slug = part.slug;
      if (part.path.left) {
        list.push({ id: `${slug}-left`, paths: part.path.left, color: part.color });
      }
      if (part.path.right) {
        list.push({ id: `${slug}-right`, paths: part.path.right, color: part.color });
      }
      if (part.path.common) {
        list.push({ id: slug, paths: part.path.common, color: part.color });
      }
    });
    return list;
  }, [modelData]);

  // Use the viewBox dimensions designed for the SVG paths
  const maleViewBox = type === 'anterior' ? "0 0 724 1448" : "724 0 724 1448";
  const femaleViewBox = type === 'anterior' ? "-50 -40 734 1538" : "756 0 774 1448";
  const viewBox = isFemale ? femaleViewBox : maleViewBox;

  return (
    <div style={{ ...style, position: 'relative' }} className="rbh-wrapper">
      <svg
        className="rbh"
        width="100%"
        height="100%"
        viewBox={viewBox}
      >
        {/* Render Outline */}
        <path
           d={outlinePath}
           fill="#DFE5EB"
           stroke="#2A3C4E"
           strokeWidth="8"
           strokeLinejoin="round"
        />
        
        {/* Render Muscle Parts */}
        {flattened.map((item) => {
          const isSelected = data.includes(item.id);
          const fill = isSelected ? highlightedColors[0] : (item.color || bodyColor);

          return (
            <g key={item.id} onClick={() => onClick(item.id)} style={{ cursor: 'pointer' }}>
              {item.paths.map((pathStr, index) => (
                <path
                  key={`${item.id}-${index}`}
                  d={pathStr}
                  style={{
                    fill,
                    transition: 'fill 0.2s ease',
                  }}
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
});
CustomBodyModel.displayName = "CustomBodyModel";
