import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Stack,
  Chip,
  Avatar,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Group as GroupIcon,
  Add as AddIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  ExitToApp as ExitToAppIcon,
} from "@mui/icons-material";
import { googleDriveService } from "../services/googleDriveService";
import type { Family, FamilyMember } from "../types";

interface FamilyManagerProps {
  currentFamily: Family | null;
  onFamilyChange: (family: Family | null) => void;
  onSignOut: () => void;
}

export const FamilyManager: React.FC<FamilyManagerProps> = ({
  currentFamily,
  onFamilyChange,
  onSignOut,
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentUser = googleDriveService.getCurrentUser();

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      setError("Ange ett familjenamn");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if user is signed in, if not, sign them in first
      let user = googleDriveService.getCurrentUser();
      if (!user) {
        console.log("No user logged in, attempting to sign in...");
        user = await googleDriveService.signIn();
        if (!user) {
          setError("Du måste logga in med Google för att skapa en familj");
          setIsLoading(false);
          return;
        }
      }

      const result = await googleDriveService.createFamily(familyName.trim());
      if (result.success && result.family) {
        onFamilyChange(result.family);
        setSuccess(`Familj "${result.family.name}" skapad!`);
        setIsCreateDialogOpen(false);
        setFamilyName("");
      } else {
        console.error(
          "Family creation failed:",
          result.errorCode,
          result.error
        );
        setError(result.error || "Kunde inte skapa familj");
      }
    } catch (err) {
      console.error("Family creation error:", err);
      setError("Ett fel uppstod när familjen skulle skapas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      setError("Ange en inbjudningskod");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if user is signed in, if not, sign them in first
      let user = googleDriveService.getCurrentUser();
      if (!user) {
        console.log("No user logged in, attempting to sign in...");
        user = await googleDriveService.signIn();
        if (!user) {
          setError(
            "Du måste logga in med Google för att ansluta till en familj"
          );
          setIsLoading(false);
          return;
        }
      }

      const family = await googleDriveService.joinFamily(inviteCode.trim());
      if (family) {
        onFamilyChange(family);
        setSuccess(`Du har anslutit till familj "${family.name}"!`);
        setIsJoinDialogOpen(false);
        setInviteCode("");
      } else {
        setError("Kunde inte ansluta till familj");
      }
    } catch (err) {
      setError("Ogiltig inbjudningskod eller familj hittades inte");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveFamily = () => {
    if (confirm("Är du säker på att du vill lämna familjen?")) {
      onFamilyChange(null);
      setSuccess("Du har lämnat familjen");
    }
  };

  const copyInviteLink = () => {
    if (currentFamily) {
      const inviteLink = googleDriveService.generateInviteLink(
        currentFamily.id
      );
      navigator.clipboard.writeText(inviteLink);
      setSuccess("Inbjudningslänk kopierad till urklipp!");
    }
  };

  const getCurrentUserRole = (): FamilyMember | undefined => {
    if (!currentFamily || !currentUser) return undefined;
    return currentFamily.members.find((m) => m.email === currentUser.email);
  };

  const currentUserRole = getCurrentUserRole();

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Familj
      </Typography>

      {currentFamily ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  {currentFamily.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Skapad{" "}
                  {new Date(currentFamily.createdAt).toLocaleDateString(
                    "sv-SE"
                  )}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Medlemmar ({currentFamily.members.length})
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {currentFamily.members.map((member) => (
                    <Chip
                      key={member.email}
                      avatar={
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      }
                      label={member.name}
                      color={member.isHost ? "primary" : "default"}
                      variant={member.isHost ? "filled" : "outlined"}
                      size="small"
                    />
                  ))}
                </Stack>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  onClick={copyInviteLink}
                  size="small"
                >
                  Kopiera inbjudningslänk
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<ExitToAppIcon />}
                  onClick={handleLeaveFamily}
                  size="small"
                >
                  Lämna familj
                </Button>
              </Stack>

              {currentUserRole?.isHost && (
                <Alert severity="info">
                  Du är värd för denna familj. Du kan hantera medlemmar och
                  inställningar.
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Stack spacing={2} alignItems="center" textAlign="center">
              <GroupIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="h6">Ingen familj ansluten</Typography>
              <Typography variant="body2" color="text.secondary">
                Skapa en ny familj eller anslut till en befintlig för att
                synkronisera data.
              </Typography>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Skapa familj
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  onClick={() => setIsJoinDialogOpen(true)}
                >
                  Anslut till familj
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Create Family Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      >
        <DialogTitle>Skapa ny familj</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Familjenamn"
            fullWidth
            variant="outlined"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleCreateFamily()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)}>Avbryt</Button>
          <Button
            onClick={handleCreateFamily}
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : null}
          >
            Skapa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Join Family Dialog */}
      <Dialog
        open={isJoinDialogOpen}
        onClose={() => setIsJoinDialogOpen(false)}
      >
        <DialogTitle>Anslut till familj</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Inbjudningskod"
            fullWidth
            variant="outlined"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleJoinFamily()}
            placeholder="Ange inbjudningskod från familjens värd"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsJoinDialogOpen(false)}>Avbryt</Button>
          <Button
            onClick={handleJoinFamily}
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : null}
          >
            Anslut
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mt: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}
    </Box>
  );
};
