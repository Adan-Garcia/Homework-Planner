import React, { createContext, useContext } from "react";
import PropTypes from "prop-types";
import { useTaskDragAndDrop } from "../hooks/useTaskDragAndDrop";

const DragDropContext = createContext();

export const useDragDrop = () => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error("useDragDrop must be used within a DragDropProvider");
  }
  return context;
};

export const DragDropProvider = ({ children }) => {
  
  const dragLogic = useTaskDragAndDrop();

  return (
    <DragDropContext.Provider value={dragLogic}>
      {children}
    </DragDropContext.Provider>
  );
};

DragDropProvider.propTypes = {
  children: PropTypes.node.isRequired,
};