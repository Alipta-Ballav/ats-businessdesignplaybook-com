import { Link } from "@tanstack/react-router";
import { Bookmark, TrendingUp, FileStack, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
export function CareerNav() {
  return (
    <nav aria-label="Design career workspace" className="flex flex-wrap gap-2 border-b pb-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/swipe-file">
          <Bookmark />
          Bullet library
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link to="/promotion">
          <TrendingUp />
          Promotion audit
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link to="/teardowns">
          <CalendarDays />
          Weekly teardowns
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link to="/my-resumes">
          <FileStack />
          My resumes
        </Link>
      </Button>
    </nav>
  );
}
