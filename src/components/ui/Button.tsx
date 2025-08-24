
// src/components/ui/Button.tsx

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  isLoading = false, 
  className,
  ...props 
}) => {
  // Combine the base 'button' class with the variant class and any other classes passed in
  const buttonClassName = `button ${variant} ${className || ''}`.trim();

  return (
    <button 
      className={buttonClassName} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <span className="loader"></span> : children}
    </button>
  );
};

export default Button;