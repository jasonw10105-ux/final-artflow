import React, { useState } from 'react';

const Toggle: React.FC = () => {
  const [checked, setChecked] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(e.target.checked);
    console.log('Toggled:', e.target.checked);
  };

  return (
    <div className="toggle-wrapper">
      <input
        type="checkbox"
        id="css-toggle"
        className="hidden-checkbox"
        checked={checked}
        onChange={handleChange}
      />
      <label htmlFor="css-toggle" className="toggle-label">
        <span className="toggle-slider"></span>
      </label>
    </div>
  );
};

export default Toggle;
