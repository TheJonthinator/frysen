import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import type { Container, ContainerDrawer } from "../types";

interface ContainerManagerProps {
  containers: Record<string, Container>;
  onAddContainer: (container: Omit<Container, "id">) => void;
  onUpdateContainer: (id: string, updates: Partial<Container>) => void;
  onDeleteContainer: (id: string) => void;
  onAddDrawer: (
    containerId: string,
    drawer: Omit<ContainerDrawer, "id">
  ) => void;
  onUpdateDrawer: (
    containerId: string,
    drawerId: string,
    updates: Partial<ContainerDrawer>
  ) => void;
  onDeleteDrawer: (containerId: string, drawerId: string) => void;
}

export const ContainerManager: React.FC<ContainerManagerProps> = ({
  containers,
  onAddContainer,
  onUpdateContainer,
  onDeleteContainer,
  onAddDrawer,
  onUpdateDrawer,
  onDeleteDrawer,
}) => {
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(
    new Set()
  );
  const [showAddContainerDialog, setShowAddContainerDialog] = useState(false);
  const [showAddDrawerDialog, setShowAddDrawerDialog] = useState<string | null>(
    null
  );
  const [newContainerTitle, setNewContainerTitle] = useState("");
  const [newDrawerName, setNewDrawerName] = useState("");

  // Edit states
  const [editingContainer, setEditingContainer] = useState<string | null>(null);
  const [editingDrawer, setEditingDrawer] = useState<{
    containerId: string;
    drawerId: string;
  } | null>(null);
  const [editContainerTitle, setEditContainerTitle] = useState("");
  const [editDrawerName, setEditDrawerName] = useState("");

  const toggleContainerExpansion = (containerId: string) => {
    const newExpanded = new Set(expandedContainers);
    if (newExpanded.has(containerId)) {
      newExpanded.delete(containerId);
    } else {
      newExpanded.add(containerId);
    }
    setExpandedContainers(newExpanded);
  };

  const handleAddContainer = () => {
    if (newContainerTitle.trim()) {
      const newContainer: Omit<Container, "id"> = {
        title: newContainerTitle.trim(),
        drawers: {},
        order: Object.keys(containers).length,
      };
      onAddContainer(newContainer);
      setNewContainerTitle("");
      setShowAddContainerDialog(false);
    }
  };

  const handleEditContainer = (containerId: string) => {
    const container = containers[containerId];
    if (container) {
      setEditContainerTitle(container.title);
      setEditingContainer(containerId);
    }
  };

  const handleSaveContainerEdit = () => {
    if (editingContainer && editContainerTitle.trim()) {
      onUpdateContainer(editingContainer, { title: editContainerTitle.trim() });
      setEditingContainer(null);
      setEditContainerTitle("");
    }
  };

  const handleEditDrawer = (containerId: string, drawerId: string) => {
    const drawer = containers[containerId]?.drawers[drawerId];
    if (drawer) {
      setEditDrawerName(drawer.name);
      setEditingDrawer({ containerId, drawerId });
    }
  };

  const handleSaveDrawerEdit = () => {
    if (editingDrawer && editDrawerName.trim()) {
      onUpdateDrawer(editingDrawer.containerId, editingDrawer.drawerId, {
        name: editDrawerName.trim(),
      });
      setEditingDrawer(null);
      setEditDrawerName("");
    }
  };

  const getTotalItemsInContainer = (container: Container) => {
    return Object.values(container.drawers).reduce(
      (total, drawer) => total + drawer.items.length,
      0
    );
  };

  const handleAddDrawer = (containerId: string) => {
    if (newDrawerName.trim()) {
      const newDrawer: Omit<ContainerDrawer, "id"> = {
        name: newDrawerName.trim(),
        items: [],
      };
      onAddDrawer(containerId, newDrawer);
      setNewDrawerName("");
      setShowAddDrawerDialog(null);
    }
  };

  const sortedContainers = Object.values(containers).sort(
    (a, b) => a.order - b.order
  );

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">Containers</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setShowAddContainerDialog(true)}
        >
          Add Container
        </Button>
      </Stack>

      {sortedContainers.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              No containers yet. Add your first container to get started!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {sortedContainers.map((container) => (
            <Card key={container.id}>
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography variant="h6">{container.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Object.keys(container.drawers).length} drawers •{" "}
                      {getTotalItemsInContainer(container)} items
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      size="small"
                      onClick={() => toggleContainerExpansion(container.id)}
                    >
                      {expandedContainers.has(container.id) ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEditContainer(container.id)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={Object.keys(container.drawers).length > 0}
                      onClick={() => onDeleteContainer(container.id)}
                      title={
                        Object.keys(container.drawers).length > 0
                          ? "Cannot delete container with drawers"
                          : "Delete container"
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Stack>

                {expandedContainers.has(container.id) && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="subtitle2">Drawers</Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setShowAddDrawerDialog(container.id)}
                      >
                        Add Drawer
                      </Button>
                    </Stack>

                    {Object.keys(container.drawers).length === 0 ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        align="center"
                        sx={{ py: 2 }}
                      >
                        No drawers in this container yet.
                      </Typography>
                    ) : (
                      <List dense>
                        {Object.values(container.drawers).map((drawer) => (
                          <ListItem key={drawer.id} sx={{ px: 0 }}>
                            <ListItemText
                              primary={drawer.name}
                              secondary={`${drawer.items.length} items`}
                            />
                            <ListItemSecondaryAction>
                              <Stack direction="row" spacing={0.5}>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleEditDrawer(container.id, drawer.id)
                                  }
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={drawer.items.length > 0}
                                  onClick={() =>
                                    onDeleteDrawer(container.id, drawer.id)
                                  }
                                  title={
                                    drawer.items.length > 0
                                      ? "Cannot delete drawer with items"
                                      : "Delete drawer"
                                  }
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Stack>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Add Container Dialog */}
      <Dialog
        open={showAddContainerDialog}
        onClose={() => setShowAddContainerDialog(false)}
      >
        <DialogTitle>Add New Container</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Container Title"
            value={newContainerTitle}
            onChange={(e) => setNewContainerTitle(e.target.value)}
            placeholder="e.g., Frys, Skafferi, Garage"
            sx={{ pt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddContainerDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddContainer} variant="contained">
            Add Container
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Container Dialog */}
      <Dialog
        open={!!editingContainer}
        onClose={() => setEditingContainer(null)}
      >
        <DialogTitle>Edit Container</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Container Title"
            value={editContainerTitle}
            onChange={(e) => setEditContainerTitle(e.target.value)}
            placeholder="e.g., Frys, Skafferi, Garage"
            sx={{ pt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingContainer(null)}>Cancel</Button>
          <Button onClick={handleSaveContainerEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Drawer Dialog */}
      <Dialog open={!!editingDrawer} onClose={() => setEditingDrawer(null)}>
        <DialogTitle>Edit Drawer</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Drawer Name"
            value={editDrawerName}
            onChange={(e) => setEditDrawerName(e.target.value)}
            placeholder="e.g., Låda 1, Freezer Top, Pantry Shelf"
            sx={{ pt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingDrawer(null)}>Cancel</Button>
          <Button onClick={handleSaveDrawerEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Drawer Dialog */}
      <Dialog
        open={!!showAddDrawerDialog}
        onClose={() => setShowAddDrawerDialog(null)}
      >
        <DialogTitle>Add New Drawer</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Drawer Name"
            value={newDrawerName}
            onChange={(e) => setNewDrawerName(e.target.value)}
            placeholder="e.g., Låda 1, Freezer Top, Pantry Shelf"
            sx={{ pt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDrawerDialog(null)}>Cancel</Button>
          <Button
            onClick={() =>
              showAddDrawerDialog && handleAddDrawer(showAddDrawerDialog)
            }
            variant="contained"
          >
            Add Drawer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
