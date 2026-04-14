import React from "react";
import PropTypes from "prop-types";
import { Card as ShadcnCard } from "@shadcn/ui";

/**
 * Card Component
 * Replaced with shadcn/ui Card for consistency and accessibility
 */
const Card = ({ children, className = "", hoverable = false, ...props }) => {
  return (
    <ShadcnCard className={`${hoverable ? "hoverable" : ""} ${className}`} {...props}>
      {children}
    </ShadcnCard>
  );
};

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  hoverable: PropTypes.bool,
};

export default Card;