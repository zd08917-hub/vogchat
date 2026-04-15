import { useState, useRef, ChangeEvent, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Camera, Loader2, AlertCircle } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { VisuallyHidden } from "../ui/visually-hidden";
import { updateUserAvatar } from "../../api/messengerApi";
import { toast } from "sonner";
import { validateForm, profileRules, getFieldError } from "../../utils/validation";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const { user, updateUser } = useUser();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        toast.error('Пожалуйста, выберите изображение');
        return;
      }
      
      // Проверяем размер файла (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Размер файла не должен превышать 5MB');
        return;
      }
      
      setAvatarFile(file);
      
      // Создаем превью
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Валидация формы профиля
  const validateProfileForm = () => {
    const formData = { name, username, bio };
    const result = validateForm(formData, profileRules);
    setValidationErrors(result.errors);
    return result.isValid;
  };

  // Обработчик изменения поля с валидацией в реальном времени
  const handleFieldChange = (field: string, value: string) => {
    // Обновляем состояние поля
    if (field === 'name') setName(value);
    if (field === 'username') setUsername(value);
    if (field === 'bio') setBio(value);

    // Помечаем поле как "тронутое"
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    // Создаем обновленные данные формы для валидации
    const updatedFormData = {
      name: field === 'name' ? value : name,
      username: field === 'username' ? value : username,
      bio: field === 'bio' ? value : bio,
    };

    // Валидируем поле в реальном времени
    const error = getFieldError(field, value, profileRules);
    
    setValidationErrors(prev => {
      if (error) {
        return { ...prev, [field]: error };
      } else {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
    });
  };

  const handleSave = async () => {
    // Валидация формы
    if (!validateProfileForm()) {
      // Помечаем все поля как "тронутые" для отображения ошибок
      setTouchedFields({ name: true, username: true, bio: true });
      return;
    }

    try {
      setIsUploading(true);
      
      // Если выбран новый аватар, загружаем его
      let newAvatarUrl = user?.avatar;
      if (avatarFile && user?.id) {
        try {
          const result = await updateUserAvatar(user.id, avatarFile);
          newAvatarUrl = result.avatarUrl;
          toast.success('Аватар успешно обновлен');
        } catch (error) {
          console.error('Error uploading avatar:', error);
          toast.error('Ошибка при загрузке аватара');
        }
      }
      
      // Обновляем данные пользователя
      updateUser({
        name,
        username,
        bio,
        avatar: newAvatarUrl,
      });
      
      toast.success('Профиль успешно обновлен');
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Ошибка при сохранении профиля');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name || "");
    setUsername(user?.username || "");
    setBio(user?.bio || "");
    setAvatarFile(null);
    setAvatarPreview(null);
    onClose();
  };

  // Сбрасываем состояние при открытии диалога
  useEffect(() => {
    if (open) {
      setName(user?.name || "");
      setUsername(user?.username || "");
      setBio(user?.bio || "");
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Редактировать профиль</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>
              Измените свою информацию профиля, включая имя, имя пользователя и биографию
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="w-24 h-24 cursor-pointer" onClick={handleAvatarClick}>
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt="Preview" />
                ) : user?.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} />
                ) : null}
                <AvatarFallback className="bg-blue-500 text-white text-2xl">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <button
                className="absolute bottom-0 right-0 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                onClick={handleAvatarClick}
                type="button"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Нажмите, чтобы изменить фото</p>
            {avatarFile && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Выбран новый аватар: {avatarFile.name}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="dark:text-white">Имя</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              onBlur={() => setTouchedFields(prev => ({ ...prev, name: true }))}
              placeholder="Введите ваше имя"
              className={`dark:bg-gray-800 dark:text-white dark:border-gray-700 ${
                validationErrors.name && touchedFields.name ? 'border-red-500 dark:border-red-500' : ''
              }`}
            />
            {validationErrors.name && touchedFields.name && (
              <div className="flex items-center gap-1 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{validationErrors.name}</span>
              </div>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="dark:text-white">Имя пользователя</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">@</span>
              <Input
                id="username"
                value={username}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                onBlur={() => setTouchedFields(prev => ({ ...prev, username: true }))}
                placeholder="username"
                className={`pl-7 dark:bg-gray-800 dark:text-white dark:border-gray-700 ${
                  validationErrors.username && touchedFields.username ? 'border-red-500 dark:border-red-500' : ''
                }`}
              />
            </div>
            {validationErrors.username && touchedFields.username && (
              <div className="flex items-center gap-1 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{validationErrors.username}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Вы можете выбрать имя пользователя в Telegram. Если вы это сделаете, другие люди смогут найти вас по этому имени и связаться с вами, не зная вашего номера телефона.
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="dark:text-white">О себе</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => handleFieldChange('bio', e.target.value)}
              onBlur={() => setTouchedFields(prev => ({ ...prev, bio: true }))}
              placeholder="Расскажите о себе..."
              rows={3}
              maxLength={70}
              className={`dark:bg-gray-800 dark:text-white dark:border-gray-700 ${
                validationErrors.bio && touchedFields.bio ? 'border-red-500 dark:border-red-500' : ''
              }`}
            />
            {validationErrors.bio && touchedFields.bio && (
              <div className="flex items-center gap-1 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{validationErrors.bio}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-right">{bio.length}/70</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
              disabled={isUploading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}