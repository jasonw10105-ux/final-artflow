// src/components/ui/Button.tsx

import React from 'react';
import styles from './Button.module.css'; // We will create this style file next

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  isLoading = false, 
  ...props 
}) => {
  const variantClass = styles[variant] || styles.secondary;

  return (
    <button 
      className={`${styles.button} ${variantClass}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <span className={styles.loader}></span> : children}
    </button>
  );
};

export default Button;