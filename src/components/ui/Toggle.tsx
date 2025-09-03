// src/components/ui/Toggle.tsx
import React from 'react';

interface ToggleProps {
  checked: boolean; // The current checked state, controlled by parent
  onChange: (checked: boolean) => void; // Callback when the toggle changes
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Pass the new checked state back to the parent component
    onChange(e.target.checked);
  };

  return (
    <div className="toggle-wrapper">
      <input
        type="checkbox"
        id={`css-toggle-${Math.random().toString(36).substring(2, 9)}`} // Unique ID for accessibility
        className="hidden-checkbox"
        checked={checked}
        onChange={handleChange}
      />
      <label htmlFor={`css-toggle-${Math.random().toString(36).substring(2, 9)}`} className="toggle-label">
        <span className="toggle-slider"></span>
      </label>
    </div>
  );
};

export default Toggle;