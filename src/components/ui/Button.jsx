import React from "react";

// Maps your "variant" prop to your CSS abstraction classes
const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger-soft",
  ghost: "btn-ghost",
  link: "btn-link",
};

const Button = ({ 
  children, 
  variant = "primary", 
  className = "", 
  icon: Icon,
  ...props 
}) => {
  return (
    <button 
      className={`btn-base ${VARIANTS[variant]} ${className}`} 
      {...props}
    >
      {Icon && <Icon className="icon-sm" />}
      {children}
    </button>
  );
};

export default Button;