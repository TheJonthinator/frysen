import React from "react";
import { Card, CardContent, Typography, Stack, Box } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { DraggableItemCard } from "./DraggableItemCard";
import type { DroppableDrawerProps } from "../types";
import { KOKSBANKEN_DRAWER } from "../types";

export const DroppableDrawer: React.FC<DroppableDrawerProps> = ({
  drawerNumber,
  items,
  onEdit,
  onDelete,
  onIncreaseQuantity,
  onDecreaseQuantity,
  selectedItems,
  onItemSelect,
  dateDisplayMode,
  getDurationText,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `drawer-${drawerNumber}`,
  });

  const getDrawerTitle = (drawerNum: number) => {
    if (drawerNum === 1) {
      return "Köksbänken";
    } else if (drawerNum === 2) {
      return "Fack 1";
    } else if (drawerNum === 3) {
      return "Fack 2";
    } else {
      return `Låda ${drawerNum - 1}`;
    }
  };

  return (
    <Card
      ref={setNodeRef}
      sx={{
        mb: 1,
        border: isOver ? "2px dashed" : "1px solid",
        borderColor: isOver ? "primary.main" : "divider",
        bgcolor: isOver ? "action.hover" : "background.paper",
        minHeight: drawerNumber === KOKSBANKEN_DRAWER ? 120 : 80,
        "&:hover": {
          borderColor: "primary.main",
        },
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{
            mb: 1,
            fontSize: "0.875rem",
            fontWeight: drawerNumber === KOKSBANKEN_DRAWER ? "bold" : "normal",
            color:
              drawerNumber === KOKSBANKEN_DRAWER
                ? "primary.main"
                : "text.primary",
          }}
        >
          {getDrawerTitle(drawerNumber)}:
        </Typography>

        <Stack spacing={0.5}>
          {items.map((item, idx) => (
            <DraggableItemCard
              key={item.id}
              item={item}
              onEdit={(updates) => onEdit(drawerNumber, idx, updates)}
              onDelete={() => onDelete(drawerNumber, idx)}
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
                py: 2,
                textAlign: "center",
                color: "text.secondary",
                border: "2px dashed",
                borderColor: "primary.main",
                borderRadius: 1,
                opacity: 0.6,
              }}
            >
              <Typography variant="caption">
                {isOver ? "Släpp här för att flytta" : "— tomt —"}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
