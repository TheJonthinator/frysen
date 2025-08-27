import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Collapse,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { DroppableDrawer } from "./DroppableDrawer";
import { ItemCard } from "./ItemCard";
import type {
  Item,
  Container as ContainerType,
  DefaultDrawer,
  DateDisplayMode,
} from "../types";

interface ModularDrawerViewProps {
  defaultDrawer: DefaultDrawer;
  containers: Record<string, ContainerType>;
  onEdit: (drawerId: string, idx: number, updates: Partial<Item>) => void;
  onDelete: (drawerId: string, idx: number) => void;
  onDeleteAndAddToShoppingList: (drawerId: string, idx: number) => void;
  onIncreaseQuantity: (drawerId: string, idx: number) => void;
  onDecreaseQuantity: (drawerId: string, idx: number) => void;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string) => void;
  dateDisplayMode: DateDisplayMode;
  getDurationText: (date: Date) => string;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  activeItem: Item | null;
}

export const ModularDrawerView: React.FC<ModularDrawerViewProps> = React.memo(
  ({
    defaultDrawer,
    containers,
    onEdit,
    onDelete,
    onDeleteAndAddToShoppingList,
    onIncreaseQuantity,
    onDecreaseQuantity,
    selectedItems,
    onItemSelect,
    dateDisplayMode,
    getDurationText,
    onDragStart,
    onDragEnd,
    activeItem,
  }) => {
    console.log("🔄 [MODULAR] Received props:", { defaultDrawer, containers });

    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 3,
        },
      }),
      useSensor(TouchSensor, {
        activationConstraint: {
          delay: 250,
          tolerance: 5,
        },
      })
    );

    const sortedContainers = useMemo(
      () => Object.values(containers).sort((a, b) => a.order - b.order),
      [containers]
    );

    // Track which containers are expanded
    const [expandedContainers, setExpandedContainers] = useState<Set<string>>(
      new Set(sortedContainers.map((c) => c.id))
    );

    const toggleContainer = useCallback((containerId: string) => {
      setExpandedContainers((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(containerId)) {
          newSet.delete(containerId);
        } else {
          newSet.add(containerId);
        }
        return newSet;
      });
    }, []);

    return (
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <Box>
          {/* Default Drawer (Köksbänken) */}
          <Box sx={{ mb: { xs: 0.5, sm: 1 } }}>
            <DroppableDrawer
              drawerNumber={defaultDrawer.id}
              displayName={defaultDrawer.name}
              items={defaultDrawer.items}
              onEdit={(_, idx, updates) =>
                onEdit(defaultDrawer.id, idx, updates)
              }
              onDelete={(_, idx) => onDelete(defaultDrawer.id, idx)}
              onDeleteAndAddToShoppingList={(_, idx) =>
                onDeleteAndAddToShoppingList(defaultDrawer.id, idx)
              }
              onIncreaseQuantity={(_, idx) =>
                onIncreaseQuantity(defaultDrawer.id, idx)
              }
              onDecreaseQuantity={(_, idx) =>
                onDecreaseQuantity(defaultDrawer.id, idx)
              }
              selectedItems={selectedItems}
              onItemSelect={onItemSelect}
              dateDisplayMode={dateDisplayMode}
              getDurationText={getDurationText}
            />
          </Box>

          {/* Containers */}
          {sortedContainers.map((container) => (
            <Box key={container.id} sx={{ mb: { xs: 0.3, sm: 0.5 }, pb: 0 }}>
              <Card sx={{ mb: 0, pb: 0 }}>
                <CardContent
                  sx={{
                    p: 0,
                    mb: 0,
                    pb: 0,
                    "&:last-child": { pb: 0 },
                    "&.MuiCardContent-root": { pb: 0 },
                  }}
                >
                  <Box
                    sx={{
                      p: { xs: 0.3, sm: 0.5 },
                      pl: { xs: 0.5, sm: 1 },
                      cursor: "pointer",
                    }}
                    onClick={() => toggleContainer(container.id)}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 400,
                          fontSize: { xs: "0.65rem", sm: "0.75rem" },
                        }}
                      >
                        {container.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: { xs: "0.55rem", sm: "0.65rem" } }}
                        >
                          {Object.keys(container.drawers).length} lådor,{" "}
                          {Object.values(container.drawers).reduce(
                            (total, drawer) => total + drawer.items.length,
                            0
                          )}{" "}
                          varor
                        </Typography>
                        {expandedContainers.has(container.id) ? (
                          <ExpandLess sx={{ fontSize: 16 }} />
                        ) : (
                          <ExpandMore sx={{ fontSize: 16 }} />
                        )}
                      </Stack>
                    </Stack>
                  </Box>

                  <Collapse in={expandedContainers.has(container.id)}>
                    <Box
                      sx={{
                        pl: { xs: 0.5, sm: 1 },
                        pr: { xs: 0.5, sm: 1 },
                        pb: { xs: 0.5, sm: 1 },
                      }}
                    >
                      {Object.values(container.drawers).map((drawer) => (
                        <DroppableDrawer
                          key={drawer.id}
                          drawerNumber={drawer.id}
                          displayName={drawer.name}
                          items={drawer.items}
                          onEdit={(_, idx, updates) =>
                            onEdit(drawer.id, idx, updates)
                          }
                          onDelete={(_, idx) => onDelete(drawer.id, idx)}
                          onDeleteAndAddToShoppingList={(_, idx) =>
                            onDeleteAndAddToShoppingList(drawer.id, idx)
                          }
                          onIncreaseQuantity={(_, idx) =>
                            onIncreaseQuantity(drawer.id, idx)
                          }
                          onDecreaseQuantity={(_, idx) =>
                            onDecreaseQuantity(drawer.id, idx)
                          }
                          selectedItems={selectedItems}
                          onItemSelect={onItemSelect}
                          dateDisplayMode={dateDisplayMode}
                          getDurationText={getDurationText}
                        />
                      ))}
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>

        <DragOverlay>
          {activeItem ? (
            <ItemCard
              item={activeItem}
              onEdit={() => {}}
              onDelete={() => {}}
              onDeleteAndAddToShoppingList={() => {}}
              onIncreaseQuantity={() => {}}
              onDecreaseQuantity={() => {}}
              dateDisplayMode={dateDisplayMode}
              getDurationText={getDurationText}
              isDragging={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Only re-render if the actual data has changed
    return (
      prevProps.defaultDrawer === nextProps.defaultDrawer &&
      prevProps.containers === nextProps.containers &&
      prevProps.selectedItems === nextProps.selectedItems &&
      prevProps.dateDisplayMode === nextProps.dateDisplayMode &&
      prevProps.activeItem === nextProps.activeItem &&
      // Compare handler functions by reference (they should be memoized in parent)
      prevProps.onEdit === nextProps.onEdit &&
      prevProps.onDelete === nextProps.onDelete &&
      prevProps.onDeleteAndAddToShoppingList ===
        nextProps.onDeleteAndAddToShoppingList &&
      prevProps.onIncreaseQuantity === nextProps.onIncreaseQuantity &&
      prevProps.onDecreaseQuantity === nextProps.onDecreaseQuantity &&
      prevProps.onItemSelect === nextProps.onItemSelect &&
      prevProps.onDragStart === nextProps.onDragStart &&
      prevProps.onDragEnd === nextProps.onDragEnd &&
      prevProps.getDurationText === nextProps.getDurationText
    );
  }
);
