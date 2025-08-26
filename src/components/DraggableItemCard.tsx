import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ItemCard } from "./ItemCard";
import type { DraggableItemCardProps } from "../types";

export const DraggableItemCard: React.FC<DraggableItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onDeleteAndAddToShoppingList,
  onIncreaseQuantity,
  onDecreaseQuantity,
  isSelected,
  onSelect,
  dateDisplayMode,
  getDurationText,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    touchAction: "none", // Prevents scrolling while dragging on touch devices
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="draggable-item"
    >
      <ItemCard
        item={item}
        onEdit={onEdit}
        onDelete={onDelete}
        onDeleteAndAddToShoppingList={onDeleteAndAddToShoppingList}
        onIncreaseQuantity={onIncreaseQuantity}
        onDecreaseQuantity={onDecreaseQuantity}
        isSelected={isSelected}
        onSelect={onSelect}
        dateDisplayMode={dateDisplayMode}
        getDurationText={getDurationText}
      />
    </div>
  );
};
