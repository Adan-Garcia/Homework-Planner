import React from "react";
import PropTypes from "prop-types";

const Card = ({ children, className = "", hoverable = false, ...props }) => {
  const baseClass = hoverable ? "surface-card-hover" : "surface-card";
  return (
    <div 
      className={`${baseClass} border-base rounded-xl ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  hoverable: PropTypes.bool,
};

export default Card;