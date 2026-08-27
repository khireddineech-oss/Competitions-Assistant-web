const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/تنظيم القنوات، وإدارة الأنشطة/g, 'تنظيم الحسابات، وإدارة المهام');
app = app.replace(/const siteName = settings\.siteName \|\| 'أوتوميت برو';/g, "const siteName = settings.siteName || 'KHIRO INFO';");
app = app.replace(/<PlayCircle className="w-12 h-12 text-indigo-500 mx-auto mb-4" \/>/g, '<TrendingUp className="w-12 h-12 text-indigo-500 mx-auto mb-4" />');
// Wait, is there a PlayCircle icon used as the main logo in App.tsx? Let's check imports.
fs.writeFileSync('src/App.tsx', app);

let accountsList = fs.readFileSync('src/components/AccountsList.tsx', 'utf8');
accountsList = accountsList.replace(/لا توجد قنوات متصلة/g, 'لا توجد حسابات متصلة');
accountsList = accountsList.replace(/قنواتك/g, 'حساباتك');
accountsList = accountsList.replace(/ربط حساب جديدة/g, 'إضافة حسابات');
fs.writeFileSync('src/components/AccountsList.tsx', accountsList);

let actionsPanel = fs.readFileSync('src/components/ActionsPanel.tsx', 'utf8');
actionsPanel = actionsPanel.replace(/معرف الهدف \(ID\)/g, 'رابط المنشور أو معرف الهدف (Link or ID)');
actionsPanel = actionsPanel.replace(/مثال: 1234567890/g, 'مثال: 1459976664884 أو رابط منشور كامل');
actionsPanel = actionsPanel.replace(/الردود المجدولة/g, 'تعليقات مجدولة');
actionsPanel = actionsPanel.replace(/رد في كل سطر/g, 'تعليق في كل سطر');
fs.writeFileSync('src/components/ActionsPanel.tsx', actionsPanel);
console.log('Done');
