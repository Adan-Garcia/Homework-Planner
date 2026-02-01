import React from "react";
import PropTypes from "prop-types";

/**
 * Button Component
 * * Reusable button with consistent styling and variants
 * * Supports icon integration with Lucide React
 * * Accessible with proper contrast ratios
 */
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

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost', 'link']),
  className: PropTypes.string,
  icon: PropTypes.elementType,
};

export default Button;