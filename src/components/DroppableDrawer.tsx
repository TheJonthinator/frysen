import React from "react";
import { Card, CardContent, Typography, Stack, Box } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { DraggableItemCard } from "./DraggableItemCard";
import type { DroppableDrawerProps } from "../types";
import { KOKSBANKEN_DRAWER } from "../types";

export const DroppableDrawer: React.FC<DroppableDrawerProps> = ({
  drawerNumber,
  displayName,
  items,
  onEdit,
  onDelete,
  onDeleteAndAddToShoppingList,
  onIncreaseQuantity,
  onDecreaseQuantity,
  selectedItems,
  onItemSelect,
  dateDisplayMode,
  getDurationText,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: drawerNumber,
  });

  const getDrawerTitle = (drawerNum: number | string) => {
    // Use displayName if provided, otherwise fall back to legacy logic
    if (displayName) {
      return displayName;
    }

    // Handle legacy numeric IDs
    if (drawerNum === 1) {
      return "Köksbänken";
    } else if (drawerNum === 2) {
      return "Fack 1";
    } else if (drawerNum === 3) {
      return "Fack 2";
    } else {
      return `Låda ${Number(drawerNum) - 1}`;
    }
  };

  return (
    <Card
      ref={setNodeRef}
      sx={{
        mb: { xs: 0.5, sm: 1 },
        border: isOver ? "2px dashed" : "none",
        borderColor: isOver ? "primary.main" : "transparent",
        background: isOver
          ? "linear-gradient(145deg, rgba(57, 160, 237, 0.1), rgba(57, 160, 237, 0.05))"
          : "linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))",
        minHeight:
          items.length === 0
            ? drawerNumber === KOKSBANKEN_DRAWER ||
              drawerNumber === "Köksbänken"
              ? 60
              : 40
            : drawerNumber === KOKSBANKEN_DRAWER ||
              drawerNumber === "Köksbänken"
            ? 120
            : 80,
        borderRadius: 3,
        boxShadow: isOver
          ? "inset 2px 2px 5px rgba(0, 0, 0, 0.2), inset -2px -2px 5px rgba(255, 255, 255, 0.1)"
          : "inset 2px 2px 5px rgba(0, 0, 0, 0.2), inset -2px -2px 5px rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        // Override any Material-UI default shadows
        "& .MuiCard-root": {
          boxShadow: "none !important",
        },
        "&:hover": {
          boxShadow: isOver
            ? "inset 2px 2px 5px rgba(0, 0, 0, 0.2), inset -2px -2px 5px rgba(255, 255, 255, 0.1)"
            : "inset 2px 2px 5px rgba(0, 0, 0, 0.2), inset -2px -2px 5px rgba(255, 255, 255, 0.1)",
          background: isOver
            ? "linear-gradient(145deg, rgba(57, 160, 237, 0.1), rgba(57, 160, 237, 0.05))"
            : "linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))",
          border: isOver ? "2px dashed" : "none",
          borderColor: isOver ? "primary.main" : "transparent",
        },
      }}
    >
      <CardContent
        sx={{
          p: items.length === 0 ? { xs: 0.5, sm: 1 } : { xs: 1, sm: 1.5 },
          pb: items.length === 0 ? { xs: 0, sm: 0 } : { xs: 0, sm: 0 },
          "&.MuiCardContent-root": { pb: 5 },
          "&:last-child": { pb: 1.5 },
        }}
      >
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{
            mb: { xs: 0.5, sm: 1 },
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            fontWeight:
              drawerNumber === KOKSBANKEN_DRAWER ||
              drawerNumber === "Köksbänken"
                ? "bold"
                : "normal",
            color:
              drawerNumber === KOKSBANKEN_DRAWER ||
              drawerNumber === "Köksbänken"
                ? "primary.main"
                : "text.primary",
          }}
        >
          {getDrawerTitle(drawerNumber)}:
        </Typography>

        <Stack spacing={{ xs: 0.3, sm: 0.5 }}>
          {items.map((item, idx) => (
            <DraggableItemCard
              key={item.id}
              item={item}
              onEdit={(updates) => onEdit(drawerNumber, idx, updates)}
              onDelete={() => onDelete(drawerNumber, idx)}
              onDeleteAndAddToShoppingList={() =>
                onDeleteAndAddToShoppingList(drawerNumber, idx)
              }
              onIncreaseQuantity={() => onIncreaseQuantity(drawerNumber, idx)}
              onDecreaseQuantity={() => onDecreaseQuantity(drawerNumber, idx)}
              isSelected={selectedItems.has(item.id)}
              onSelect={() => onItemSelect(item.id)}
              dateDisplayMode={dateDisplayMode}
              getDurationText={getDurationText}
            />
          ))}
          {items.length === 0 && (
            <Box
              sx={{
                py: { xs: 0.5, sm: 1 },
                textAlign: "center",
                color: "text.secondary",
                background:
                  "linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))",
                border: isOver ? "2px dashed" : "1px solid",
                borderColor: isOver
                  ? "primary.main"
                  : "rgba(255, 255, 255, 0.1)",
                borderRadius: 2,
                opacity: 0.6,
                boxShadow:
                  "inset 1px 1px 3px rgba(0, 0, 0, 0.1), inset -1px -1px 3px rgba(255, 255, 255, 0.05)",
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}
              >
                {isOver ? "Släpp här för att flytta" : "— tomt —"}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
