import { useState, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Camera } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface EditProfileDialogProps {
  employeeId: number;
  currentName: string;
  currentTitle: string;
  currentDepartment: string;
  currentImageUrl?: string;
}

export function EditProfileDialog({ 
  employeeId, 
  currentName, 
  currentTitle, 
  currentDepartment,
  currentImageUrl
}: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [title, setTitle] = useState(currentTitle);
  const [department, setDepartment] = useState(currentDepartment);
  const [imageUrl, setImageUrl] = useState(currentImageUrl);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setName(currentName);
      setTitle(currentTitle);
      setDepartment(currentDepartment);
      setImageUrl(currentImageUrl);
      setPreviewUrl(currentImageUrl);
      setSelectedFile(null);
    }
  }, [open, currentName, currentTitle, currentDepartment, currentImageUrl]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('title', title);
      formData.append('department', department);
      
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      console.log('Sending update request with form data:', {
        name,
        title,
        department,
        hasImage: !!selectedFile,
        imageFileName: selectedFile?.name
      });

      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to update profile");
      }

      const data = await response.json();
      console.log('Profile update response:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile", employeeId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      
      // Update local state with the new image URL
      if (data.data.imageUrl) {
        setImageUrl(data.data.imageUrl);
        setPreviewUrl(data.data.imageUrl);
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setOpen(false);
    },
    onError: (error) => {
      console.error('Profile update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage 
                  src={previewUrl} 
                  alt={name}
                  onError={(e) => {
                    console.error('Failed to load image:', previewUrl);
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=96`;
                  }}
                />
                <AvatarFallback>{name[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="outline"
                className="absolute bottom-0 right-0 rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your job title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Enter your department"
            />
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
