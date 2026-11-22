import React from 'react';

export const SkeletonRow = ({ count = 5 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <tr key={`skeleton-${idx}`} className="skeleton-row">
          <td><div className="skeleton-box w-24"></div></td>
          <td><div className="skeleton-box w-48"></div></td>
          <td><div className="skeleton-box w-20"></div></td>
          <td><div className="skeleton-box w-16"></div></td>
          <td><div className="skeleton-box w-20 ml-auto"></div></td>
          <td><div className="skeleton-box w-16 mx-auto"></div></td>
        </tr>
      ))}
    </>
  );
};

export default SkeletonRow;
