import React from "react";

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

export default Card;