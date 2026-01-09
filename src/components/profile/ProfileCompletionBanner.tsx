import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProfileCompletionBannerProps {
  completeness: number;
  profileUrl: string;
  className?: string;
}

export const ProfileCompletionBanner = ({
  completeness,
  profileUrl,
  className,
}: ProfileCompletionBannerProps) => {
  if (completeness >= 100) {
    return null; // Don't show if profile is complete
  }

  return (
    <div
      className={cn(
        "p-4 rounded-xl border flex items-start gap-4",
        completeness < 50
          ? "bg-destructive/5 border-destructive/20"
          : "bg-warning/5 border-warning/20",
        className
      )}
    >
      {completeness < 50 ? (
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-foreground">
            Complete Your Profile ({completeness}%)
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={profileUrl}>Complete Now</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {completeness < 50
            ? "Your profile is incomplete. Please complete your profile to access all features."
            : "You're almost done! Complete your profile to unlock all features."}
        </p>
        <Progress value={completeness} className="h-2" />
      </div>
    </div>
  );
};
