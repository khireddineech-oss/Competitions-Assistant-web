const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the return block of the authenticated dashboard to wrap EVERYTHING in ErrorBoundary
const returnBlockStart = `  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-200" dir="rtl">`;
    
const replacementStart = `  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-950 font-sans text-gray-200" dir="rtl">`;
      
code = code.replace(returnBlockStart, replacementStart);

// At the end of the file, close the ErrorBoundary
const returnBlockEnd = `  );
}`;

const replacementEnd = `      </div>
    </ErrorBoundary>
  );
}`;

code = code.replace(returnBlockEnd, replacementEnd);

// Also rewrite the tabs.map just in case
const tabsMapStart = `<tab.icon className="w-7 h-7 text-yellow-500" />`;
const tabsMapReplacement = `{(() => { const Icon = tab.icon; return <Icon className="w-7 h-7 text-yellow-500" />; })()}`;
code = code.replace(tabsMapStart, tabsMapReplacement);

// Make formatDate safe
const dateCode = `{new Date(user.expires_at).toLocaleDateString('ar-EG')}`;
const safeDateCode = `{(() => { try { return new Date(user.expires_at).toLocaleDateString('ar-EG'); } catch(e) { return 'تاريخ غير صالح'; } })()}`;
code = code.replace(dateCode, safeDateCode);

// Write back
fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
