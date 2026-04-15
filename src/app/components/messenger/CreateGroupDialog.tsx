import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Check, Users } from "lucide-react";
import { User } from "../../types/messenger";

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  availableUsers: User[];
  onCreateGroup: (name: string, selectedUsers: User[]) => void;
}

export function CreateGroupDialog({
  open,
  onClose,
  availableUsers,
  onCreateGroup,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      const users = availableUsers.filter((u) => selectedUsers.includes(u.id));
      onCreateGroup(groupName.trim(), users);
      setGroupName("");
      setSelectedUsers([]);
      onClose();
    }
  };

  const handleClose = () => {
    setGroupName("");
    setSelectedUsers([]);
    onClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-white">
            <Users className="w-5 h-5" />
            Создать группу
          </DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Выберите участников и введите название для новой группы
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name" className="dark:text-white">
              Название группы
            </Label>
            <Input
              id="group-name"
              placeholder="Введите название группы..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Select Members */}
          <div className="space-y-2">
            <Label className="dark:text-white">
              Участники ({selectedUsers.length})
            </Label>
            <div className="max-h-[300px] overflow-y-auto border rounded-lg dark:border-gray-700">
              {availableUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => handleToggleUser(user.id)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                      isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    }`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-blue-500 text-white">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium dark:text-white">{user.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user.status === "online" ? "В сети" : "Не в сети"}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedUsers.length === 0}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Создать группу
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}