import * as Lucide from 'lucide-react';
const icons = ['Users', 'UserPlus', 'LogOut', 'MessageSquare', 'ThumbsUp', 'CheckCircle', 'UserCheck', 'Trash2', 'ShieldAlert', 'Sliders', 'ChevronRight', 'Zap', 'Target', 'Activity'];
for (const icon of icons) {
  if (!Lucide[icon]) console.log("MISSING:", icon);
}
console.log("Done");
