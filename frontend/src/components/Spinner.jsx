import React from 'react';

const Spinner = ({ size = 'medium', text = 'Loading...' }) => {
  return (
    <div className={`spinner-container ${size}`}>
      <div className="spinner-circle"></div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
};

export default Spinner;
